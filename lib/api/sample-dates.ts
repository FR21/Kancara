const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  mei: 4,
  may: 4,
  jun: 5,
  jul: 6,
  agu: 7,
  agt: 7,
  aug: 7,
  sep: 8,
  okt: 9,
  oct: 9,
  nov: 10,
  des: 11,
  dec: 11,
};

const RANGE = "(?:-|–|sampai|s\\/d|hingga|to|until|through)";
const ISO_PATTERN = /(\d{4}-\d{2}-\d{2})\D+(\d{4}-\d{2}-\d{2})/;
const SAME_MONTH_PATTERN = new RegExp(`(\\d{1,2})\\s*${RANGE}\\s*(\\d{1,2})\\s+([A-Za-z]{3,})(?:\\s+(\\d{4}))?`, "i");
const TWO_MONTH_PATTERN = new RegExp(
  `(\\d{1,2})\\s+([A-Za-z]{3,})\\s*${RANGE}\\s*(\\d{1,2})\\s+([A-Za-z]{3,})(?:\\s+(\\d{4}))?`,
  "i",
);
const MONTH_FIRST_PATTERN = new RegExp(
  `([A-Za-z]{3,})\\s+(\\d{1,2})\\s*${RANGE}\\s*(\\d{1,2})(?:,?\\s+(\\d{4}))?`,
  "i",
);

export type DateRange = { startDate: string; endDate: string };

function monthIndex(word: string): number | null {
  return MONTHS[word.slice(0, 3).toLowerCase()] ?? null;
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function buildRange(
  startDay: number,
  startMonth: number,
  endDay: number,
  endMonth: number,
  year: number | null,
  today: Date,
): DateRange {
  const baseYear = year ?? today.getFullYear();
  let start = new Date(baseYear, startMonth, startDay);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (year === null && start < startOfToday) start = new Date(baseYear + 1, startMonth, startDay);
  const endYear = endMonth < startMonth ? start.getFullYear() + 1 : start.getFullYear();
  return { startDate: toIso(start), endDate: toIso(new Date(endYear, endMonth, endDay)) };
}

export function findDateRange(story: string, today: Date): DateRange | null {
  const iso = story.match(ISO_PATTERN);
  if (iso) return { startDate: iso[1], endDate: iso[2] };

  const twoMonth = story.match(TWO_MONTH_PATTERN);
  if (twoMonth) {
    const startMonth = monthIndex(twoMonth[2]);
    const endMonth = monthIndex(twoMonth[4]);
    if (startMonth !== null && endMonth !== null) {
      const year = twoMonth[5] ? Number(twoMonth[5]) : null;
      return buildRange(Number(twoMonth[1]), startMonth, Number(twoMonth[3]), endMonth, year, today);
    }
  }

  const sameMonth = story.match(SAME_MONTH_PATTERN);
  if (sameMonth) {
    const month = monthIndex(sameMonth[3]);
    if (month !== null) {
      const year = sameMonth[4] ? Number(sameMonth[4]) : null;
      return buildRange(Number(sameMonth[1]), month, Number(sameMonth[2]), month, year, today);
    }
  }

  const monthFirst = story.match(MONTH_FIRST_PATTERN);
  if (monthFirst) {
    const month = monthIndex(monthFirst[1]);
    if (month !== null) {
      const year = monthFirst[4] ? Number(monthFirst[4]) : null;
      return buildRange(Number(monthFirst[2]), month, Number(monthFirst[3]), month, year, today);
    }
  }

  return null;
}
