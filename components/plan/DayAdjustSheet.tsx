"use client";

import { ArrowRight, Check, CloudRain, Coffee, DoorClosed, MapPin, TriangleAlert, Utensils, type LucideIcon } from "lucide-react";
import { type CSSProperties, useState } from "react";
import Checkbox from "@/components/ui/Checkbox";
import Sheet from "@/components/ui/Sheet";
import { GHOST_BUTTON, PRIMARY_BUTTON, TEXT_LINK, choiceClass, FIELD_LABEL } from "@/components/ui/styles";
import { findBackupIndexForKind, listBackups } from "@/lib/backups";
import { BACKUP_KINDS, type BackupKind, type ItineraryDay, type ItineraryItem } from "@/lib/client/captain";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { plural } from "@/lib/trips/format";
import { useLocale } from "@/lib/use-locale";

export type StopSwitch = { itemIndex: number; backupIndex: number };

type DayAdjustSheetProps = {
  open: boolean;
  day: ItineraryDay;
  dayNumber: number;
  /** What changed on the ground, chosen from where the sheet was opened (the rain notice, or the day's own button). */
  initialKind: BackupKind;
  rainChance: number | null;
  text: Messages["plan"]["itinerary"];
  onApply: (switches: StopSwitch[]) => void;
  onClose: () => void;
};

const KIND_ICONS: Record<BackupKind, LucideIcon> = {
  rain: CloudRain,
  rest: Coffee,
  meal: Utensils,
  closed: DoorClosed,
};

function hasAlternative(item: ItineraryItem): boolean {
  return listBackups(item).some((backup) => backup.kind !== "main");
}

function startingStops(day: ItineraryDay): Set<number> {
  const first = day.items.findIndex(hasAlternative);
  return new Set(first === -1 ? [] : [first]);
}

