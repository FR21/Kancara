"use client";

import { Ticket } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { type Itinerary, captain, captainIsSample } from "@/lib/api/captain";
import { settleLaundry } from "@/lib/api/laundry";
import { trips } from "@/lib/api/trips";
import { chosenOption, countSettled, findConflicts } from "@/lib/mediation";
import { countViolations } from "@/lib/trips/trip";
import PageBackdrop from "@/components/layout/PageBackdrop";
import TripsNotice from "@/components/trips/TripsNotice";
import {
  type PlanDraft,
  createMember,
  EMPTY_DRAFT,
  fillTemplate,
  isDraftEmpty,
  planDraftReducer,
} from "@/lib/plan-draft";
import { clearDraft, saveDraft, useSavedDraft } from "@/lib/plan-draft-store";
import {
  type QuestionKey,
  isAnswered,
  isOptional,
  missingRequired,
  nextRequired,
  QUESTIONS,
} from "@/lib/plan-questions";
import { useLocale } from "@/lib/use-locale";
import { useMediaQuery } from "@/lib/use-media-query";
import { useMessages } from "@/lib/use-messages";
import type { Stage } from "./flow";
import MediationDeck from "./MediationDeck";
import PassDialog from "./PassDialog";
import PlanResult, { type SaveState } from "./PlanResult";
import QuestionDeck from "./QuestionDeck";
import ResumeBanner from "./ResumeBanner";
import StageRail, { type RailStep } from "./StageRail";
import StartScreen from "./StartScreen";
import TicketReview from "./TicketReview";

type Pending = "itinerary" | "invite";
type FailedRequest = { kind: "itinerary" } | { kind: "invite" };

const DESKTOP_QUERY = "(min-width: 1024px)";
const NOTICE_MS = 5000;

