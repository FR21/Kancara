// Reaching a person by the number the group has for them: the number's form, and the links a phone already
// understands (a call, a text, a WhatsApp chat). No paid service stands between the group and the call.

const E164 = /^\+[1-9]\d{7,14}$/;
export const MAX_PHONE_CHARS = 20;

/**
 * A typed number in international form (+6281234567890), or null when it cannot be one. Spaces, dashes, and
 * brackets are dropped. A number that starts with one 0 is read as Indonesian, since that is how it is written
 * at home.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.trim().replace(/[\s\-().]/g, "");
  let phone = digits;
  if (digits.startsWith("00")) phone = `+${digits.slice(2)}`;
  else if (digits.startsWith("0")) phone = `+62${digits.slice(1)}`;
  else if (!digits.startsWith("+")) phone = `+${digits}`;
  return E164.test(phone) ? phone : null;
}

// Calling codes are one, two, or three digits long. These are the one- and two-digit ones; every other is three.
const ONE_DIGIT_CODES = ["1", "7"];
const TWO_DIGIT_CODES = [
  "20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41", "43", "44", "45", "46", "47", "48", "49", "51", "52",
  "53", "54", "55", "56", "57", "58", "60", "61", "62", "63", "64", "65", "66", "81", "82", "84", "86", "90", "91", "92",
  "93", "94", "95", "98",
];

/** +62 812 3456 7890: the same number in groups, easier to read off a card or to a stranger. */
export function formatPhone(phone: string): string {
  if (!E164.test(phone)) return phone;
  const digits = phone.slice(1);
  const codeLength = ONE_DIGIT_CODES.includes(digits[0]) ? 1 : TWO_DIGIT_CODES.includes(digits.slice(0, 2)) ? 2 : 3;
  const rest = digits.slice(codeLength);
  // After a leading group of three the rest is cut into even groups of four at most, so none is left with one digit.
  const tail = rest.slice(3);
  const size = tail.length === 0 ? 1 : Math.ceil(tail.length / Math.ceil(tail.length / 4));
  const groups = tail.match(new RegExp(`.{1,${size}}`, "g")) ?? [];
  return [`+${digits.slice(0, codeLength)}`, rest.slice(0, 3), ...groups].join(" ");
}

export function callLink(phone: string): string {
  return `tel:${phone}`;
}

export function textLink(phone: string, message: string): string {
  return `sms:${phone}?body=${encodeURIComponent(message)}`;
}

export function whatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(message)}`;
}

export type Coordinates = { latitude: number; longitude: number };

const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Metres between two points on the ground, as the crow flies. */
export function distanceBetween(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** The compass bearing to walk from one point to another, in degrees clockwise from north. */
export function bearingBetween(from: Coordinates, to: Coordinates): number {
  const dLon = toRadians(to.longitude - from.longitude);
  const y = Math.sin(dLon) * Math.cos(toRadians(to.latitude));
  const x =
    Math.cos(toRadians(from.latitude)) * Math.sin(toRadians(to.latitude)) -
    Math.sin(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export const COMPASS_POINTS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;
export type CompassPoint = (typeof COMPASS_POINTS)[number];

export function compassPoint(bearing: number): CompassPoint {
  return COMPASS_POINTS[Math.round(bearing / 45) % COMPASS_POINTS.length];
}

/** A link that opens a point in the phone's map app. */
export function mapLink(point: Coordinates): string {
  return `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`;
}
