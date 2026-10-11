import type { Itinerary, ItineraryBackup, ItineraryDay, ItineraryItem } from "@/lib/api/captain";

// Backup plans: every stop carries one or two places that can take its slot when it cannot happen. They are
// prepared and checked against the group's needs when the plan is made, so on the day nothing has to be looked up.

/** The backups a stop can switch to. What it held before a switch is among them as "main", so it can be put back. */
export function listBackups(item: ItineraryItem): ItineraryBackup[] {
  return item.backups ?? [];
}

export function countBackups(day: ItineraryDay): number {
  return day.items.reduce((count, item) => count + listBackups(item).filter((backup) => backup.kind !== "main").length, 0);
}

/** True when the leg from this stop to the next one was measured between the places now in those slots. */
export function isLegCurrent(item: ItineraryItem, nextItem: ItineraryItem | undefined): boolean {
  return item.standIn === undefined && nextItem?.standIn === undefined;
}

// Puts a backup into the stop's slot. What was there takes the backup's place in the list, so the two can be
// switched back and forth without losing either.
function swapBackup(item: ItineraryItem, index: number): ItineraryItem {
  const backups = listBackups(item);
  const chosen = backups[index];
  if (!chosen) return item;
  const held: ItineraryBackup = {
    kind: item.standIn ?? "main",
    title: item.title,
    detail: item.detail,
    imageUrl: item.imageUrl,
    address: item.address,
    rating: item.rating,
    priceLevel: item.priceLevel,
    openingHours: item.openingHours,
    covers: item.covers,
    violations: item.violations,
  };
  const { kind, ...place } = chosen;
  const others = backups.filter((_, position) => position !== index);
  return {
    ...place,
    time: item.time,
    travelToNext: item.travelToNext,
    standIn: kind === "main" ? undefined : kind,
    // The main plan leads the list while a backup stands in for it.
    backups: held.kind === "main" ? [held, ...others] : [...others, held],
  };
}

/** The itinerary with one stop switched to one of its backups. */
export function switchToBackup(itinerary: Itinerary, date: string, itemIndex: number, backupIndex: number): Itinerary {
  return {
    days: itinerary.days.map((day) =>
      day.date === date
        ? { ...day, items: day.items.map((item, index) => (index === itemIndex ? swapBackup(item, backupIndex) : item)) }
        : day,
    ),
  };
}
