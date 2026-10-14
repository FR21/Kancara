import type { ItineraryDay, ItineraryItem } from "@/lib/client/captain";
import { type Member, type NeedKey } from "@/lib/plan-draft";
import { splitTime, toMinutes } from "@/lib/stop-time";

/** The needs that ask for a pause in the day. A free stretch is shown as rest only when someone has one of them. */
const REST_NEEDS: NeedKey[] = ["nap", "frequentBreaks"];
/** A free stretch shorter than this is just the time it takes to leave and arrive, not a rest. */
const MIN_REST_MINUTES = 20;

/** Minutes in a travel time as Google writes it, in English or Indonesian: "1 hour 5 mins", "15 menit". */
export function minutesIn(duration: string): number | null {
  const hours = duration.match(/(\d+)\s*(?:h|hr|hrs|hour|hours|jam)\b/i);
  const minutes = duration.match(/(\d+)\s*(?:m|min|mins|minute|minutes|mnt|menit)\b/i);
  if (!hours && !minutes) return null;
  return (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
}

/** Kilometres in a distance as Google writes it: "4.2 km", "4,2 km", "850 m". */
export function kilometresIn(distance: string): number | null {
  const match = distance.match(/([\d.,]+)\s*(km|m)\b/i);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  if (Number.isNaN(value)) return null;
  return match[2].toLowerCase() === "km" ? value : value / 1000;
}

export type DaySummary = { stops: number; kilometres: number | null; issues: number };

/** The day in one line: how many stops, how far the group drives, and how many needs are not fully met. */
export function summarize(day: ItineraryDay): DaySummary {
  const legs = day.items.flatMap((item) => (item.travelToNext ? [kilometresIn(item.travelToNext.distance)] : []));
  const known = legs.filter((kilometres): kilometres is number => kilometres !== null);
  return {
    stops: day.items.length,
    kilometres: known.length > 0 ? known.reduce((sum, kilometres) => sum + kilometres, 0) : null,
    issues: day.items.reduce((count, item) => count + (item.violations?.length ?? 0), 0),
  };
}

/** The members who need pauses in the day, in the group's order. */
export function restingMembers(members: Member[]): Member[] {
  return members.filter((member) => member.needs.some((need) => REST_NEEDS.includes(need)));
}

/**
 * The free minutes between one stop and the next once the drive is done, when they are long enough to rest in.
 * Null when either time cannot be read, or the stretch is too short to call a rest.
 */
export function restAfter(item: ItineraryItem, next: ItineraryItem | undefined): number | null {
  if (!next) return null;
  const end = toMinutes(splitTime(item.time).end);
  const nextStart = toMinutes(splitTime(next.time).start);
  if (end === null || nextStart === null) return null;
  const drive = item.travelToNext ? (minutesIn(item.travelToNext.duration) ?? 0) : 0;
  const free = nextStart - end - drive;
  if (free < MIN_REST_MINUTES) return null;
  return Math.floor(free / 5) * 5;
}
