import { MESSAGES } from "@/lib/messages";
import { type NeedKey, fillTemplate, listTripDates, NEED_CATEGORIES } from "@/lib/plan-draft";
import type { BackupKind, CaptainClient, ItineraryCover, ItineraryItem } from "@/lib/client/captain";

const MAX_SAMPLE_DAYS = 7;
const MEAL_NEEDS: NeedKey[] = [...NEED_CATEGORIES.diet];
const WALK_NEEDS: NeedKey[] = [...NEED_CATEGORIES.mobility, ...NEED_CATEGORIES.other];
const REST_NEEDS: NeedKey[] = [...NEED_CATEGORIES.rest];
const QUIET_NEEDS: NeedKey[] = [...NEED_CATEGORIES.sensory];

type SlotKey = "arrive" | "morning" | "lunch" | "rest" | "afternoon" | "dinner" | "evening" | "depart";

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

export const sampleCaptain: CaptainClient = {
  async itinerary({ draft, locale }, signal) {
    await wait(1400, signal);
    const templates = MESSAGES[locale].plan.sample.itinerary;
    const dates = listTripDates(draft, MAX_SAMPLE_DAYS);
    const names = { origin: draft.origin.trim(), destination: draft.destinations[0] ?? "" };
    const someoneNeeds = (needs: NeedKey[]) =>
      draft.members.some((member) => needs.some((need) => member.needs.includes(need)));
    const needsRest = someoneNeeds(REST_NEEDS) || draft.pace === "relaxed";

    const buildItem = (time: string, slot: SlotKey, related: NeedKey[], fallbacks: BackupKind[] = []): ItineraryItem => {
      const covers = related.flatMap((need): ItineraryCover[] => {
        const memberIds = draft.members
          .filter((member) => member.needs.includes(need))
          .map((member) => member.id);
        return memberIds.length > 0 ? [{ need, memberIds }] : [];
      });
      const notes = covers.map((cover) => templates.notes[cover.need]).join(" ");
      return {
        time,
        title: fillTemplate(templates[slot].title, names),
        detail: notes || templates[slot].detail,
        covers,
        backups: fallbacks.map((kind) => ({
          kind,
          title: fillTemplate(templates.backups[kind].title, names),
          detail: templates.backups[kind].detail,
          covers: [],
        })),
      };
    };

    const days = dates.map((date, index) => {
      const isFirst = index === 0;
      const isLast = index === dates.length - 1 && dates.length > 1;
      const opening = isFirst
        ? buildItem(draft.extras.arrivalTime || "10:00", "arrive", WALK_NEEDS, ["rest"])
        : buildItem(draft.extras.dayStart || "09:00", "morning", [...WALK_NEEDS, ...QUIET_NEEDS], ["rain", "rest"]);
      const items = [opening, buildItem("12:00", "lunch", MEAL_NEEDS, ["meal"])];
      if (isLast) {
        items.push(buildItem(draft.extras.departureTime || "15:00", "depart", WALK_NEEDS));
        return { date, items };
      }
      const midday = needsRest
        ? buildItem("14:00", "rest", REST_NEEDS)
        : buildItem("14:30", "afternoon", WALK_NEEDS, ["rain", "rest"]);
      items.push(midday, buildItem("18:30", "dinner", MEAL_NEEDS, ["meal"]));
      if (draft.pace === "packed") items.push(buildItem("20:00", "evening", QUIET_NEEDS, ["rain"]));
      return { date, items };
    });

    return { days };
  },

  // The sample Captain reads nothing, so it has nothing to add; the list still stands on its fixed rules.
  async packing(_request, signal) {
    await wait(600, signal);
    return [];
  },
};
