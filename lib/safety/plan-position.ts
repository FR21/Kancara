import { splitTime, toMinutes } from "@/lib/stop-time";
import type { MeetingPoint, SafetyDay, SafetyMember, SafetyPack, SafetyStop } from "./pack";

// Where a member should be according to the plan. It is read from the itinerary and the clock, never from a
// phone's position, so it is there for a member without a phone and for a phone without a connection.

export type PlanPosition = {
  stop: SafetyStop;
  /** When the stop ends: its own end time, or the start of the next one. Empty when the plan does not say. */
  until: string;
  /** "now" while the stop is under way; "last" when it has ended and nothing else has started. */
  state: "now" | "last";
};

type Clock = { date: string; time: string };

function endOf(day: SafetyDay, index: number): string {
  const own = splitTime(day.stops[index].time).end;
  if (own) return own;
  const next = day.stops[index + 1];
  return next ? splitTime(next.time).start : "";
}

/** The stop the group is at now, or the last one it was at today. Null before the day's first stop. */
export function planPosition(days: SafetyDay[], clock: Clock): PlanPosition | null {
  const day = days.find((entry) => entry.date === clock.date);
  const minute = toMinutes(clock.time);
  if (!day || minute === null) return null;

  let latest: PlanPosition | null = null;
  for (const [index, stop] of day.stops.entries()) {
    const from = toMinutes(splitTime(stop.time).start);
    if (from === null || from > minute) continue;
    const until = endOf(day, index);
    const end = toMinutes(until);
    latest = { stop, until, state: end === null || minute < end ? "now" : "last" };
  }
  return latest;
}

/**
 * Who a member should be with at this stop. The plan does not yet say who goes to which stop, so everyone on the
 * trip is taken to be at every stop: the companions are the rest of the group.
 */
export function companionsOf(pack: SafetyPack, memberId: string): SafetyMember[] {
  return pack.members.filter((member) => member.id !== memberId);
}

/**
 * Where the group gathers: the point a member set, or failing that the stop the plan has the group at. The
 * second has no coordinates, so it can be named and opened in a map but not pointed to.
 */
export function meetingPlace(pack: SafetyPack, clock: Clock): MeetingPoint | null {
  if (pack.meetingPoint) return pack.meetingPoint;
  const position = planPosition(pack.days, clock);
  if (!position) return null;
  return { label: position.stop.title, note: position.stop.address, latitude: null, longitude: null, setAt: "" };
}
