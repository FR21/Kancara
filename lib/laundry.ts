import type { ErrandKind, Itinerary, ItineraryDay, ItineraryItem } from "@/lib/client/captain";
import { MAX_OUTFIT_DAYS, MAX_TRIP_DAYS, needsLaundryChoice } from "./packing";
import { type PlanDraft, listTripDates } from "./plan-draft";
import { splitTime, toMinutes } from "./stop-time";

// Laundry takes time, so the choice the group makes on its packing list is given a place on the schedule: a
// drop-off the day before the clean clothes run out and a pick-up the day after, or an evening of washing. The
// stops are worked out from the choice alone, so they can be taken off and put back whenever it changes.

export type LaundryPlace = { title: string; address?: string; rating?: number };
/** The words of a laundry stop, written into the plan in the reader's language like every other stop. */
export type LaundryCopy = { nearest: string; drop: string; pick: string; washTitle: string; wash: string };
/** The laundry found for each drop-off, by its date. Null where none was found. */
export type LaundryPlaces = Record<string, LaundryPlace | null>;

type Round = { drop: string; pick: string };
type Errand = { date: string; kind: ErrandKind; round: Round };

const VISIT_MINUTES = 30;
const WASH_MINUTES = 45;
// A laundry is taken to be open between these hours; a visit outside them moves to the other end of the day.
const OPENS = 8 * 60;
const CLOSES = 20 * 60;
const UNTIMED_STOP_MINUTES = 60;
const DEFAULT_VISIT = 9 * 60;
// Washing is an evening job: it never starts before this hour, however early the day's last stop ends.
const EVENING = 19 * 60;

// One round of laundry falls on the last two days the clean clothes cover, as long as days remain after it. A
// round is left out when the itinerary does not reach both of its days.
function listRounds(draft: PlanDraft, itinerary: Itinerary): Round[] {
  if (!needsLaundryChoice(draft)) return [];
  const dates = listTripDates(draft, MAX_TRIP_DAYS);
  const planned = new Set(itinerary.days.map((day) => day.date));
  const rounds: Round[] = [];
  for (let last = MAX_OUTFIT_DAYS; last < dates.length; last += MAX_OUTFIT_DAYS) {
    const round = { drop: dates[last - 2], pick: dates[last - 1] };
    if (planned.has(round.drop) && planned.has(round.pick)) rounds.push(round);
  }
  return rounds;
}

function listExpected(draft: PlanDraft, itinerary: Itinerary): Errand[] {
  const choice = draft.packing.laundry;
  const rounds = listRounds(draft, itinerary);
  if (choice === "wash") return rounds.map((round) => ({ date: round.drop, kind: "wash", round }));
  if (choice !== "laundry") return [];
  return rounds.flatMap((round): Errand[] => [
    { date: round.drop, kind: "laundryDrop", round },
    { date: round.pick, kind: "laundryPick", round },
  ]);
}

/** True when the schedule already holds exactly the laundry stops the group's choice asks for. */
export function laundryInSync(draft: PlanDraft, itinerary: Itinerary): boolean {
  const held = itinerary.days.flatMap((day) => day.items.flatMap((item) => (item.errand ? `${day.date}:${item.errand}` : [])));
  const expected = listExpected(draft, itinerary).map((errand) => `${errand.date}:${errand.kind}`);
  return held.length === expected.length && expected.every((entry) => held.includes(entry));
}

/** Where to look for a laundry, one entry per drop-off: beside the lodging the group named, or that day's first stop. */
export function laundryLookups(draft: PlanDraft, itinerary: Itinerary): { date: string; near: string }[] {
  if (draft.packing.laundry !== "laundry") return [];
  const destination = draft.destinations[0] ?? "";
  const lodging = draft.extras.lodging.trim();
  return listRounds(draft, itinerary).map((round) => {
    const day = itinerary.days.find((entry) => entry.date === round.drop);
    const address = day?.items.find((item) => !item.errand && item.address)?.address;
    const near = lodging ? [lodging, destination].filter(Boolean).join(", ") : (address ?? destination);
    return { date: round.drop, near };
  });
}

