import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { rateLimit } from "@/lib/rate-limit";
import { addTripExpense, deleteTripExpense } from "@/lib/trips/memories";

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024; // 10MB

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, "trips-expenses-save");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const contentType = request.headers.get("content-type") || "";
    let title = "";
    let amount = 0;
    let paidBy = "";
    let sharedBy: string[] = [];
    let receiptPayload: { buffer: ArrayBuffer; extension: string; mimeType: string } | undefined = undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      title = form.get("title")?.toString() || "";
      amount = Number(form.get("amount")) || 0;
      paidBy = form.get("paidBy")?.toString() || "";
      const rawShared = form.get("sharedBy")?.toString();
      if (rawShared) {
        try {
          sharedBy = JSON.parse(rawShared);
        } catch {
          sharedBy = rawShared.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }

      const receiptFile = form.get("receipt");
      if (receiptFile instanceof File && receiptFile.size > 0) {
        if (receiptFile.size > MAX_RECEIPT_BYTES) {
          return NextResponse.json({ error: "Ukuran bukti struk maksimal 10MB" }, { status: 413 });
        }
        const buffer = await receiptFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const matched = KINDS.find((k) => k.matches(bytes));
        if (!matched) {
          return NextResponse.json({ error: "Format struk harus JPG, PNG, atau WebP" }, { status: 415 });
        }
        receiptPayload = {
          buffer,
          extension: matched.extension,
          mimeType: matched.type,
        };
      }
    } else {
      const body = await request.json();
      title = body.title || "";
      amount = Number(body.amount) || 0;
      paidBy = body.paidBy || "";
      sharedBy = Array.isArray(body.sharedBy) ? body.sharedBy : [];
    }

    if (!title.trim() || amount <= 0) {
      return NextResponse.json({ error: "Judul pengeluaran dan jumlah nominal wajib valid" }, { status: 400 });
    }

    const expense = await addTripExpense(
      viewer,
      id,
      { title, amount, paidBy, sharedBy },
      receiptPayload,
    );

    if (!expense) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error("Error creating trip expense:", err);
    return NextResponse.json({ error: "Gagal menyimpan pengeluaran" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, "trips-expenses-delete");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const expenseId = request.nextUrl.searchParams.get("expenseId");
  if (!expenseId) {
    return NextResponse.json({ error: "expenseId wajib disertakan" }, { status: 400 });
  }

  const deleted = await deleteTripExpense(viewer, id, expenseId);
  if (!deleted) {
    return NextResponse.json({ error: "Pengeluaran tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
