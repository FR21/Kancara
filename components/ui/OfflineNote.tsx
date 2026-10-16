import { CloudOff } from "lucide-react";

type OfflineNoteProps = { message: string };

// Said up front, on a page whose main action needs a connection, while the phone has none: the person learns it
// before they type or pick anything, not from an error afterwards. Also said while a change made offline waits on
// this phone to be sent. A note with nothing to press, so the 8px corner of every such note.
export default function OfflineNote({ message }: OfflineNoteProps) {
  return (
    <p
      role="status"
      className="flex items-start gap-3 rounded-lg bg-surface-muted px-4 py-3 text-left text-body-sm text-pretty text-text motion-safe:animate-message-in"
    >
      <CloudOff className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
      {message}
    </p>
  );
}
