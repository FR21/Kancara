import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { type DietMember, analyzeMenuPhoto } from "@/lib/agents/dietaryAgent";
import { MAX_PHOTO_BYTES } from "@/lib/client/dietary-scan";
import { isLocale } from "@/lib/locale";
import { MESSAGES } from "@/lib/messages";
import { NEED_CATEGORIES } from "@/lib/plan-draft";
import { rateLimit } from "@/lib/rate-limit";
import { getTripPlan } from "@/lib/trips/store";

// Reading a photo is a model call that can take a while.
export const maxDuration = 45;

/** The photo's real type, read from its first bytes rather than trusted from the upload. */
function sniffImageType(bytes: Uint8Array): string | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...Array.from(bytes.subarray(start, end)));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && ["heic", "heix", "mif1", "msf1", "heif"].includes(ascii(8, 12))) return "image/heic";
  return null;
}

/** Reads a menu photo against the trip's members: form data with `tripId`, `locale`, and `image`. */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "dietary-scan");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const tripId = form?.get("tripId");
  const locale = form?.get("locale");
  const image = form?.get("image");
  if (typeof tripId !== "string" || !isLocale(locale)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (!(image instanceof Blob)) return NextResponse.json({ error: "No photo was sent" }, { status: 400 });
  if (image.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: "The photo is too large" }, { status: 413 });

  const bytes = new Uint8Array(await image.arrayBuffer());
  const mimeType = sniffImageType(bytes);
  if (!mimeType) return NextResponse.json({ error: "The file is not a photo" }, { status: 415 });

  const plan = await getTripPlan(viewer, tripId);
  if (!plan) return NextResponse.json({ error: "This trip was not found" }, { status: 404 });

  const needLabels = MESSAGES[locale].plan.needs;
  const dietNeeds: readonly string[] = NEED_CATEGORIES.diet;
  const members: DietMember[] = plan.draft.members
    .map((member) => ({
      id: member.id,
      restrictions: [
        ...member.needs.filter((need) => dietNeeds.includes(need)).map((need) => needLabels[need]),
        ...member.customNeeds,
        member.allergies,
      ]
        .map((entry) => entry.trim())
        .filter(Boolean),
    }))
    .filter((member) => member.restrictions.length > 0);
  const destination = plan.card.destinations.filter(Boolean).join(", ");

  try {
    const analysis = await analyzeMenuPhoto({ base64: Buffer.from(bytes).toString("base64"), mimeType }, members, destination, locale);
    return NextResponse.json(analysis);
  } catch (caught) {
    console.error("Menu photo could not be read", { tripId, error: caught instanceof Error ? caught.message : caught });
    return NextResponse.json({ error: "The photo could not be read. Try again." }, { status: 502 });
  }
}
