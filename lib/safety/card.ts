import qrcode from "qrcode-generator";
import { formatPhone } from "./contact";
import { type HelpLanguage, HELP_PHRASES } from "./help-phrases";

// The meeting card, drawn on a canvas so it can be saved as a picture or a PDF and printed. It carries only what
// stays true for the whole trip: the member's name, the numbers to call, the request for help in the language of
// the place and in English, and a code that opens the finder's page.

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 1800;

export type CardContent = {
  name: string;
  leadPhone: string;
  secondaryPhone: string | null;
  languages: HelpLanguage[];
  /** The address the code opens. */
  url: string;
  title: string;
};

const MARGIN = 96;
const BAND_HEIGHT = 200;
const STUB_HEIGHT = 520;
const QR_SIZE = 360;
// A card is read by a stranger in a hurry, so it shows the local language and English, not every language.
const MAX_LANGUAGES = 2;
const RTL: HelpLanguage[] = ["ar"];

// A printed card is always light, whatever theme the screen is in, so it reads the palette's fixed steps.
function readInk() {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return {
    primary: read("--color-primary-700"),
    text: read("--color-neutral-900"),
    muted: read("--color-neutral-600"),
    line: read("--color-neutral-200"),
    tint: read("--color-primary-50"),
    accent: read("--color-accent-300"),
    paper: "#ffffff",
    heading: read("--font-heading"),
    body: read("--font-sans"),
  };
}

function wrap(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  // Languages written without spaces break between any two characters.
  const spaced = /\s/.test(text);
  const pieces = spaced ? text.split(/\s+/) : [...text];
  const lines: string[] = [];
  let line = "";
  pieces.forEach((piece) => {
    const next = line === "" ? piece : spaced ? `${line} ${piece}` : line + piece;
    if (context.measureText(next).width <= maxWidth || line === "") line = next;
    else {
      lines.push(line);
      line = piece;
    }
  });
  if (line !== "") lines.push(line);
  return lines;
}

/** Draws wrapped text and answers with the y where the next block may start. */
function write(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  wrap(context, text, maxWidth).forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return y + wrap(context, text, maxWidth).length * lineHeight;
}

function drawCode(context: CanvasRenderingContext2D, url: string, x: number, y: number, size: number, ink: string) {
  const code = qrcode(0, "M");
  code.addData(url);
  code.make();
  const count = code.getModuleCount();
  const cell = size / count;
  context.fillStyle = ink;
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (code.isDark(row, column)) context.fillRect(x + column * cell, y + row * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }
}