/** Day numbers, counted as the itinerary counts them, on which the laundry is handed in or washed. */
export function laundryDayNumbers(itinerary: Itinerary): number[] {
  return itinerary.days.flatMap((day, index) =>
    day.items.some((item) => item.errand === "laundryDrop" || item.errand === "wash") ? [index + 1] : [],
  );
}

function clock(minutes: number): string {
  const capped = Math.min(Math.max(minutes, 0), 24 * 60 - 1);
  return `${String(Math.floor(capped / 60)).padStart(2, "0")}:${String(capped % 60).padStart(2, "0")}`;
}

function slot(from: number, length: number): string {
  return `${clock(from)} - ${clock(from + length)}`;
}

function dayEdges(day: ItineraryDay): { first: number | null; last: number | null } {
  if (day.items.length === 0) return { first: null, last: null };
  const closing = splitTime(day.items[day.items.length - 1].time);
  const closingStart = toMinutes(closing.start);
  return {
    first: toMinutes(splitTime(day.items[0].time).start),
    last: toMinutes(closing.end) ?? (closingStart === null ? null : closingStart + UNTIMED_STOP_MINUTES),
  };
}

// A visit goes before the day's first stop or after its last one, whichever the laundry's hours allow, leaning
// to the end asked for: early for a drop-off so the wash starts sooner, late for a pick-up so it has time.
function visitSlot(day: ItineraryDay, early: boolean): { time: string; atStart: boolean } {
  const { first, last } = dayEdges(day);
  const before = first !== null && first - VISIT_MINUTES >= OPENS ? first - VISIT_MINUTES : null;
  const after = last !== null && last + VISIT_MINUTES <= CLOSES ? last : null;
  const from = early ? (before ?? after) : (after ?? before);
  if (from !== null) return { time: slot(from, VISIT_MINUTES), atStart: from === before };
  // Neither end fits the hours; the visit still leads the day so it is not forgotten.
  return { time: slot(first === null ? DEFAULT_VISIT : first - VISIT_MINUTES, VISIT_MINUTES), atStart: true };
}

function addErrand(day: ItineraryDay, errand: Errand, place: LaundryPlace | null, copy: LaundryCopy): ItineraryDay {
  if (errand.kind === "wash") {
    const { last } = dayEdges(day);
    const wash: ItineraryItem = {
      errand: "wash",
      time: slot(Math.max(last ?? EVENING, EVENING), WASH_MINUTES),
      title: copy.washTitle,
      detail: copy.wash,
      covers: [],
    };
    return { ...day, items: [...day.items, wash] };
  }
  const { time, atStart } = visitSlot(day, errand.kind === "laundryDrop");
  const visit: ItineraryItem = {
    errand: errand.kind,
    time,
    title: place?.title ?? copy.nearest,
    detail: errand.kind === "laundryDrop" ? copy.drop : copy.pick,
    address: place?.address,
    rating: place?.rating,
    covers: [],
  };
  return { ...day, items: atStart ? [visit, ...day.items] : [...day.items, visit] };
}

/**
 * The itinerary with the laundry stops the group's choice asks for, and no others. `places` is left out while
 * the laundries have not been looked up: washing still goes in, visits to a laundry wait.
 */
export function planLaundry(draft: PlanDraft, itinerary: Itinerary, copy: LaundryCopy, places?: LaundryPlaces): Itinerary {
  const expected = listExpected(draft, itinerary).filter((errand) => errand.kind === "wash" || places !== undefined);
  return {
    days: itinerary.days.map((day) => {
      const cleared: ItineraryDay = { ...day, items: day.items.filter((item) => !item.errand) };
      return expected
        .filter((errand) => errand.date === day.date)
        .reduce((current, errand) => addErrand(current, errand, places?.[errand.round.drop] ?? null, copy), cleared);
    }),
  };
}
