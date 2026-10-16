"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { type Itinerary, captain, captainIsSample } from "@/lib/client/captain";
import { settleLaundry } from "@/lib/client/laundry";
import { fetchPack, sendAction } from "@/lib/client/safety";
import { trips } from "@/lib/client/trips";
import { chosenOption, countSettled, findConflicts } from "@/lib/mediation";
import { countViolations } from "@/lib/trips/trip";
import PageBackdrop from "@/components/layout/PageBackdrop";
import PageShell from "@/components/layout/PageShell";
import Notice from "@/components/layout/Notice";
import {
  type PlanDraft,
  createMember,
  EMPTY_DRAFT,
  fillTemplate,
  isDraftEmpty,
  planDraftReducer,
} from "@/lib/plan-draft";
import { clearDraft, forgetDraftTrip, keepDraftTrip, readDraftTrip, saveDraft, useSavedDraft } from "@/lib/use-plan-draft";
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
import type { Stage } from "@/components/plan/plan-stages";
import InviteCard, { type InviteState } from "./InviteCard";
import MediationDeck from "./MediationDeck";
import PassDialog from "./PassDialog";
import PlanResult, { type SaveState } from "./PlanResult";
import QuestionDeck from "./QuestionDeck";
import ResumeBanner from "./ResumeBanner";
import Stepper, { type StepperStep } from "@/components/ui/Stepper";
import StartScreen from "./StartScreen";
import TicketReview from "./TicketReview";

