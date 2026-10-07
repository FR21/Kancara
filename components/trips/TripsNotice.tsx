import { Check, CircleAlert, X } from "lucide-react";

export type Notice = { id: number; tone: "success" | "error"; message: string };

type TripsNoticeProps = {
  notice: Notice | null;
  dismissLabel: string;
  onDismiss: () => void;
};

// The live region stays mounted while empty, so screen readers announce a
// notice the moment it is filled in.
export default function TripsNotice({ notice, dismissLabel, onDismiss }: TripsNoticeProps) {
  return (
    <div
      role="status"
      className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-6"
    >
      {notice && (
        <div
          key={notice.id}
          className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-background py-2 pr-2 pl-4 shadow-lg shadow-neutral-950/10 motion-safe:animate-message-in"
        >
          {notice.tone === "success" ? (
            <Check className="size-5 shrink-0 text-success" strokeWidth={3} aria-hidden="true" />
          ) : (
            <CircleAlert className="size-5 shrink-0 text-error" aria-hidden="true" />
          )}
          <p className="min-w-0 flex-1 text-body-sm text-text">{notice.message}</p>
          <button
            type="button"
            aria-label={dismissLabel}
            title={dismissLabel}
            onClick={onDismiss}
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-muted transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-muted hover:text-text active:scale-[0.97]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
