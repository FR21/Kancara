import {
  CalendarClock,
  Check,
  CloudDownload,
  CloudOff,
  PencilLine,
  Plane,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { BADGE } from "@/components/ui/styles";
import type { OfflineState, TripStatus } from "@/lib/trips/trip";

const STATUS_ICONS = { ongoing: Plane, upcoming: CalendarClock, draft: PencilLine, completed: Check };

const STATUS_MARKS: Record<TripStatus, string> = {
  ongoing: "bg-primary text-on-primary",
  upcoming: "border border-primary text-primary",
  draft: "border border-dashed border-border-strong text-text-muted",
  completed: "bg-success-subtle text-on-success-subtle",
};

/** The round mark that leads a row in the list: shape and icon change with the status, not only the colour. */
export function StatusMark({ status, label }: { status: TripStatus; label: string }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-[scale,rotate] duration-300 ease-spring group-hover/row:scale-110 group-hover/row:-rotate-6 ${STATUS_MARKS[status]}`}
    >
      <Icon className="size-4" strokeWidth={status === "completed" ? 3 : 2} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

const STATUS_TONES: Record<TripStatus, string> = {
  ongoing: "bg-primary-subtle text-on-primary-subtle",
  upcoming: "bg-info-subtle text-on-info-subtle",
  draft: "bg-surface-muted text-text-muted",
  completed: "bg-success-subtle text-on-success-subtle",
};

/** The status as a labelled tag at the top of a trip's card. */
export function StatusPill({ status, label }: { status: TripStatus; label: string }) {
  const Icon = STATUS_ICONS[status];
  return (
    <p className={`${BADGE} ${STATUS_TONES[status]}`}>
      <Icon className="size-4" strokeWidth={status === "completed" ? 3 : 2} aria-hidden="true" />
      {label}
    </p>
  );
}

export function ViolationsBadge({ count, label }: { count: number; label: string }) {
  if (count === 0) {
    return (
      <p className={`${BADGE} bg-success-subtle text-on-success-subtle`}>
        <ShieldCheck className="size-3" aria-hidden="true" />
        {label}
      </p>
    );
  }
  return (
    <p className={`${BADGE} bg-warning-subtle text-on-warning-subtle`}>
      <TriangleAlert className="size-3" aria-hidden="true" />
      {label}
    </p>
  );
}

export function OfflineBadge({ state, label }: { state: OfflineState; label: string }) {
  if (state === "downloaded") {
    return (
      <p className={`${BADGE} border border-border-strong text-text`}>
        <CloudDownload className="size-3 text-primary" aria-hidden="true" />
        {label}
      </p>
    );
  }
  return (
    <p className={`${BADGE} border border-dashed border-border-strong text-text-muted`}>
      <CloudOff className="size-3" aria-hidden="true" />
      {label}
    </p>
  );
}