export default function PlanWorkspace() {
  const text = useMessages("plan");
  const packingText = useMessages("packing");
  const locale = useLocale();
  const savedDraft = useSavedDraft();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [draft, dispatch] = useReducer(planDraftReducer, EMPTY_DRAFT);
  const [stage, setStage] = useState<Stage>("story");
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState<QuestionKey>(QUESTIONS[0]);
  const [fromPass, setFromPass] = useState(false);
  const [clashIndex, setClashIndex] = useState(0);
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
  const conflicts = findConflicts(draft);
  const clashesSettled = countSettled(conflicts, draft.agreements) === conflicts.length;
  // Editing one answer from the boarding pass shows that question alone; otherwise the deck runs through all of them.
  const deckQuestions: QuestionKey[] = fromPass ? [question] : [...QUESTIONS];

  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (isDraftEmpty(draft) || saveState === "saved") return;
    saveDraft(draft);
  }, [draft, saveState]);

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
      clearDraft();
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
      const built = await captain.itinerary({ draft, locale }, signal);
      // A trip planned again keeps the laundry stops its packing list asked for.
      const plan = await settleLaundry(draft, built, packingText.laundry.stops, locale, signal).catch(() => built);
      setItinerary(plan);
      saveTrip(plan);
    } catch {
      if (signal.aborted) return;
      setFailed({ kind: "itinerary" });
    }
    if (!signal.aborted) setPending(null);
  };

  // Opens at the first clash still waiting for a pick, or at the start when the group is only looking again.
  const openClashes = () => {
    const firstOpen = conflicts.findIndex((conflict) => chosenOption(conflict, draft.agreements) === null);
    setClashIndex(Math.max(0, firstOpen));
    openStage("meet");
  };

  // A stop switched to a backup is part of the plan from then on, so the saved trip follows.
  const changeItinerary = (plan: Itinerary) => {
    setItinerary(plan);
    saveTrip(plan);
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

  const openQuestion = (target: QuestionKey, memberId: string | null = null) => {
    setQuestion(target);
    setSelectedMemberId(memberId);
    setPreviewing(false);
    setStage("details");
    setStarted(true);
  };

  // Starts at the first required question that is still open, or at the top when nothing is.
  const startManual = (source: PlanDraft) => {
    setFromPass(false);
    openQuestion(nextRequired(source) ?? QUESTIONS[0]);
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
    openQuestion(target, memberId);
  };

  const addMemberFromPass = () => {
    const member = createMember();
    dispatch({ type: "addMember", member });
    editFromPass("crew", member.id);
  };

  const changeQuestion = (index: number) => {
    setSelectedMemberId(null);
    setQuestion(deckQuestions[index]);
  };

  const finishDetails = () => {
    const missing = missingRequired(draft);
    if (missing.length > 0) {
      setFromPass(false);
      openQuestion(missing[0]);
      return;
    }
    setFromPass(false);
    setStage("pass");
  };

  const openStage = (target: Stage) => {
    setPreviewing(false);
    setFromPass(false);
    setStage(target);
  };

  // A question opens once every required question before it has an answer.
  const canOpen = (target: QuestionKey) =>
    QUESTIONS.slice(0, QUESTIONS.indexOf(target)).every((earlier) => isOptional(earlier) || isAnswered(earlier, draft));

  const steps: RailStep[] = [
    ...QUESTIONS.map((key) => ({
      key,
      label: text.stages.questions[key],
      done: isAnswered(key, draft),
      current: stage === "details" && question === key,
      onSelect: canOpen(key)
        ? () => {
            setFromPass(false);
            openQuestion(key);
          }
        : null,
    })),
    {
      key: "pass",
      label: text.stages.pass,
      done: planStarted,
      current: stage === "pass",
      onSelect: requiredDone ? () => openStage("pass") : null,
    },
    // The step is on the rail only for a group whose wishes clash, so the count stays the number of steps ahead.
    ...(conflicts.length > 0
      ? [
          {
            key: "meet",
            label: text.stages.meet,
            done: requiredDone && clashesSettled,
            current: stage === "meet",
            onSelect: requiredDone ? openClashes : null,
          },
        ]
      : []),
    {
      key: "plan",
      label: text.stages.plan,
      done: false,
      current: stage === "plan",
      onSelect: planStarted ? () => openStage("plan") : null,
    },
  ];

  return (
    <main className="relative isolate mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-4 pt-24 pb-12 sm:px-6 sm:pt-28 lg:max-w-5xl xl:px-0">
      <PageBackdrop />
      {started && <StageRail steps={steps} text={text.stages} />}

      {stage === "story" && (
        <div className="flex flex-1 flex-col justify-center pb-12">
          <StartScreen
            text={text}
            onStartManual={() => startManual(draft)}
          />
          {showResume && (
            <div className="mt-6 flex justify-center px-4 motion-safe:animate-message-in motion-safe:[animation-delay:150ms]">
              <ResumeBanner
                savedDraft={savedDraft}
                text={text.chat}
                onResume={resumeDraft}
                onClear={clearDraft}
              />
            </div>
          )}
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

          <QuestionDeck
            draft={draft}
            dispatch={dispatch}
            text={text}
            questions={deckQuestions}
            index={deckQuestions.indexOf(question)}
            returnLabel={fromPass ? text.deck.backToPass : null}
            isDesktop={isDesktop}
            selectedMemberId={selectedMemberId}
            onIndexChange={changeQuestion}
            onBackToStory={() => setStage("story")}
            onFinish={finishDetails}
            onSelectMember={setSelectedMemberId}
          />
        </div>
      )}

      <PassDialog open={previewing} draft={draft} text={text} onClose={() => setPreviewing(false)} />

      {stage === "pass" && (
        <TicketReview
          draft={draft}
          text={text}
          hasPlan={itinerary !== null}
          busy={pending !== null}
          hasClashes={conflicts.length > 0}
          onEdit={editFromPass}
          onAddMember={addMemberFromPass}
          onMakePlan={conflicts.length > 0 ? openClashes : makePlan}
          onViewPlan={() => setStage("plan")}
        />
      )}

      {stage === "meet" && conflicts.length > 0 && (
        <MediationDeck
          draft={draft}
          conflicts={conflicts}
          index={Math.min(clashIndex, conflicts.length - 1)}
          text={text}
          hasPlan={itinerary !== null}
          busy={pending !== null}
          onIndexChange={setClashIndex}
          onPick={(conflict, option) => dispatch({ type: "setAgreement", conflict, option })}
          onBack={() => setStage("pass")}
          onFinish={makePlan}
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
          packingHref={tripId && saveState === "saved" ? `/trips/${encodeURIComponent(tripId)}/packing` : null}
          onRetry={retry}
          onInvite={makeInvite}
          onSave={() => itinerary && saveTrip(itinerary)}
          onChangeItinerary={changeItinerary}
          onChangeAgreements={openClashes}
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
