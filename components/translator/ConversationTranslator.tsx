"use client";

import { useEffect, useRef, useState } from "react";
import FieldPassButton from "@/components/field-pass/FieldPassButton";
import Notice, { type NoticeMessage } from "@/components/layout/Notice";
import PageHeader from "@/components/layout/PageHeader";
import { type TranslationContext, type TranslationRequest, TranslationError, blobToBase64, MAX_AUDIO_CHARS, translate } from "@/lib/client/translator";
import { fillTemplate } from "@/lib/plan-draft";
import { useLocale } from "@/lib/use-locale";
import { useMessages } from "@/lib/use-messages";
import { useSpeech } from "@/lib/use-speech";
import ConversationLog, { type ConversationTurnView } from "./ConversationLog";
import FaceToFacePanel from "./FaceToFacePanel";
import { guessLocalLanguage, languageByKey, travelerLanguage } from "./languages";
import SpeakerComposer from "./SpeakerComposer";
import TranslatorSettings, { languageLabel } from "./TranslatorSettings";
import { type Speaker, type VoiceFailure, useVoiceInput } from "./use-voice-input";

type ConversationTranslatorProps = { tripId: string; tripName: string; destination: string };

type TurnInput = { speaker: Speaker; context?: TranslationContext } & ({ text: string } | { recording: Blob });

