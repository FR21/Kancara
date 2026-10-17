// What kind of place an itinerary stop is, read from the place types Google Places returns. Shared by the planner
// (server), which stores the category on the stop, and the schedule (browser), which names it and draws its icon.

export const PLACE_CATEGORIES = [
  "meal",
  "cafe",
  "attraction",
  "museum",
  "nature",
  "shopping",
  "worship",
  "lodging",
  "transport",
  "other",
] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

// Checked in this order, so the most telling type wins: a museum café is a museum, a mall food court a meal.
const TYPE_CATEGORIES: [PlaceCategory, string[]][] = [
  ["museum", ["museum", "art_gallery", "historical_landmark", "cultural_landmark"]],
  ["worship", ["mosque", "church", "hindu_temple", "buddhist_temple", "place_of_worship", "synagogue"]],
  ["nature", ["park", "national_park", "beach", "hiking_area", "garden", "botanical_garden", "zoo", "aquarium", "lake"]],
  ["attraction", ["tourist_attraction", "amusement_park", "water_park", "theme_park", "landmark", "point_of_interest_monument"]],
  ["cafe", ["cafe", "coffee_shop", "bakery", "tea_house", "dessert_shop", "ice_cream_shop"]],
  ["meal", ["restaurant", "food", "meal_takeaway", "food_court", "fast_food_restaurant"]],
  ["shopping", ["shopping_mall", "market", "store", "department_store", "clothing_store", "souvenir_store"]],
  ["lodging", ["lodging", "hotel", "resort_hotel", "guest_house", "hostel"]],
  ["transport", ["airport", "train_station", "bus_station", "transit_station", "subway_station", "ferry_terminal"]],
];

export function isPlaceCategory(value: unknown): value is PlaceCategory {
  return PLACE_CATEGORIES.some((category) => category === value);
}

/** The stop's category from Google's place types, or "other" when none of them is telling. */
export function categoryFromTypes(types: unknown): PlaceCategory {
  if (!Array.isArray(types)) return "other";
  const known = new Set(types.filter((type): type is string => typeof type === "string"));
  const match = TYPE_CATEGORIES.find(([, names]) => names.some((name) => known.has(name)));
  return match ? match[0] : "other";
}

/**
 * Infers a place category from its title when Google Places types are missing or general ("other").
 */
export function inferCategoryFromTitle(title?: string): PlaceCategory {
  if (!title) return "other";
  const lower = title.toLowerCase();

  if (/\b(museum|gallery|galeri|monument|monumen|memorial|science center|science centre|miraikan|planetarium|art center|art centre)\b/i.test(lower)) return "museum";
  if (/\b(mosque|masjid|musholla|church|gereja|temple|kuil|candi|synagogue|shrine|klenteng|pagoda|katedral|cathedral)\b/i.test(lower)) return "worship";
  if (/\b(park|taman|beach|pantai|garden|kebun|zoo|aquarium|lake|danau|waterfall|curug|mountain|gunung|forest|hutan|bukit|hill|nature|cliff)\b/i.test(lower)) return "nature";
  if (/\b(cafe|café|coffee|kopi|bakery|bakehouse|tea house|teahouse|dessert|ice cream|gelato)\b/i.test(lower)) return "cafe";
  if (/\b(restaurant|restoran|resto|makan|food|dining|bistro|eatery|warung|kuliner|ramen|sushi|seafood|grill|bbq|steak|diner|kitchen|kedai)\b/i.test(lower)) return "meal";
  if (/\b(mall|plaza|market|pasar|supermarket|department store|outlet|shopping|boutique|toko)\b/i.test(lower)) return "shopping";
  if (/\b(hotel|resort|villa|hostel|inn|guest house|guesthouse|homestay|cottage|ryokan|stay)\b/i.test(lower)) return "lodging";
  if (/\b(station|stasiun|airport|bandara|terminal|harbor|harbour|pelabuhan|transit|subway|metro|ferry|port)\b/i.test(lower)) return "transport";
  if (/\b(tower|menara|castle|istana|palace|theme park|waterpark|safari|amusement|observation deck|skytree|bridge|jembatan)\b/i.test(lower)) return "attraction";

  return "other";
}

/** Resolves category with fallback to title-based inference if category is undefined or "other". */
export function resolveEffectiveCategory(category?: PlaceCategory, title?: string): PlaceCategory {
  if (category && category !== "other") return category;
  return title ? inferCategoryFromTitle(title) : (category ?? "other");
}

// A Places photo is fetched with the server's key; the browser only ever sees this app's own address for it.
const PHOTO_NAME = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

export function isPlacePhotoName(value: string): boolean {
  return PHOTO_NAME.test(value);
}

/** This app's address for a Places photo, so the key that fetches it never leaves the server. */
export function placePhotoUrl(photoName: string): string {
  return `/api/place-photo?name=${encodeURIComponent(photoName)}`;
}

/** URL for searching and serving a place photo on-demand by place query. */
export function placePhotoQueryUrl(query: string): string {
  return `/api/place-photo?query=${encodeURIComponent(query.trim())}`;
}

/**
 * The photo URL a stop may show. Plans saved before the photos went through the server hold Google's media URL with
 * the key in it; those are turned into this app's address (the key is dropped), and anything else foreign is refused.
 */
export function safePhotoUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  if (value.startsWith("/api/place-photo?")) return value;
  const legacy = value.match(/^https:\/\/places\.googleapis\.com\/v1\/(places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+)\/media/);
  return legacy && isPlacePhotoName(legacy[1]) ? placePhotoUrl(legacy[1]) : undefined;
}
