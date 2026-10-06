"use client";

import { Ticket } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { type ChatTurn, type Itinerary, captain, captainIsSample } from "@/lib/api/captain";
import { isGoAhead } from "@/lib/go-ahead";
import {
  type PlanDraft,
  createMember,
  EMPTY_DRAFT,
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
import CaptainChat from "./CaptainChat";
import type { ChatMessage, PlanMode, Stage } from "./flow";
import ModeSwitch from "./ModeSwitch";
import PassDialog from "./PassDialog";
import PlanResult from "./PlanResult";
import QuestionDeck from "./QuestionDeck";
import ResumeBanner from "./ResumeBanner";
import StageRail from "./StageRail";
import StartScreen from "./StartScreen";
import TicketReview from "./TicketReview";

type Pending = "reply" | "itinerary" | "invite";
type FailedRequest = { kind: "reply"; story: string } | { kind: "itinerary" } | { kind: "invite" };

const DESKTOP_QUERY = "(min-width: 1024px)";
const HISTORY_TURNS = 10;

export default function PlanWorkspace() {
  const text = useMessages("plan");
  const locale = useLocale();
  const savedDraft = useSavedDraft();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [draft, dispatch] = useReducer(planDraftReducer, EMPTY_DRAFT);
  const [stage, setStage] = useState<Stage>("story");
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<PlanMode>("captain");
  const [questions, setQuestions] = useState<QuestionKey[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [fromPass, setFromPass] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [inlineQuestion, setInlineQuestion] = useState<QuestionKey | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [failed, setFailed] = useState<FailedRequest | null>(null);
  const [input, setInput] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const nextIdRef = useRef(1);
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
  }, [stage, inlineQuestion]);

  const say = (role: ChatMessage["role"], message: string) => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    setChat((current) => [...current, { id, role, text: message }]);
  };

  const beginRequest = (kind: Pending) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setPending(kind);
    setFailed(null);
    return controller.signal;
  };

  const askCaptain = async (story: string, base: PlanDraft = draft) => {
    const signal = beginRequest("reply");
    const turns: ChatTurn[] = chat.map((message) => ({ role: message.role, text: message.text }));
    const last = turns.at(-1);
    if (last?.role === "user" && last.text === story) turns.pop();
    const history = turns.slice(-HISTORY_TURNS);
    try {
      const reply = await captain.reply({ story, draft: base, locale, focus: nextRequired(base), history }, signal);
      const patch = parseDraftPatch(reply.draftPatch);
      dispatch({ type: "patch", patch });
      say("captain", reply.message);
      const ready = missingRequired(planDraftReducer(base, { type: "patch", patch })).length === 0;
      if (reply.action === "proceed" && ready) {
        setFromPass(false);
        setStage("pass");
      }
    } catch {
      if (signal.aborted) return;
      setFailed({ kind: "reply", story });
    }
    if (!signal.aborted) setPending(null);
  };

  const makePlan = async () => {
    setStage("plan");
    setItinerary(null);
    setInviteUrl(null);
    const signal = beginRequest("itinerary");
    try {
      setItinerary(await captain.itinerary({ draft, locale }, signal));
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

  const tellCaptain = (story: string) => {
    if (story === "") return;
    if (stage === "details" && requiredDone && isGoAhead(story)) {
      setInput("");
      say("user", story);
      setFromPass(false);
      setStage("pass");
      return;
    }
    dispatch({ type: "appendNote", value: story });
    setInput("");
    setStarted(true);
    setMode("captain");
    setFromPass(false);
    setPreviewing(false);
    setInlineQuestion(null);
    setStage("details");
    say("user", story);
    askCaptain(story);
  };

  const pickDates = (startDate: string, endDate: string) => {
    const patch = { startDate, endDate };
    const range = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).formatRange(
      parseLocalDate(startDate),
      parseLocalDate(endDate),
    );
    dispatch({ type: "patch", patch });
    say("user", range);
    askCaptain(range, planDraftReducer(draft, { type: "patch", patch }));
  };

  const retry = () => {
    if (!failed) return;
    if (failed.kind === "reply") askCaptain(failed.story);
    if (failed.kind === "itinerary") makePlan();
    if (failed.kind === "invite") makeInvite();
  };

  const openDeck = (list: QuestionKey[], startAt: QuestionKey | null = null, memberId: string | null = null) => {
    setMode("manual");
    setQuestions(list);
    setQuestionIndex(startAt ? Math.max(list.indexOf(startAt), 0) : 0);
    setSelectedMemberId(memberId);
    setPreviewing(false);
    setInlineQuestion(null);
    setStage("details");
    setStarted(true);
  };

  const startManual = (source: PlanDraft, startAt: QuestionKey | null = null) => {
    setFromPass(false);
    openDeck(openQuestions(source), startAt);
  };

  const announceNext = (prefix = "") => {
    const asking = nextRequired(draft);
    const prompt = asking ? text.deck.questions[asking].title : text.chat.allSet;
    if (prefix === "" && chat.at(-1)?.text.endsWith(prompt)) return;
    say("captain", `${prefix} ${prompt}`.trim());
  };

  const finishInline = () => {
    const answeredNow = inlineQuestion !== null && isAnswered(inlineQuestion, draft);
    setInlineQuestion(null);
    setSelectedMemberId(null);
    if (answeredNow) announceNext(text.chat.noted);
  };

  const changeMode = (next: PlanMode) => {
    if (next === mode) return;
    if (next === "manual") {
      startManual(draft);
      return;
    }
    setMode("captain");
    setSelectedMemberId(null);
    announceNext();
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
    if (target === "details" && mode === "manual") {
      startManual(draft);
      return;
    }
    if (target === "details") announceNext();
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
            input={input}
            onInputChange={setInput}
            onSend={() => tellCaptain(input.trim())}
            onStartManual={() => startManual(draft)}
          />
        </div>
      )}

      {stage === "details" && (
        <div className="space-y-8">
          {!fromPass && (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 sm:flex-none">
                <ModeSwitch mode={mode} text={text.mode} onChange={changeMode} />
              </div>
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

          {mode === "manual" && question !== undefined && (
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

          {mode === "captain" && inlineQuestion !== null && (
            <QuestionDeck
              draft={draft}
              dispatch={dispatch}
              text={text}
              questions={[inlineQuestion]}
              index={0}
              returnLabel={text.deck.backToCaptain}
              isDesktop={isDesktop}
              selectedMemberId={selectedMemberId}
              onIndexChange={changeQuestion}
              onBackToStory={finishInline}
              onFinish={finishInline}
              onSelectMember={setSelectedMemberId}
            />
          )}

          {mode === "captain" && inlineQuestion === null && (
            <CaptainChat
              text={text}
              messages={chat}
              asking={nextRequired(draft)}
              busy={pending === "reply"}
              failed={failed?.kind === "reply"}
              input={input}
              onInputChange={setInput}
              onSend={tellCaptain}
              onRetry={retry}
              onAnswerManually={setInlineQuestion}
              onPickDates={pickDates}
              onContinue={finishDetails}
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
          pending={pending === "reply" ? null : pending}
          failed={failed !== null && failed.kind !== "reply"}
          isSample={captainIsSample}
          onRetry={retry}
          onInvite={makeInvite}
          onBackToPass={() => setStage("pass")}
        />
      )}
    </main>
  );
}
