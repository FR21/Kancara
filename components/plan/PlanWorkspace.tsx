"use client";

import { Ticket } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { type Itinerary, captain, captainIsSample } from "@/lib/api/captain";
import { trips } from "@/lib/api/trips";
import { countViolations } from "@/lib/trips/trip";
import TripsNotice from "@/components/trips/TripsNotice";
import {
  type PlanDraft,
  createMember,
  EMPTY_DRAFT,
  fillTemplate,
  isDraftEmpty,
  parseDraftPatch,
  parseLocalDate,
  planDraftReducer,
} from "@/lib/plan-draft";
import { saveDraft, useSavedDraft } from "@/lib/plan-draft-store";
import { type QuestionKey, isAnswered, missingRequired, nextRequired, openQuestions } from "@/lib/plan-questions";
import { useLocale } from "@/lib/use-locale";
import { useMediaQuery } from "@/lib/use-media-query";
import { useMessages } from "@/lib/use-messages";
import type { Stage } from "./flow";
import PassDialog from "./PassDialog";
import PlanResult, { type SaveState } from "./PlanResult";
import QuestionDeck from "./QuestionDeck";
import ResumeBanner from "./ResumeBanner";
import StageRail from "./StageRail";
import StartScreen from "./StartScreen";
import TicketReview from "./TicketReview";

type Pending = "itinerary" | "invite";
type FailedRequest = { kind: "itinerary" } | { kind: "invite" };

const DESKTOP_QUERY = "(min-width: 1024px)";
const NOTICE_MS = 5000;