// The translator of one trip: two people with no shared language take turns, by voice or by typing, and each turn
// is shown and read aloud in the other's language.
export default function ConversationTranslator({ tripId, tripName, destination }: ConversationTranslatorProps) {
  const text = useMessages("translator");
  const navText = useMessages("navbar");
  const tripsText = useMessages("trips");
  const locale = useLocale();
  const traveler = travelerLanguage(locale);
  const [localKey, setLocalKey] = useState<string>(() => guessLocalLanguage(destination, locale).key);
  const local = languageByKey(localKey);
  const [turns, setTurns] = useState<ConversationTurnView[]>([]);
  const [drafts, setDrafts] = useState<Record<Speaker, string>>({ traveler: "", local: "" });
  const [translating, setTranslating] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [faceToFace, setFaceToFace] = useState(false);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  const { supported: canSpeak, speakingId, speak } = useSpeech();
  const requestRef = useRef<AbortController | null>(null);
  const noticeCountRef = useRef(0);

  useEffect(() => () => requestRef.current?.abort(), []);

  const travelerName = fillTemplate(text.travelerName, { language: text.languages[traveler.key] });
  const localName = fillTemplate(text.localName, { language: text.languages[local.key] });
  const languageOf = (speaker: Speaker) => (speaker === "traveler" ? traveler : local);
  const otherSide = (speaker: Speaker) => (speaker === "traveler" ? local : traveler);

  const showError = (message: string) => {
    noticeCountRef.current += 1;
    setNotice({ id: noticeCountRef.current, tone: "error", message });
  };

  const speakTurn = (turn: ConversationTurnView) => {
    const result = speak(turn.translatedText, turn.translatedTag, turn.id);
    if (result === "unsupported") showError(text.noSpeech);
    if (result === "noVoice") {
      const language = turn.speaker === "traveler" ? local : traveler;
      showError(fillTemplate(text.noVoice, { language: text.languages[language.key] }));
    }
  };

  const runTurn = async (input: TurnInput) => {
    if (translating) return;
    const source = languageOf(input.speaker);
    const target = otherSide(input.speaker);
    const controller = new AbortController();
    requestRef.current = controller;
    setTranslating(true);
    try {
      const request: TranslationRequest = {
        tripId,
        sourceLanguage: source.englishName,
        targetLanguage: target.englishName,
        context: input.context ?? "general",
        locale,
      };
      if ("text" in input) request.text = input.text.trim();
      else {
        const base64 = await blobToBase64(input.recording);
        if (base64.length > MAX_AUDIO_CHARS) throw new TranslationError("failed");
        request.audio = { base64, mimeType: input.recording.type || "audio/webm" };
      }
      const result = await translate(request, controller.signal);
      const turn: ConversationTurnView = {
        id: crypto.randomUUID(),
        speaker: input.speaker,
        originalText: result.originalText || ("text" in input ? input.text : ""),
        translatedText: result.translatedText,
        romanized: result.romanized,
        translatedTag: target.tag,
        politenessLevel: result.politenessLevel,
        culturalTip: result.culturalTip,
      };
      setTurns((current) => [...current, turn]);
      setDrafts((current) => ({ ...current, [input.speaker]: "" }));
      // Read aloud by itself, a missing voice is not worth a notice on every turn; the play button explains it.
      if (autoSpeak) speak(turn.translatedText, turn.translatedTag, turn.id);
    } catch (caught) {
      if (controller.signal.aborted) return;
      showError(caught instanceof TranslationError && caught.reason === "offline" ? text.errors.offline : text.errors.failed);
    } finally {
      if (!controller.signal.aborted) setTranslating(false);
    }
  };

  const voiceFailureText: Record<VoiceFailure, string> = {
    blocked: text.errors.micBlocked,
    noSpeech: text.errors.noSpeech,
    failed: text.errors.micFailed,
  };
  const voice = useVoiceInput({
    onTranscript: (speaker, transcript, final) => {
      setDrafts((current) => ({ ...current, [speaker]: transcript }));
      if (final && transcript.trim()) void runTurn({ speaker, text: transcript });
    },
    onRecording: (speaker, recording) => void runTurn({ speaker, recording }),
    onFailure: (failure) => showError(voiceFailureText[failure]),
  });

  const lastTravelerTurn = turns.findLast((turn) => turn.speaker === "traveler") ?? null;
  const tripLabel = tripName || tripsText.card.untitled;

  const composer = (speaker: Speaker) => {
    const language = languageOf(speaker);
    return (
      <SpeakerComposer
        id={`translator-${speaker}`}
        label={speaker === "traveler" ? travelerName : localName}
        languageTag={language.tag}
        placeholder={fillTemplate(text.composer.placeholder, { language: languageLabel(language, text.languages) })}
        value={drafts[speaker]}
        onChange={(value) => setDrafts((current) => ({ ...current, [speaker]: value }))}
        onSend={() => void runTurn({ speaker, text: drafts[speaker] })}
        onMic={() => voice.toggle(speaker, language.tag)}
        listening={voice.activeSpeaker === speaker}
        elapsedSeconds={voice.elapsedSeconds}
        busy={translating}
        voiceMode={voice.mode}
        text={text.composer}
      />
    );
  };

  return (
    <>
      <PageHeader
        crumbs={{
          label: navText.breadcrumb,
          items: [
            { label: navText.links.trips, href: "/trips" },
            { label: tripLabel, href: `/trips/${encodeURIComponent(tripId)}` },
            { label: text.crumb },
          ],
        }}
        title={text.title}
        lead={fillTemplate(text.lead, { destination: destination || tripLabel })}
        actions={<FieldPassButton tripId={tripId} destination={destination} />}
      />

      <div className="mt-8 motion-safe:animate-message-in">
        <TranslatorSettings
          localLanguage={local}
          onLanguage={setLocalKey}
          autoSpeak={autoSpeak}
          onAutoSpeak={setAutoSpeak}
          faceToFace={faceToFace}
          onFaceToFace={setFaceToFace}
          canSpeak={canSpeak}
          text={text}
        />
      </div>

      {faceToFace && (
        <div className="mt-8 motion-safe:animate-message-in">
          <FaceToFacePanel turn={lastTravelerTurn} localName={localName} waitingText={text.faceToFaceWaiting} />
        </div>
      )}

      <div className="mt-8 min-h-64 flex-1">
        <ConversationLog
          turns={turns}
          translating={translating}
          speakingId={speakingId}
          onSpeak={speakTurn}
          onQuickPhrase={(phrase) => void runTurn({ speaker: "traveler", text: phrase.text, context: phrase.context })}
          travelerName={travelerName}
          localName={localName}
          text={text}
        />
      </div>

      {/* The two ways to talk sit right under the conversation they add to, with what this browser can hear. */}
      <div className="mt-6 border-t border-border pt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {composer("traveler")}
          {composer("local")}
        </div>
        {voice.mode === "none" && <p className="mt-4 text-body-sm text-pretty text-text-muted">{text.noMicrophone}</p>}
        {voice.mode === "recording" && <p className="mt-4 text-body-sm text-pretty text-text-muted">{text.recordingMode}</p>}
      </div>

      <Notice notice={notice} dismissLabel={text.dismiss} onDismiss={() => setNotice(null)} />
    </>
  );
}
