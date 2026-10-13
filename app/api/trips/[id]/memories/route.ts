import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { rateLimit } from "@/lib/rate-limit";
import { addTripMemory, deleteTripMemory, getTripSummaryData } from "@/lib/trips/memories";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10MB

const KINDS = [
  { extension: "png", type: "image/png", matches: (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { extension: "jpg", type: "image/jpeg", matches: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    extension: "webp",
    type: "image/webp",
    matches: (b: Uint8Array) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, "trips-memories-read");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await getTripSummaryData(viewer, id);
  if (!data) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, "trips-memories-save");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const form = await request.formData();
    const placeTitle = form.get("placeTitle")?.toString() || "";
    const dayNumber = Number(form.get("dayNumber")) || 1;
    const note = form.get("note")?.toString() || "";
    const rating = Number(form.get("rating")) || 5;
    const authorName = form.get("authorName")?.toString() || undefined;

    if (!placeTitle.trim()) {
      return NextResponse.json({ error: "Nama tempat/destinasi wajib diisi" }, { status: 400 });
    }

    const photoFile = form.get("photo");
    let photoPayload: { buffer: ArrayBuffer; extension: string; mimeType: string } | undefined = undefined;

    if (photoFile instanceof File && photoFile.size > 0) {
      if (photoFile.size > MAX_PHOTO_BYTES) {
        return NextResponse.json({ error: "Ukuran foto maksimal 10MB" }, { status: 413 });
      }
      const buffer = await photoFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const matched = KINDS.find((k) => k.matches(bytes));
      if (!matched) {
        return NextResponse.json({ error: "Format foto harus JPG, PNG, atau WebP" }, { status: 415 });
      }
      photoPayload = {
        buffer,
        extension: matched.extension,
        mimeType: matched.type,
      };
    }

    const memory = await addTripMemory(
      viewer,
      id,
      { placeTitle, dayNumber, note, rating, authorName },
      photoPayload,
    );

    if (!memory) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    return NextResponse.json(memory, { status: 201 });
  } catch (err) {
    console.error("Error creating trip memory:", err);
    return NextResponse.json({ error: "Gagal menyimpan momen" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, "trips-memories-delete");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const memoryId = request.nextUrl.searchParams.get("memoryId");
  if (!memoryId) {
    return NextResponse.json({ error: "memoryId wajib disertakan" }, { status: 400 });
  }

  const deleted = await deleteTripMemory(viewer, id, memoryId);
  if (!deleted) {
    return NextResponse.json({ error: "Momen tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
