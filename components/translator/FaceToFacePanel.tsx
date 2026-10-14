import type { ConversationTurnView } from "./ConversationLog";

type FaceToFacePanelProps = {
  /** The traveler's latest turn, or null before they have said anything. */
  turn: ConversationTurnView | null;
  localName: string;
  waitingText: string;
};

// The traveler's last sentence turned upside down, for the person across the table to read while the phone lies
// flat between them.
export default function FaceToFacePanel({ turn, localName, waitingText }: FaceToFacePanelProps) {
  return (
    <section aria-live="polite" className="rotate-180 rounded-surface border border-primary bg-primary-subtle p-surface text-center">
      <p className="text-caption font-bold text-on-primary-subtle">{localName}</p>
      {turn ? (
        <div key={turn.id} className="motion-safe:animate-pop-in">
          <p lang={turn.translatedTag} className="mt-2 text-h2 text-pretty text-text">
            {turn.translatedText}
          </p>
          {turn.romanized && turn.romanized !== turn.translatedText && <p className="mt-2 text-body-sm text-text-muted">{turn.romanized}</p>}
        </div>
      ) : (
        <p className="mt-2 text-body text-text-muted">{waitingText}</p>
      )}
    </section>
  );
}
