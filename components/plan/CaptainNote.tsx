import Image from "next/image";

type CaptainNoteProps = {
  /** One sentence from Captain: a hint for the question beside it. */
  children: string;
  className?: string;
};

// Captain as a small guide: the mascot at the size of a face in a conversation, one sentence beside it. It helps
// without taking the stage, so the question stays the thing on screen.
export default function CaptainNote({ children, className = "" }: CaptainNoteProps) {
  return (
    <p className={`flex items-start gap-3 ${className}`}>
      <Image
        src="/images/logo/kancara_mascot_captain_logo.webp"
        alt=""
        width={40}
        height={40}
        className="size-10 shrink-0 rounded-full bg-primary-subtle object-contain p-1"
      />
      <span className="min-w-0 flex-1 pt-2 text-body-sm text-pretty text-text-muted">{children}</span>
    </p>
  );
}
