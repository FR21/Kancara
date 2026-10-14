// The field pass: one card a group carries into the destination, with what they need to say or show when there
// is no connection and no shared language. It is written once per trip and language, kept in the database for
// the whole group, and read back on each phone from the copy the service worker keeps.

export const FIELD_PHRASE_IDS = ["bill", "toilet", "address", "help"] as const;
export type FieldPhraseId = (typeof FIELD_PHRASE_IDS)[number];

/** A short sentence in the destination's language, with its meaning in the reader's language. */
export type FieldPhrase = { id: FieldPhraseId; label: string; localText: string; romanized: string };

/** Where the group stays, written out for a taxi driver. Only present when the plan names a place to stay. */
export type FieldPassLodging = { name: string; address: string; localName: string; localAddress: string };

/** The card for restaurant staff. Only present when somebody in the group has a food restriction. */
export type FieldPassDietary = { badges: string[]; localText: string; romanized: string; explanation: string };

export type FieldPassEmergency = {
  police: string;
  ambulance: string;
  /** The nearest Indonesian embassy or consulate. */
  missionName: string;
  missionPhone: string;
  missionAddress: string;
};

export type FieldPass = {
  destination: string;
  countryName: string;
  languageName: string;
  /** BCP-47 tag of the destination's language, used to pick the voice that reads the phrases aloud. */
  languageTag: string;
  memberCount: number;
  lodging: FieldPassLodging | null;
  dietary: FieldPassDietary | null;
  phrases: FieldPhrase[];
  emergency: FieldPassEmergency;
};

/** A pass as the group shares it: what it says and when it was written. */
export type SharedFieldPass = { pass: FieldPass; generatedAt: string };

const MAX_TEXT = 600;
const MAX_BADGES = 6;
const LANGUAGE_TAG = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : "";
}

function parseLodging(value: unknown): FieldPassLodging | null {
  if (!isRecord(value)) return null;
  const lodging = {
    name: readText(value.name),
    address: readText(value.address),
    localName: readText(value.localName),
    localAddress: readText(value.localAddress),
  };
  return lodging.name ? lodging : null;
}

function parseDietary(value: unknown): FieldPassDietary | null {
  if (!isRecord(value)) return null;
  const localText = readText(value.localText);
  if (!localText) return null;
  const badges = Array.isArray(value.badges) ? value.badges.map(readText).filter(Boolean).slice(0, MAX_BADGES) : [];
  return { badges, localText, romanized: readText(value.romanized), explanation: readText(value.explanation) };
}

function parsePhrases(value: unknown): FieldPhrase[] {
  if (!Array.isArray(value)) return [];
  return FIELD_PHRASE_IDS.flatMap((id) => {
    const found = value.find((entry) => isRecord(entry) && entry.id === id);
    if (!isRecord(found)) return [];
    const phrase = { id, label: readText(found.label), localText: readText(found.localText), romanized: readText(found.romanized) };
    return phrase.label && phrase.localText ? [phrase] : [];
  });
}

function parseEmergency(value: unknown): FieldPassEmergency | null {
  if (!isRecord(value)) return null;
  const emergency = {
    police: readText(value.police),
    ambulance: readText(value.ambulance),
    missionName: readText(value.missionName),
    missionPhone: readText(value.missionPhone),
    missionAddress: readText(value.missionAddress),
  };
  return emergency.police && emergency.ambulance ? emergency : null;
}

/** A pass read from anywhere it can arrive from (the model, the database, the network), or null when it is not one. */
export function parseFieldPass(value: unknown): FieldPass | null {
  if (!isRecord(value)) return null;
  const languageTag = readText(value.languageTag);
  const emergency = parseEmergency(value.emergency);
  const phrases = parsePhrases(value.phrases);
  if (!LANGUAGE_TAG.test(languageTag) || !emergency || phrases.length === 0) return null;
  const memberCount = typeof value.memberCount === "number" && Number.isInteger(value.memberCount) ? value.memberCount : 1;
  return {
    destination: readText(value.destination),
    countryName: readText(value.countryName),
    languageName: readText(value.languageName),
    languageTag,
    memberCount: Math.max(1, memberCount),
    lodging: parseLodging(value.lodging),
    dietary: parseDietary(value.dietary),
    phrases,
    emergency,
  };
}

export function parseSharedFieldPass(value: unknown): SharedFieldPass | null {
  if (!isRecord(value) || typeof value.generatedAt !== "string") return null;
  const pass = parseFieldPass(value.pass);
  return pass ? { pass, generatedAt: value.generatedAt } : null;
}