// Changing part of a day once the group is out: say what happened, tick the stops it affects, and see each one's
// prepared backup before switching. Only the ticked stops change; the rest of the day stays as planned. The count
// at the foot comes from the checks made when the plan was built, so it never claims more than those checks found.
export default function DayAdjustSheet({
  open,
  day,
  dayNumber,
  initialKind,
  rainChance,
  text,
  onApply,
  onClose,
}: DayAdjustSheetProps) {
  const locale = useLocale();
  const [kind, setKind] = useState<BackupKind>(initialKind);
  const [ticked, setTicked] = useState<Set<number>>(() => startingStops(day));
  // The backup picked by hand for a stop; without one the backup made for the chosen situation is used.
  const [picked, setPicked] = useState<Record<number, number>>({});
  const words = text.adjust;

  const backupFor = (index: number, item: ItineraryItem) => picked[index] ?? findBackupIndexForKind(item, kind);

  const toggle = (index: number, on: boolean) => {
    setTicked((current) => {
      const next = new Set(current);
      if (on) next.add(index);
      else next.delete(index);
      return next;
    });
  };

  const tickEveryStop = () => {
    setTicked(new Set(day.items.flatMap((item, index) => (hasAlternative(item) ? [index] : []))));
  };

  // Things the plan's own checks flagged in the day as it would be after switching.
  const toCheck = day.items.reduce((count, item, index) => {
    if (!ticked.has(index)) return count + (item.violations?.length ?? 0);
    const backup = listBackups(item)[backupFor(index, item)];
    return count + (backup?.violations?.length ?? 0);
  }, 0);

  const apply = () => {
    onApply([...ticked].map((itemIndex) => ({ itemIndex, backupIndex: backupFor(itemIndex, day.items[itemIndex]) })));
    onClose();
  };

  const footer = (
    <>
      <button type="button" onClick={onClose} className={GHOST_BUTTON}>
        {words.cancel}
      </button>
      <button type="button" onClick={apply} disabled={ticked.size === 0} className={`${PRIMARY_BUTTON} flex-1 sm:flex-none`}>
        <Check className="size-4" aria-hidden="true" />
        {plural(words.apply, ticked.size, locale)}
      </button>
    </>
  );

  return (
    <Sheet open={open} title={fillTemplate(words.title, { number: dayNumber })} closeLabel={text.close} onClose={onClose} footer={footer}>
      <fieldset>
        <legend className={FIELD_LABEL}>{words.what}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {BACKUP_KINDS.map((option) => {
            const Icon = KIND_ICONS[option];
            return (
              <button
                key={option}
                type="button"
                aria-pressed={kind === option}
                onClick={() => {
                  setKind(option);
                  setPicked({});
                }}
                className={choiceClass(kind === option)}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {words.kinds[option]}
              </button>
            );
          })}
        </div>
        {kind === "rain" && rainChance !== null && (
          <p className="mt-2 text-body-sm text-text-muted">{fillTemplate(text.weather.chance, { chance: Math.round(rainChance) })}</p>
        )}
      </fieldset>

      <section aria-labelledby="day-adjust-stops">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="day-adjust-stops" className="text-label-lg text-text">
            {words.which}
          </h3>
          <button type="button" onClick={tickEveryStop} className={TEXT_LINK}>
            {words.all}
          </button>
        </div>
        <p className="mt-1 text-body-sm text-pretty text-text-muted">{words.whichHint}</p>

        <ul className="mt-4 divide-y divide-border border-y border-border">
          {day.items.map((item, index) => {
            const on = ticked.has(index);
            const alternatives = hasAlternative(item);
            const backups = listBackups(item);
            const chosenIndex = backupFor(index, item);
            const chosen = backups[chosenIndex];
            return (
              <li
                key={`${item.time}-${item.title}`}
                style={{ "--item-index": index } as CSSProperties}
                className="py-3 motion-safe:animate-list-in"
              >
                <label className={`flex items-start gap-3 ${alternatives ? "cursor-pointer" : ""}`}>
                  {alternatives ? (
                    <Checkbox checked={on} onChange={(checked) => toggle(index, checked)} />
                  ) : (
                    <span aria-hidden="true" className="size-6 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-caption font-bold text-text-muted tabular-nums">{item.time}</span>
                    <span className={`block text-label-lg text-pretty ${on ? "text-text-muted line-through" : "text-text"}`}>{item.title}</span>
                    {!alternatives && <span className="mt-1 block text-body-sm text-text-muted">{words.noBackup}</span>}
                  </span>
                </label>

                {on && chosen && (
                  <div className="mt-3 ml-9 border-l border-primary pl-4 motion-safe:animate-message-in">
                    <p className="flex items-center gap-2 text-caption font-bold text-primary">
                      <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                      {text.backups.kinds[chosen.kind]}
                    </p>
                    <p className="mt-1 text-label text-text">{chosen.title}</p>
                    {chosen.detail && <p className="mt-1 line-clamp-2 text-body-sm text-text-muted">{chosen.detail}</p>}
                    {chosen.address && (
                      <p className="mt-1 flex items-start gap-1 text-caption text-text-muted">
                        <MapPin className="size-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 wrap-anywhere">{chosen.address}</span>
                      </p>
                    )}
                    {backups.length > 1 && (
                      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={words.others}>
                        {backups.map((backup, backupIndex) => (
                          <button
                            key={`${backup.kind}-${backup.title}`}
                            type="button"
                            aria-pressed={chosenIndex === backupIndex}
                            title={backup.title}
                            onClick={() => setPicked((current) => ({ ...current, [index]: backupIndex }))}
                            className={`${choiceClass(chosenIndex === backupIndex)} max-w-full`}
                          >
                            <span className="truncate">{backup.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {ticked.size > 0 && (
        <p role="status" className={`flex items-start gap-2 rounded-lg px-4 py-3 text-body-sm ${toCheck === 0 ? "bg-success-subtle text-on-success-subtle" : "bg-warning-subtle text-on-warning-subtle"}`}>
          {toCheck === 0 ? (
            <Check className="mt-1 size-4 shrink-0" aria-hidden="true" />
          ) : (
            <TriangleAlert className="mt-1 size-4 shrink-0" aria-hidden="true" />
          )}
          {toCheck === 0 ? words.fits : plural(text.toCheck, toCheck, locale)}
        </p>
      )}
    </Sheet>
  );
}
