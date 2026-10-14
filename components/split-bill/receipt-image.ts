import type { Messages } from "@/lib/messages";
import { type SplitBill, transferKey } from "@/lib/split-bill/bill";
import { formatRupiah } from "@/lib/split-bill/format";
import type { BillSummary } from "@/lib/split-bill/settle-up";
import { netText } from "./bill-summary-text";

// The bill drawn as a picture to send to the group: totals, categories, each member's share, and the transfers.
// It is always light, whatever theme the screen is in, so it reads the palette's fixed steps.

const WIDTH = 900;
const SCALE = 2;
const MARGIN = 48;
const RIGHT = WIDTH - MARGIN;
const BAND = 96;
const ROW = 40;

function readInk() {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    primary: read("--color-primary-700", "#035d60"),
    text: read("--color-neutral-900", "#162324"),
    muted: read("--color-neutral-600", "#526161"),
    line: read("--color-neutral-200", "#dce7e7"),
    success: read("--color-success-700", "#15803d"),
    error: read("--color-error-700", "#b90211"),
    paper: "#ffffff",
    heading: read("--font-heading", "sans-serif"),
    body: read("--font-sans", "sans-serif"),
  };
}

/** Cuts text that does not fit, ending it with an ellipsis. */
function fit(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && context.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

function rule(context: CanvasRenderingContext2D, y: number, color: string) {
  context.fillStyle = color;
  context.fillRect(MARGIN, y, RIGHT - MARGIN, 1);
}

type ReceiptContent = { bill: SplitBill; summary: BillSummary; date: string; text: Messages["splitBill"]; locale: string };

function draw(canvas: HTMLCanvasElement, { bill, summary, date, text, locale }: ReceiptContent): boolean {
  const results = text.results;
  const money = (amount: number) => formatRupiah(amount, locale);
  const nameOf = (id: string) => bill.members.find((member) => member.id === id)?.name ?? "";
  const settledKeys = new Set(bill.settled.map(transferKey));

  const categoriesHeight = summary.categories.length > 0 ? 64 + summary.categories.length * 32 : 0;
  const membersHeight = 96 + summary.balances.length * ROW;
  const transfersHeight = 72 + Math.max(summary.transfers.length, 1) * ROW;
  const height = BAND + 160 + categoriesHeight + membersHeight + transfersHeight + 96;

  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  const context = canvas.getContext("2d");
  if (!context) return false;
  context.scale(SCALE, SCALE);
  const ink = readInk();

  context.fillStyle = ink.paper;
  context.fillRect(0, 0, WIDTH, height);
  context.fillStyle = ink.primary;
  context.fillRect(0, 0, WIDTH, BAND);
  context.fillStyle = ink.paper;
  context.font = `700 28px ${ink.heading}`;
  context.fillText(fit(context, results.receiptBrand, RIGHT - MARGIN - 200), MARGIN, 58);
  context.font = `500 16px ${ink.body}`;
  context.textAlign = "right";
  context.fillText(date, RIGHT, 56);
  context.textAlign = "left";

  let y = BAND + 56;
  const half = (RIGHT - MARGIN) / 2;
  [
    { label: results.total, value: money(summary.total), x: MARGIN, color: ink.text },
    { label: results.perPerson, value: money(summary.perPerson), x: MARGIN + half, color: ink.primary },
  ].forEach(({ label, value, x, color }) => {
    context.fillStyle = ink.muted;
    context.font = `700 14px ${ink.body}`;
    context.fillText(label.toLocaleUpperCase(locale), x, y);
    context.fillStyle = color;
    context.font = `700 36px ${ink.heading}`;
    context.fillText(fit(context, value, half - 16), x, y + 48);
  });
  y += 104;

  const heading = (label: string) => {
    rule(context, y - 8, ink.line);
    y += 32;
    context.fillStyle = ink.text;
    context.font = `700 20px ${ink.heading}`;
    context.fillText(label, MARGIN, y);
    y += 16;
  };

  if (summary.categories.length > 0) {
    heading(results.categories);
    summary.categories.forEach((entry) => {
      y += 32;
      context.fillStyle = ink.text;
      context.font = `500 16px ${ink.body}`;
      context.fillText(text.categories[entry.category], MARGIN, y);
      context.textAlign = "right";
      context.fillText(`${money(entry.amount)} · ${entry.percentage}%`, RIGHT, y);
      context.textAlign = "left";
    });
    y += 32;
  }

  heading(results.breakdownHeading);
  y += 32;
  context.fillStyle = ink.muted;
  context.font = `700 13px ${ink.body}`;
  const columns = { share: 340, paid: 540 };
  context.fillText(text.receipt.member.toLocaleUpperCase(locale), MARGIN, y);
  context.fillText(results.share.toLocaleUpperCase(locale), columns.share, y);
  context.fillText(results.paid.toLocaleUpperCase(locale), columns.paid, y);
  summary.balances.forEach((balance) => {
    y += ROW;
    context.fillStyle = ink.text;
    context.font = `600 16px ${ink.body}`;
    context.fillText(fit(context, balance.name, columns.share - MARGIN - 16), MARGIN, y);
    context.font = `500 16px ${ink.body}`;
    context.fillText(money(balance.share), columns.share, y);
    context.fillText(money(balance.paid), columns.paid, y);
    context.textAlign = "right";
    let tone = ink.muted;
    if (balance.net > 0) tone = ink.success;
    else if (balance.net < 0) tone = ink.error;
    context.fillStyle = tone;
    context.font = `700 15px ${ink.body}`;
    context.fillText(fit(context, netText(balance, results, locale), RIGHT - columns.paid - 140), RIGHT, y);
    context.textAlign = "left";
  });
  y += 48;

  heading(results.transfersHeading);
  if (summary.transfers.length === 0) {
    y += ROW;
    context.fillStyle = ink.success;
    context.font = `700 16px ${ink.body}`;
    context.fillText(results.allEven, MARGIN, y);
  }
  summary.transfers.forEach((transfer) => {
    y += ROW;
    const paid = settledKeys.has(transferKey(transfer));
    context.fillStyle = ink.text;
    context.font = `600 16px ${ink.body}`;
    const route = `${nameOf(transfer.fromMemberId)} → ${nameOf(transfer.toMemberId)}`;
    context.fillText(fit(context, route, 420), MARGIN, y);
    context.font = `700 16px ${ink.heading}`;
    context.fillText(money(transfer.amount), 500, y);
    context.textAlign = "right";
    context.fillStyle = paid ? ink.success : ink.muted;
    context.font = `700 14px ${ink.body}`;
    context.fillText(paid ? text.summary.settled : text.summary.open, RIGHT, y);
    context.textAlign = "left";
  });

  y += 56;
  rule(context, y - 24, ink.line);
  context.fillStyle = ink.muted;
  context.font = `500 13px ${ink.body}`;
  context.fillText(text.receipt.footer, MARGIN, y);
  return true;
}

const toBlob = (canvas: HTMLCanvasElement) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));

/** Draws the bill and saves it as a PNG. False when this browser could not make the picture. */
export async function saveReceiptImage(content: ReceiptContent): Promise<boolean> {
  const canvas = document.createElement("canvas");
  if (!draw(canvas, content)) return false;
  const blob = await toBlob(canvas);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${content.text.receipt.fileName}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Safari starts the download after the click returns, so the address is kept a moment longer.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
