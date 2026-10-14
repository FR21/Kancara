import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { rateLimit } from "@/lib/rate-limit";
import { isBillId, parseBill } from "@/lib/split-bill/bill";
import { deleteBill, saveBill } from "@/lib/split-bill/store";

// A full bill of 50 members and 500 expenses is well under this; anything larger is not a bill.
const MAX_BODY_CHARACTERS = 512 * 1024;

/** Saves the whole bill with this id, creating it the first time: `{ id, members, expenses, settled }`. */
export async function PUT(request: NextRequest, context: RouteContext<"/api/split-bill/[id]">) {
  const limited = rateLimit(request, "split-bill-save");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Please sign in again to save this bill." }, { status: 401 });

  const { id } = await context.params;
  if (!isBillId(id)) return NextResponse.json({ error: "This bill could not be found." }, { status: 404 });

  const text = await request.text().catch(() => "");
  if (text.length > MAX_BODY_CHARACTERS) {
    return NextResponse.json({ error: "This bill is too large to save." }, { status: 413 });
  }
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  const bill = parseBill(body);
  if (!bill || bill.id !== id) {
    return NextResponse.json({ error: "Some details of this bill are not valid." }, { status: 400 });
  }

  const result = await saveBill(viewer, bill);
  if (result === "conflict") {
    return NextResponse.json({ error: "This bill was changed somewhere else. Reload the page to continue." }, { status: 409 });
  }
  return NextResponse.json({ saved: true });
}

/** Deletes the bill with this id, so a new one can be started. */
export async function DELETE(request: NextRequest, context: RouteContext<"/api/split-bill/[id]">) {
  const limited = rateLimit(request, "split-bill-delete");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Please sign in again to change this bill." }, { status: 401 });

  const { id } = await context.params;
  const result = await deleteBill(viewer, id);
  if (result === "notFound") return NextResponse.json({ error: "This bill could not be found." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
