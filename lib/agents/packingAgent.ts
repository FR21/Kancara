import "server-only";
import { GoogleGenAI } from "@google/genai";
import { parseItinerary } from "@/lib/api/captain";
import { MESSAGES } from "@/lib/messages";
import {
  type CaptainPackingItem,
  type PlanDraft,
  getMemberName,
  MAX_CAPTAIN_PACKING,
  parseCaptainPacking,
  parsePlanDraft,
} from "@/lib/plan-draft";
import type { Locale } from "@/lib/locale";
import { parseWeather } from "@/lib/weather";

const client = new GoogleGenAI({});

const MODEL = "gemini-3.5-flash-lite";
const MAX_KNOWN = 80;
const MAX_KNOWN_CHARS = 100;
const MAX_STOPS = 40;

const INSTRUCTION = `You are Captain, the packing assistant of Kancara, a planner for group trips where members have different needs.
The group already has a base packing list, given as "alreadyListed". Read what the group wrote in their own words and what is planned, then add ONLY what is still missing and specific to it: a stated allergy or condition, a need they typed themselves, a baby or elderly detail, an occasion, a place or activity on the itinerary, an unusual way of getting around.

Rules:
- At most ${MAX_CAPTAIN_PACKING} items. Fewer is better. If nothing specific is missing, return an empty list.
- Every need or condition a member typed in their own words gets one item, unless the list already covers it.
- An item is for whoever will use it. A surprise or a gift for one member is for the whole group to carry.
- "label": the object itself in at most 6 words. Never an instruction, never something already on the list or a rewording of it.
- "memberId": the id of the one member it is for, copied exactly, or an empty string when it is for the whole group.
- "reason": at most 14 words in sentence case that start by naming where it comes from, a member's own note or the plan, then quote it. For example "From Nenek's note: blood sugar checked every morning" or "From the itinerary: a morning at the water park". It reports what the group wrote; it is never your own advice.
- "essential": true only when forgetting it could harm someone's health or stop the trip.
- Never give medical advice, never name a drug or a dose. For medicine, say to bring what their own doctor prescribed.`;

function readStrings(value: unknown, limit: number, maxChars: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "")
    .map((entry) => entry.trim().slice(0, maxChars))
    .slice(0, limit);
}

function readStops(value: unknown): string[] {
  try {
    return parseItinerary(value)
      .days.flatMap((day) => day.items.map((item) => item.title))
      .slice(0, MAX_STOPS);
  } catch {
    return [];
  }
}

function describe(draft: PlanDraft, locale: Locale) {
  const labels = MESSAGES[locale].plan;
  return {
    route: { from: draft.origin, to: draft.destinations, startDate: draft.startDate, endDate: draft.endDate },
    members: draft.members.map((member) => ({
      id: member.id,
      name: getMemberName(member, draft.members, labels.ageGroups),
      ageGroup: labels.ageGroups[member.ageGroup],
      age: member.age,
      needs: [...member.needs.map((need) => labels.needs[need]), ...member.customNeeds],
      allergies: member.allergies,
      wishes: [
        ...Object.keys(member.interests).map((interest) => labels.interests[interest as keyof typeof labels.interests]),
        ...member.customInterests.map((wish) => wish.label),
      ],
    })),
    notes: draft.notes,
    mustVisit: draft.extras.mustVisit,
    occasion: draft.extras.occasion,
    lodging: draft.extras.lodging,
    transport: [...draft.extras.transport.map((transport) => labels.transport[transport]), ...draft.extras.customTransport],
  };
}

/**
 * What Captain adds to a group's packing list after reading the parts fixed rules cannot: free text and the
 * itinerary. Items come back without an id; a member Captain names who is not in the group becomes "everyone".
 */
export async function suggestPacking(body: unknown): Promise<Omit<CaptainPackingItem, "id">[]> {
  const request = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const draft = parsePlanDraft(request.draft);
  if (!draft) return [];
  const locale: Locale = request.locale === "en" ? "en" : "id";
  const input = {
    trip: describe(draft, locale),
    weather: parseWeather(request.weather)?.places ?? [],
    itineraryStops: readStops(request.itinerary),
    alreadyListed: readStrings(request.known, MAX_KNOWN, MAX_KNOWN_CHARS),
  };

  const interaction = await client.interactions.create({
    model: MODEL,
    system_instruction: `${INSTRUCTION}\nWrite every label and reason in ${locale === "en" ? "ENGLISH" : "INDONESIAN"}.`,
    input: JSON.stringify(input, null, 2),
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                memberId: { type: "string" },
                reason: { type: "string" },
                essential: { type: "boolean" },
              },
              required: ["label", "memberId", "reason", "essential"],
            },
          },
        },
        required: ["items"],
      },
    },
  });

  const reply: unknown = JSON.parse(interaction.output_text || "{}");
  const listed = typeof reply === "object" && reply !== null ? (reply as { items?: unknown }).items : [];
  const memberIds = new Set(draft.members.map((member) => member.id));
  const withIds = Array.isArray(listed) ? listed.map((item, index) => ({ ...item, id: `captain:${index}` })) : [];
  const sentence = (words: string) => words.charAt(0).toLocaleUpperCase(locale) + words.slice(1);
  return parseCaptainPacking(withIds).map(({ label, memberId, reason, essential }) => ({
    label: sentence(label),
    memberId: memberId !== null && memberIds.has(memberId) ? memberId : null,
    reason: sentence(reason),
    essential,
  }));
}