export default function PlanWorkspace() {
  const text = useMessages("plan");
  const locale = useLocale();
  const savedDraft = useSavedDraft();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [draft, dispatch] = useReducer(planDraftReducer, EMPTY_DRAFT);
  const [stage, setStage] = useState<Stage>("story");
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<QuestionKey[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [fromPass, setFromPass] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [failed, setFailed] = useState<FailedRequest | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [tripId, setTripId] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const arrivedRef = useRef(false);

  const showResume = !started && savedDraft !== null && isDraftEmpty(draft);
  const requiredDone = missingRequired(draft).length === 0;
  const planStarted = itinerary !== null || pending === "itinerary" || failed?.kind === "itinerary";
  const question = questions[questionIndex];

  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (isDraftEmpty(draft)) return;
    saveDraft(draft);
  }, [draft]);

  useEffect(() => {
    if (!arrivedRef.current) {
      arrivedRef.current = true;
      return;
    }
    window.scrollTo({ top: 0 });
    document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
  }, [stage]);

  useEffect(() => {
    if (!noticeOpen) return;
    const timer = setTimeout(() => setNoticeOpen(false), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [noticeOpen, savedCount]);

  const beginRequest = (kind: Pending) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setPending(kind);
    setFailed(null);
    return controller.signal;
  };

  // A finished plan goes to My Trips on its own. Generating it again updates the same trip.
  const saveTrip = async (plan: Itinerary) => {
    setSaveState("saving");
    try {
      const saved = await trips.save(
        {
          name: fillTemplate(text.result.tripName, { destination: draft.destinations.join(", ") }),
          draft,
          // Sample itineraries are never checked against the group's needs, so no count is sent for them.
          violations: captainIsSample ? undefined : countViolations(plan),
          itinerary: plan,
        },
        tripId,
      );
      setTripId(saved.id);
      setSaveState("saved");
      setSavedCount((count) => count + 1);
      setNoticeOpen(true);
    } catch {
      setSaveState("failed");
    }
  };

  const makePlan = async () => {
    setStage("plan");
    setItinerary(null);
    setInviteUrl(null);
    setSaveState("idle");
    const signal = beginRequest("itinerary");
    try {
      const plan = await captain.itinerary({ draft, locale }, signal);
      setItinerary(plan);
      saveTrip(plan);
    } catch {
      if (signal.aborted) return;
      setFailed({ kind: "itinerary" });
    }
    if (!signal.aborted) setPending(null);
  };

  const makeInvite = async () => {
    const signal = beginRequest("invite");
    try {
      const invite = await captain.invite({ draft, locale }, signal);
      setInviteUrl(invite.url);
    } catch {
      if (signal.aborted) return;
      setFailed({ kind: "invite" });
    }
    if (!signal.aborted) setPending(null);
  };

  const retry = () => {
    if (!failed) return;
    if (failed.kind === "itinerary") makePlan();
    if (failed.kind === "invite") makeInvite();
  };

  const openDeck = (list: QuestionKey[], startAt: QuestionKey | null = null, memberId: string | null = null) => {
    setQuestions(list);
    setQuestionIndex(startAt ? Math.max(list.indexOf(startAt), 0) : 0);
    setSelectedMemberId(memberId);
    setPreviewing(false);
    setStage("details");
    setStarted(true);
  };

  const startManual = (source: PlanDraft, startAt: QuestionKey | null = null) => {
    setFromPass(false);
    openDeck(openQuestions(source), startAt);
  };

  const resumeDraft = () => {
    if (!savedDraft) return;
    dispatch({ type: "replace", draft: savedDraft });
    setStarted(true);
    if (missingRequired(savedDraft).length === 0) {
      setStage("pass");
      return;
    }
    startManual(savedDraft);
  };

  const editFromPass = (target: QuestionKey, memberId: string | null = null) => {
    setFromPass(true);
    openDeck([target], null, memberId);
  };

  const addMemberFromPass = () => {
    const member = createMember();
    dispatch({ type: "addMember", member });
    editFromPass("crew", member.id);
  };

  const changeQuestion = (index: number) => {
    setSelectedMemberId(null);
    setQuestionIndex(index);
  };

  const finishDetails = () => {
    const missing = missingRequired(draft);
    if (missing.length > 0) {
      setFromPass(false);
      openDeck(missing);
      return;
    }
    setFromPass(false);
    setStage("pass");
  };

  const navigate = (target: Stage) => {
    setPreviewing(false);
    if (target === "details") {
      startManual(draft);
      return;
    }
    setFromPass(false);
    setStage(target);
  };

  const reachable: Record<Stage, boolean> = {
    story: true,
    details: started,
    pass: started && requiredDone,
    plan: planStarted,
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-4 pt-24 pb-12 sm:px-6 sm:pt-28 lg:max-w-5xl xl:px-0">
      {started && <StageRail stage={stage} text={text.stages} reachable={reachable} onNavigate={navigate} />}

      {showResume && <ResumeBanner savedDraft={savedDraft} text={text.chat} onResume={resumeDraft} />}

      {stage === "story" && (
        <div className="flex flex-1 flex-col justify-center pb-12">
          <StartScreen
            text={text}
            onStartManual={() => startManual(draft)}
          />
        </div>
      )}

      {stage === "details" && (
        <div className="space-y-8">
          {!fromPass && (
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                aria-label={text.deck.seePass}
                title={text.deck.seePass}
                onClick={() => setPreviewing(true)}
                className="inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-surface text-primary transition-[background-color,border-color,scale] duration-150 ease-out hover:border-primary hover:bg-primary-subtle active:scale-[0.97]"
              >
                <Ticket className="size-6" aria-hidden="true" />
              </button>
            </div>
          )}

          {question !== undefined && (
            <QuestionDeck
              draft={draft}
              dispatch={dispatch}
              text={text}
              questions={questions}
              index={questionIndex}
              returnLabel={fromPass ? text.deck.backToPass : null}
              isDesktop={isDesktop}
              selectedMemberId={selectedMemberId}
              onIndexChange={changeQuestion}
              onBackToStory={() => setStage("story")}
              onFinish={finishDetails}
              onSelectMember={setSelectedMemberId}
            />
          )}
        </div>
      )}

      <PassDialog open={previewing} draft={draft} text={text} onClose={() => setPreviewing(false)} />

      {stage === "pass" && (
        <TicketReview
          draft={draft}
          text={text}
          hasPlan={itinerary !== null}
          busy={pending !== null}
          onEdit={editFromPass}
          onAddMember={addMemberFromPass}
          onMakePlan={makePlan}
          onViewPlan={() => setStage("plan")}
        />
      )}

      {stage === "plan" && (
        <PlanResult
          draft={draft}
          text={text}
          itinerary={itinerary}
          inviteUrl={inviteUrl}
          pending={pending}
          failed={failed !== null}
          isSample={captainIsSample}
          saveState={saveState}
          onRetry={retry}
          onInvite={makeInvite}
          onSave={() => itinerary && saveTrip(itinerary)}
          onBackToPass={() => setStage("pass")}
        />
      )}

      <TripsNotice
        notice={noticeOpen ? { id: savedCount, tone: "success", message: text.result.savedNotice } : null}
        dismissLabel={text.result.dismiss}
        onDismiss={() => setNoticeOpen(false)}
      />
    </main>
  );
}
