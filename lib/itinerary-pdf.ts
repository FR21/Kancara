// The itinerary as a PDF to keep or print: one table per day. The PDF library is loaded only when the visitor asks
// for the file, so the page itself stays light.

import type { Itinerary, ItineraryItem } from "@/lib/client/captain";
import type { Messages } from "@/lib/messages";
import { fillTemplate, parseLocalDate } from "@/lib/plan-draft";
import { splitTime } from "@/lib/stop-time";

type PdfInput = {
  itinerary: Itinerary;
  destination: string;
  text: Messages["plan"]["itinerary"];
  needLabels: Messages["plan"]["needs"];
  locale: string;
};

const MARGIN = 40;
// The brand teal (primary-700) and the near-black teal of the text, as the PDF wants them.
const PRIMARY: [number, number, number] = [3, 93, 96];
const INK: [number, number, number] = [8, 20, 21];
const MUTED: [number, number, number] = [92, 107, 108];
// Characters the PDF's built-in font can draw beyond Latin-1 (it uses the Windows-1252 set).
const DRAWABLE = "–—…‘’“”•€™";

/** Text the built-in font can draw: arrows become "-", anything else it lacks is left out rather than garbled. */
function drawable(value: string): string {
  return [...value.replace(/→/g, "-").replace(/\s+/g, " ")]
    .filter((character) => (character.codePointAt(0) ?? 0) <= 0xff || DRAWABLE.includes(character))
    .join("")
    .trim();
}

function needsLine(item: ItineraryItem, input: PdfInput): string {
  const partly = new Set((item.violations ?? []).map((violation) => violation.need));
  const met = item.covers.filter((cover) => !partly.has(cover.need)).map((cover) => input.needLabels[cover.need]);
  const short = [...partly].map((need) => fillTemplate(input.text.timeline.needPartly, { need: input.needLabels[need] }));
  return [...met, ...short].join(", ");
}

function rowOf(item: ItineraryItem, index: number, input: PdfInput): string[] {
  const { start, end } = splitTime(item.time);
  const kind = item.errand ? input.text.errands[item.errand] : input.text.timeline.categories[item.category ?? "other"];
  const travel = item.travelToNext
    ? fillTemplate(input.text.timeline.travelCar, { duration: item.travelToNext.duration, distance: item.travelToNext.distance })
    : "";
  return [
    String(index + 1),
    end ? `${start}–${end}` : start,
    item.address ? `${item.title}\n${item.address}` : item.title,
    [kind, item.priceLevel].filter(Boolean).join(" · "),
    needsLine(item, input),
    item.rating !== undefined ? item.rating.toFixed(1) : "",
    travel,
  ].map(drawable);
}

/** Builds the itinerary PDF and hands it to the browser as a download named after the destination. */
export async function downloadItineraryPdf(input: PdfInput): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const { itinerary, destination, text, locale } = input;
  const words = text.pdf;
  const document = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = document.internal.pageSize.getWidth();
  const longDate = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const shortDate = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });
  const first = itinerary.days[0];
  const last = itinerary.days[itinerary.days.length - 1];

  document.setFont("helvetica", "bold");
  document.setFontSize(20);
  document.setTextColor(...INK);
  document.text(drawable(fillTemplate(text.title, { destination })), MARGIN, MARGIN + 12);
  if (first && last) {
    document.setFont("helvetica", "normal");
    document.setFontSize(11);
    document.setTextColor(...MUTED);
    const range = fillTemplate(words.dates, { from: shortDate.format(parseLocalDate(first.date)), to: shortDate.format(parseLocalDate(last.date)) });
    document.text(drawable(range), MARGIN, MARGIN + 32);
  }

  let cursor = MARGIN + 60;
  itinerary.days.forEach((day, dayIndex) => {
    const heading = fillTemplate(text.timeline.dayHeading, {
      day: fillTemplate(text.day, { number: dayIndex + 1 }),
      date: longDate.format(parseLocalDate(day.date)),
    });
    autoTable(document, {
      startY: cursor,
      margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: MARGIN + 16 },
      head: [
        [{ content: drawable(heading), colSpan: 7, styles: { fillColor: [255, 255, 255], textColor: INK, fontSize: 12, fontStyle: "bold", cellPadding: { top: 4, bottom: 8, left: 0, right: 0 } } }],
        [words.columns.number, words.columns.time, words.columns.place, words.columns.kind, words.columns.needs, words.columns.rating, words.columns.next].map(drawable),
      ],
      body: day.items.length > 0 ? day.items.map((item, index) => rowOf(item, index, input)) : [[{ content: drawable(text.emptyDay), colSpan: 7 }]],
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: INK, lineColor: [221, 228, 228], lineWidth: 0.5, valign: "top", overflow: "linebreak" },
      headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 22, halign: "right" },
        1: { cellWidth: 62 },
        2: { cellWidth: 140 },
        5: { cellWidth: 38, halign: "right" },
      },
    });
    cursor = (document as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  });

  const pages = document.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    document.setPage(page);
    document.setFont("helvetica", "normal");
    document.setFontSize(8);
    document.setTextColor(...MUTED);
    const footer = drawable(fillTemplate(words.footer, { page, total: pages }));
    document.text(footer, pageWidth - MARGIN, document.internal.pageSize.getHeight() - MARGIN / 2, { align: "right" });
  }

  const slug = destination
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  document.save(`itinerary-${slug || "kancara"}${first ? `-${first.date}` : ""}.pdf`);
}
