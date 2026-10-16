import {
  Armchair,
  Check,
  CloudRain,
  DoorClosed,
  type LucideIcon,
  MapPin,
  Star,
  Undo2,
  Utensils,
} from "lucide-react";
import type { ItineraryBackup, ItineraryItem } from "@/lib/client/captain";
import { listBackups } from "@/lib/backups";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import type { CSSProperties } from "react";
import { BADGE, ICON_BUTTON, buttonClass } from "@/components/ui/styles";
import { StopCovers, StopViolations } from "./StopBadges";

type StopBackupsProps = {
  item: ItineraryItem;
  destination: string;
  text: Messages["plan"]["itinerary"];
  /** False for a sample plan, whose places were never held against the group's needs. */
  validated: boolean;
  describeCover: (cover: ItineraryItem["covers"][number]) => string;
  /** Absent where the plan is only read. */
  onUse?: (backupIndex: number) => void;
};

const KIND_ICONS: Record<ItineraryBackup["kind"], LucideIcon> = {
  rain: CloudRain,
  rest: Armchair,
  meal: Utensils,
  closed: DoorClosed,
  main: Undo2,
};

/** Where the stop sheet scrolls to when asked for the backups. */
export const BACKUPS_ID = "stop-backups";

function mapsUrl(backup: ItineraryBackup, destination: string): string {
  const query = [backup.title, backup.address || destination].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// The places standing by for one stop. A backup wears the dashed outline of a slot not yet in use; the main plan,
// while a backup stands in for it, is listed first and filled, as the way back. Each is a box inside the stop's
// sheet, so it takes an 8px corner and holds only pills.
export default function StopBackups({
  item,
  destination,
  text,
  validated,
  describeCover,
  onUse,
}: StopBackupsProps) {
  const backups = listBackups(item);
  if (backups.length === 0) return null;
  const copy = text.backups;

  return (
    <section id={BACKUPS_ID} className="scroll-mt-4">
      <h3 className="font-sans text-label text-text">{copy.title}</h3>
      <p className="mt-1 text-body-sm text-pretty text-text-muted">{copy.hint}</p>
      <ul className="mt-4 space-y-3">
        {backups.map((backup, index) => {
          const Icon = KIND_ICONS[backup.kind];
          const isMain = backup.kind === "main";
          const toCheck = backup.violations?.length ?? 0;
          const mapLabel = fillTemplate(copy.map, { name: backup.title });
          return (
            <li
              key={`${backup.kind}-${backup.title}`}
              style={{ "--item-index": index } as CSSProperties}
              className={`surface-compact rounded-surface border p-surface motion-safe:animate-list-in ${
                isMain ? "border-primary bg-primary-subtle" : "border-dashed border-border-strong"
              }`}
            >
              <p className="flex items-center gap-2 text-label text-primary">
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {copy.kinds[backup.kind]}
              </p>
              <p className="mt-1 text-label-lg text-pretty wrap-anywhere text-text">{backup.title}</p>
              {backup.detail && <p className="mt-1 text-body-sm text-pretty text-text-muted">{backup.detail}</p>}
              {backup.address && (
                <p className="mt-1 flex items-start gap-2 text-caption text-pretty text-text-muted">
                  <MapPin className="size-4 shrink-0" aria-hidden="true" />
                  {backup.address}
                </p>
              )}

              {((validated && toCheck === 0) || backup.rating !== undefined) && (
                <p className="mt-3 flex flex-wrap items-center gap-2">
                  {validated && toCheck === 0 && (
                    <span className={`${BADGE} bg-success-subtle text-on-success-subtle`}>
                      <Check className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
                      {copy.checked}
                    </span>
                  )}
                  {backup.rating !== undefined && (
                    <span className="inline-flex items-center gap-1 text-caption text-text-muted tabular-nums">
                      <Star className="size-3 fill-accent text-accent-500" aria-hidden="true" />
                      {fillTemplate(text.rating, { rating: backup.rating })}
                    </span>
                  )}
                </p>
              )}
              {(backup.covers.length > 0 || toCheck > 0) && (
                <div className="mt-3 space-y-3">
                  <StopCovers item={backup} label={text.honours} describeCover={describeCover} />
                  <StopViolations item={backup} label={text.check} boxed={false} />
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                {onUse && (
                  <button
                    type="button"
                    onClick={() => onUse(index)}
                    className={`${buttonClass(isMain ? "primary" : "outline", "small")} min-w-0 flex-1`}
                  >
                    {isMain ? copy.restore : copy.use}
                  </button>
                )}
                <a
                  href={mapsUrl(backup, destination)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={mapLabel}
                  title={mapLabel}
                  className={`${ICON_BUTTON} border border-border-strong`}
                >
                  <MapPin className="size-4" aria-hidden="true" />
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