export function drawCard(canvas: HTMLCanvasElement, content: CardContent) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const ink = readInk();
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const inner = CARD_WIDTH - MARGIN * 2;
  const languages = content.languages.slice(0, MAX_LANGUAGES);

  context.fillStyle = ink.paper;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  context.fillStyle = ink.primary;
  context.fillRect(0, 0, CARD_WIDTH, BAND_HEIGHT);
  context.fillStyle = ink.accent;
  context.fillRect(0, BAND_HEIGHT, CARD_WIDTH, 12);

  context.textBaseline = "alphabetic";
  context.fillStyle = ink.paper;
  context.font = `700 64px ${ink.heading}`;
  context.fillText("Kancara", MARGIN, 124);
  context.font = `600 36px ${ink.body}`;
  context.textAlign = "right";
  context.fillText(content.title, CARD_WIDTH - MARGIN, 120);
  context.textAlign = "left";

  let y = BAND_HEIGHT + 132;
  context.fillStyle = ink.text;
  context.font = `700 96px ${ink.heading}`;
  y = write(context, content.name, MARGIN, y, inner, 104) + 8;

  languages.forEach((language) => {
    const phrases = HELP_PHRASES[language];
    const rtl = RTL.includes(language);
    context.direction = rtl ? "rtl" : "ltr";
    context.textAlign = rtl ? "right" : "left";
    const x = rtl ? CARD_WIDTH - MARGIN : MARGIN;
    context.fillStyle = ink.text;
    context.font = `600 50px ${ink.body}`;
    y = write(context, phrases.ask, x, y + 40, inner, 64);
    context.fillStyle = ink.muted;
    context.font = `500 38px ${ink.body}`;
    y = write(context, phrases.call, x, y, inner, 52);
  });
  context.direction = "ltr";
  context.textAlign = "left";

  // The labels are for whoever reads the card, so they are in the card's languages, not the group's.
  const label = (pick: (phrases: (typeof HELP_PHRASES)[HelpLanguage]) => string) =>
    languages.map((language) => pick(HELP_PHRASES[language])).join(" · ");
  const numbers = [
    { label: label((phrases) => phrases.callLead), phone: content.leadPhone, size: 92 },
    ...(content.secondaryPhone ? [{ label: label((phrases) => phrases.callSecond), phone: content.secondaryPhone, size: 68 }] : []),
  ];
  y += 44;
  numbers.forEach(({ label, phone, size }) => {
    context.fillStyle = ink.muted;
    context.font = `600 32px ${ink.body}`;
    context.fillText(label, MARGIN, y);
    context.fillStyle = ink.primary;
    context.font = `700 ${size}px ${ink.heading}`;
    context.fillText(formatPhone(phone), MARGIN, y + size + 4);
    y += size + 64;
  });

  // The stub: a tear line, then the code beside the sentence that says what it is for.
  const stubTop = CARD_HEIGHT - STUB_HEIGHT;
  context.fillStyle = ink.tint;
  context.fillRect(0, stubTop, CARD_WIDTH, STUB_HEIGHT);
  context.strokeStyle = ink.line;
  context.lineWidth = 4;
  context.setLineDash([20, 16]);
  context.beginPath();
  context.moveTo(0, stubTop);
  context.lineTo(CARD_WIDTH, stubTop);
  context.stroke();
  context.setLineDash([]);

  const codeTop = stubTop + (STUB_HEIGHT - QR_SIZE) / 2;
  context.fillStyle = ink.paper;
  context.fillRect(MARGIN - 24, codeTop - 24, QR_SIZE + 48, QR_SIZE + 48);
  drawCode(context, content.url, MARGIN, codeTop, QR_SIZE, ink.text);

  const beside = MARGIN + QR_SIZE + 72;
  let stubY = codeTop + 44;
  context.font = `500 36px ${ink.body}`;
  context.fillStyle = ink.text;
  languages.forEach((language) => {
    const rtl = RTL.includes(language);
    context.direction = rtl ? "rtl" : "ltr";
    context.textAlign = rtl ? "right" : "left";
    stubY = write(context, HELP_PHRASES[language].scan, rtl ? CARD_WIDTH - MARGIN : beside, stubY, CARD_WIDTH - MARGIN - beside, 48) + 28;
  });
  context.direction = "ltr";
  context.textAlign = "left";
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export async function saveCardImage(canvas: HTMLCanvasElement, fileName: string): Promise<boolean> {
  const blob = await toBlob(canvas, "image/png");
  if (blob) download(blob, `${fileName}.png`);
  return blob !== null;
}

/** A one-page PDF the size of a 4 by 6 inch card, holding the card as a picture. */
export async function saveCardPdf(canvas: HTMLCanvasElement, fileName: string): Promise<boolean> {
  const blob = await toBlob(canvas, "image/jpeg", 0.92);
  if (!blob) return false;
  const image = new Uint8Array(await blob.arrayBuffer());
  const [width, height] = [288, 432];
  const encoder = new TextEncoder();
  const draw = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`;
  const objects: (string | Uint8Array)[][] = [
    ["<< /Type /Catalog /Pages 2 0 R >>"],
    ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`],
    [
      `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`,
      image,
      "\nendstream",
    ],
    [`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`],
  ];

  const parts: Uint8Array[] = [encoder.encode("%PDF-1.4\n")];
  const offsets: number[] = [];
  let length = parts[0].length;
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    parts.push(bytes);
    length += bytes.length;
  };
  objects.forEach((object, index) => {
    offsets.push(length);
    push(`${index + 1} 0 obj\n`);
    object.forEach(push);
    push("\nendobj\n");
  });
  const table = length;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.forEach((offset) => push(`${String(offset).padStart(10, "0")} 00000 n \n`));
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${table}\n%%EOF\n`);

  download(new Blob(parts as BlobPart[], { type: "application/pdf" }), `${fileName}.pdf`);
  return true;
}
