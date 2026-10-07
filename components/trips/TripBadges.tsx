import { CalendarClock, CloudDownload, CloudOff, PencilLine, ShieldCheck, TriangleAlert } from "lucide-react";
import type { OfflineState, TripStatus } from "@/lib/trips/trip";

const CHIP = "inline-flex items-center gap-1 rounded-full px-2 py-1 text-caption font-bold";
const STATUS = "inline-flex items-center gap-2 text-label";

type StatusBadgeProps = {
  status: Exclude<TripStatus, "ongoing">;
  label: string;
};

// A finished trip carries the same stamp the boarding pass gets when it is ready.
function CompletedStamp({ label }: { label: string }) {
  return (
    <p className="inline-flex -rotate-3 items-center gap-2 text-success">
      <svg viewBox="0 0 48 48" aria-hidden="true" className="size-6 shrink-0" fill="none" stroke="currentColor">
        <circle cx="24" cy="24" r="21" strokeWidth="3" />
        <path d="M15 24.5l6 6 12-13" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-caption font-extrabold tracking-wider uppercase">{label}</span>
    </p>
  );
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  if (status === "completed") return <CompletedStamp label={label} />;
  if (status === "draft") {
    return (
      <p className={`${STATUS} text-text-muted`}>
        <PencilLine className="size-4" aria-hidden="true" />
        {label}
      </p>
    );
  }
  return (
    <p className={`${STATUS} text-primary`}>
      <CalendarClock className="size-4" aria-hidden="true" />
      {label}
    </p>
  );
}

export function ViolationsBadge({ count, label }: { count: number; label: string }) {
  if (count === 0) {
    return (
      <p className={`${CHIP} bg-success-subtle text-on-success-subtle`}>
        <ShieldCheck className="size-3" aria-hidden="true" />
        {label}
      </p>
    );
  }
  return (
    <p className={`${CHIP} bg-warning-subtle text-on-warning-subtle`}>
      <TriangleAlert className="size-3" aria-hidden="true" />
      {label}
    </p>
  );
}

export function OfflineBadge({ state, label }: { state: OfflineState; label: string }) {
  if (state === "downloaded") {
    return (
      <p className={`${CHIP} border border-border-strong text-text`}>
        <CloudDownload className="size-3 text-primary" aria-hidden="true" />
        {label}
      </p>
    );
  }
  return (
    <p className={`${CHIP} border border-dashed border-border-strong text-text-muted`}>
      <CloudOff className="size-3" aria-hidden="true" />
      {label}
    </p>
  );
}