const DESKTOP_QUERY = "(min-width: 1024px)";
// How long the plan rests before the draft trip behind the group's link is brought up to date with it.
const SYNC_MS = 1500;
// How often the trip is asked who has joined through the group's link.
const PULL_MS = 5000;

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
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteState, setInviteState] = useState<InviteState>("idle");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [tripId, setTripId] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  // The members who joined by themselves that this plan has taken in. A save names them, so that leaving one out
  // means the leader removed them, and one the plan never saw is kept (see the trip store).
  const knownJoinedRef = useRef(new Set<string>());
  const arrivedRef = useRef(false);

  const showResume = !started && savedDraft !== null && isDraftEmpty(draft);
  const requiredDone = missingRequired(draft).length === 0;
  const planStarted = itinerary !== null || pending || failed;
  const tripName = fillTemplate(text.result.tripName, { destination: draft.destinations.join(", ") });
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

  // While the group's link is out and the plan has no itinerary yet, the draft trip behind the link follows the
  // plan, so whoever opens the link finds the members as they are now.
  useEffect(() => {
    if (inviteToken === null || tripId === null || itinerary !== null || pending || saveState !== "idle") return;
    const timer = setTimeout(() => {
      // A sync that fails is made up for by the next one; the plan on this device is not lost.
      trips.save({ name: tripName, draft, knownMembers: [...knownJoinedRef.current] }, tripId).catch(() => undefined);
    }, SYNC_MS);
    return () => clearTimeout(timer);
  }, [draft, inviteToken, itinerary, pending, saveState, tripId, tripName]);

  // Whoever joins by themselves through the group's link is on the trip, not in this plan yet. They are taken in
  // as they arrive, so the leader sees them here and the plan is made for them too.
  useEffect(() => {
    if (inviteToken === null || tripId === null || pending || (stage !== "details" && stage !== "pass")) return;
    const pull = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const pack = await fetchPack({ kind: "trip", tripId });
        pack.members
          .filter((member) => member.joined && !knownJoinedRef.current.has(member.key))
          .forEach((member) => {
            knownJoinedRef.current.add(member.key);
            dispatch({ type: "mergeMember", member: { ...createMember(member.ageGroup), id: member.key, name: member.name } });
          });
      } catch {
        // The next round asks again.
      }
    };
    const timer = setInterval(pull, PULL_MS);
    return () => clearInterval(timer);
  }, [inviteToken, pending, stage, tripId]);

  const beginRequest = () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setPending(true);
    setFailed(false);
    return controller.signal;
  };

  // A finished plan goes to My Trips on its own. Generating it again updates the same trip.
  const saveTrip = async (plan: Itinerary) => {
    setSaveState("saving");
    try {
      const saved = await trips.save(
        {
          name: tripName,
          draft,
          // Sample itineraries are never checked against the group's needs, so no count is sent for them.
          violations: captainIsSample ? undefined : countViolations(plan),
          itinerary: plan,
          knownMembers: [...knownJoinedRef.current],
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
    setSaveState("idle");
    const signal = beginRequest();
    try {
      const built = await captain.itinerary({ draft, locale }, signal);
      // A trip planned again keeps the laundry stops its packing list asked for.
      const plan = await settleLaundry(draft, built, packingText.laundry.stops, locale, signal).catch(() => built);
      setItinerary(plan);
      saveTrip(plan);
    } catch {
      if (signal.aborted) return;
      setFailed(true);
    }
    if (!signal.aborted) setPending(false);
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

  // The group's link belongs to a trip. A plan that is not a saved trip yet is kept as a draft one first; it
  // becomes a planned trip when its itinerary is made.
  const makeInvite = async () => {
    setInviteState("preparing");
    try {
      const planSaved = tripId !== null && saveState === "saved";
      const id = planSaved ? tripId : (await trips.save({ name: tripName, draft, knownMembers: [...knownJoinedRef.current] }, tripId)).id;
      setTripId(id);
      if (!planSaved) keepDraftTrip(id);
      setInviteToken((await fetchPack({ kind: "trip", tripId: id })).inviteToken);
      setInviteState("idle");
    } catch {
      setInviteState("failed");
    }
  };

  const renewInvite = async () => {
    if (tripId === null) return;
    setInviteState("preparing");
    try {
      setInviteToken((await sendAction({ kind: "trip", tripId }, { type: "renewInvite" })).inviteToken);
      setInviteState("idle");
    } catch {
      setInviteState("failed");
    }
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
    setTripId(readDraftTrip());
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

  const steps: StepperStep[] = [
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
    <PageShell width="workspace" className="min-h-dvh gap-8">
      <PageBackdrop />
      {started && <Stepper steps={steps} text={text.stages} />}

      {stage === "story" && (
        <div className="flex flex-1 flex-col justify-center pb-12">
          <StartScreen
            text={text}
            onStartManual={() => {
              forgetDraftTrip();
              startManual(draft);
            }}
            resume={
              showResume && (
                <ResumeBanner savedDraft={savedDraft} text={text.chat} onResume={resumeDraft} onClear={clearDraft} />
              )
            }
          />
        </div>
      )}

      {stage === "details" && (
        <QuestionDeck
          draft={draft}
          dispatch={dispatch}
          text={text}
          questions={deckQuestions}
          index={deckQuestions.indexOf(question)}
          returnLabel={fromPass ? text.deck.backToPass : null}
          isDesktop={isDesktop}
          selectedMemberId={selectedMemberId}
          crewFooter={
            <InviteCard
              link={inviteToken ? `${window.location.origin}/join/${inviteToken}` : null}
              state={inviteState}
              tripName={tripName}
              text={text.invite}
              onMake={makeInvite}
              onRenew={renewInvite}
            />
          }
          onIndexChange={changeQuestion}
          onBackToStory={() => setStage("story")}
          onFinish={finishDetails}
          onSelectMember={setSelectedMemberId}
          onPreviewPass={fromPass ? null : () => setPreviewing(true)}
        />
      )}

      <PassDialog
        open={previewing}
        draft={draft}
        text={text}
        onClose={() => setPreviewing(false)}
        onEdit={(targetQuestion, memberId) => {
          setPreviewing(false);
          editFromPass(targetQuestion, memberId);
        }}
        onAddMember={() => {
          setPreviewing(false);
          addMemberFromPass();
        }}
      />

      {stage === "pass" && (
        <TicketReview
          draft={draft}
          text={text}
          hasPlan={itinerary !== null}
          busy={pending}
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
          busy={pending}
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
          pending={pending}
          failed={failed}
          isSample={captainIsSample}
          saveState={saveState}
          packingHref={tripId && saveState === "saved" ? `/trips/${encodeURIComponent(tripId)}/packing` : null}
          onRetry={makePlan}
          onSave={() => itinerary && saveTrip(itinerary)}
          onChangeItinerary={changeItinerary}
          onChangeAgreements={openClashes}
          onBackToPass={() => setStage("pass")}
        />
      )}

      <Notice
        notice={noticeOpen ? { id: savedCount, tone: "success", message: text.result.savedNotice } : null}
        duration={4000}
        dismissLabel={text.result.dismiss}
        onDismiss={() => setNoticeOpen(false)}
      />
    </PageShell>
  );
}
