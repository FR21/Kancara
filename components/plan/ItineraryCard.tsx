import { Check, ChevronRight, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, LifeBuoy, type LucideIcon, Snowflake, Sun, TriangleAlert } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import type { Itinerary, ItineraryCover, ItineraryDay } from "@/lib/api/captain";
import { fetchWeather } from "@/lib/api/weather";
import { countBackups, isLegCurrent, switchToBackup } from "@/lib/backups";
import type { Messages } from "@/lib/messages";
import { type Member, fillTemplate, getMemberName, parseLocalDate } from "@/lib/plan-draft";
import { splitTime, toMinutes } from "@/lib/stop-time";
import { plural } from "@/lib/trips/format";
import { useLocale } from "@/lib/use-locale";
import { useWibNow } from "@/lib/use-wib-now";
import { type Sky, type Weather, type WeatherDay, isRainy, shownSky } from "@/lib/weather";
import ItineraryStop, { type StopPhase } from "./ItineraryStop";
import StopDialog from "./StopDialog";

const SKY_ICONS: Record<Sky, LucideIcon> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  storm: CloudLightning,
  snow: Snowflake,
};

type ItineraryCardProps = {
  itinerary: Itinerary;
  destination: string;
  members: Member[];
  text: Messages["plan"];
  isSample: boolean;
  /** The day to open on, as YYYY-MM-DD. Falls back to the first day. */
  initialDate?: string;
  /** For a trip in progress: mark what is done, happening now, and up next on today's schedule. */
  live?: boolean;
  /** Receives the itinerary after a stop is switched to a backup. Absent where the plan is only read. */
  onChange?: (itinerary: Itinerary) => void;
};

const MAX_NAMES = 2;
const NEXT_KEYS = ["ArrowRight", "ArrowDown"];
const PREVIOUS_KEYS = ["ArrowLeft", "ArrowUp"];

// One tab serves both layouts: a pill in a scrolling row on a phone, a full
// row in the day column from 1024px.
const DAY_TAB =
  "inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 text-left whitespace-nowrap transition-[background-color,border-color,color,scale] duration-150 ease-out active:scale-[0.97] lg:h-auto lg:w-full lg:justify-between lg:rounded-xl lg:border-transparent lg:px-3 lg:py-3";
const DAY_TAB_ACTIVE = "border-primary bg-primary text-on-primary lg:bg-primary-subtle lg:text-text";
const DAY_TAB_IDLE = "border-border-strong text-text hover:bg-surface-muted";

// Where each stop stands against the clock. Only today's schedule gets phases;
// a stop without a readable time is left unmarked.
function readPhases(day: ItineraryDay, now: { date: string; time: string } | null): (StopPhase | null)[] {
  const minute = now && now.date === day.date ? toMinutes(now.time) : null;
  if (minute === null) return day.items.map(() => null);
  let nextFound = false;
  return day.items.map((item, index) => {
    const { start, end } = splitTime(item.time);
    const from = toMinutes(start);
    if (from === null) return null;
    const nextStart = day.items[index + 1] ? toMinutes(splitTime(day.items[index + 1].time).start) : null;
    const until = toMinutes(end) ?? nextStart ?? from;
    if (minute >= until && until > from) return "done";
    if (minute >= from) return minute < until ? "now" : "done";
    if (nextFound) return null;
    nextFound = true;
    return "next";
  });
}

function countToCheck(day: ItineraryDay): number {
  return day.items.reduce((count, item) => count + (item.violations?.length ?? 0), 0);
}

// The itinerary as a schedule: the days down the side, the chosen day's stops
// beside them in one aligned list.
export default function ItineraryCard({
  itinerary,
  destination,
  members,
  text,
  isSample,
  initialDate,
  live = false,
  onChange,
}: ItineraryCardProps) {
  const locale = useLocale();
  const baseId = useId();
  const [selected, setSelected] = useState(() =>
    Math.max(
      itinerary.days.findIndex((entry) => entry.date === initialDate),
      0,
    ),
  );
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const now = useWibNow(live);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const shortFormat = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" });
  const longFormat = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
  const dayCount = itinerary.days.length;
  const day = itinerary.days[Math.min(selected, dayCount - 1)];
  const honoured = day.items.reduce((count, item) => count + item.covers.length, 0);
  const toCheck = countToCheck(day);
  const standingBy = countBackups(day);
  const phases = readPhases(day, now);
  const dayName = (index: number) => fillTemplate(text.itinerary.day, { number: index + 1 });

  const describeCover = (cover: ItineraryCover) => {
    const covered = members.filter((member) => cover.memberIds.includes(member.id));
    if (covered.length === 0) return text.needs[cover.need];
    if (covered.length === members.length && members.length > 1) {
      return `${text.itinerary.everyone}: ${text.needs[cover.need]}`;
    }
    const names = covered.slice(0, MAX_NAMES).map((member) => getMemberName(member, members, text.ageGroups));
    const extra = covered.length > MAX_NAMES ? ` +${covered.length - MAX_NAMES}` : "";
    return `${names.join(", ")}${extra}: ${text.needs[cover.need]}`;
  };

  const [weatherMap, setWeatherMap] = useState<Map<string, WeatherDay>>(new Map());

  // Fetch weather for the destination across the trip dates
  useEffect(() => {
    if (isSample || !destination || itinerary.days.length === 0) return;
    const controller = new AbortController();
    const from = itinerary.days[0].date;
    const to = itinerary.days[itinerary.days.length - 1].date;
    const places = [destination];

    fetchWeather(places, from, to, locale, controller.signal)
      .then((weather) => {
        const map = new Map<string, WeatherDay>();
        for (const place of weather.places) {
          for (const d of place.days) {
            map.set(d.date, d);
          }
        }
        setWeatherMap(map);
      })
      .catch(() => {
        // Weather is non-blocking enhancement
      });

    return () => controller.abort();
  }, [destination, itinerary.days, isSample, locale]);

  const selectDay = (index: number) => {
    setSelected(index);
    setOpenIndex(null);
  };

  const moveTo = (index: number) => {
    const next = (index + dayCount) % dayCount;
    selectDay(next);
    const tab = tabRefs.current[next];
    tab?.scrollIntoView({ block: "nearest", inline: "center" });
    tab?.focus({ preventScroll: true });
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!NEXT_KEYS.includes(event.key) && !PREVIOUS_KEYS.includes(event.key)) return;
    event.preventDefault();
    moveTo(selected + (NEXT_KEYS.includes(event.key) ? 1 : -1));
  };

  const selectedDayWeather = weatherMap.get(day.date);
  const dayIsRainy = selectedDayWeather ? isRainy(selectedDayWeather) : false;

  return (
    <section className="overflow-clip rounded-2xl border border-border bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <h2 className="text-h3 text-text">{fillTemplate(text.itinerary.title, { destination })}</h2>
        {isSample && (
          <span className="shrink-0 rounded-full border border-border-strong px-2 py-1 text-caption font-bold text-text-muted">
            {text.itinerary.sample}
          </span>
        )}
      </header>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div
          role="tablist"
          aria-label={text.itinerary.daysLabel}
          className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3 [scrollbar-width:none] sm:px-6 lg:flex-col lg:gap-1 lg:overflow-visible lg:border-r lg:border-b-0 lg:p-3"
        >
          {itinerary.days.map((entry, index) => {
            const active = index === selected;
            const dayWeather = weatherMap.get(entry.date);
            const sky = dayWeather ? shownSky(dayWeather) : null;
            const WeatherIcon = sky ? SKY_ICONS[sky] : null;

            return (
              <button
                key={entry.date}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${index}`}
                aria-selected={active}
                aria-controls={`${baseId}-panel`}
                tabIndex={active ? 0 : -1}
                onClick={() => selectDay(index)}
                onKeyDown={handleTabKeyDown}
                className={`group/day ${DAY_TAB} ${active ? DAY_TAB_ACTIVE : DAY_TAB_IDLE}`}
              >
                {active && <Check className="size-4 shrink-0 lg:hidden" strokeWidth={3} aria-hidden="true" />}
                <span className="flex items-baseline gap-2 lg:flex-col lg:gap-0">
                  <span className="text-label lg:text-label-lg">{dayName(index)}</span>
                  <span className={`text-body-sm ${active ? "lg:text-text-muted" : "text-text-muted"}`}>
                    {shortFormat.format(parseLocalDate(entry.date))}
                  </span>
                </span>
                <span className="hidden items-center gap-2 lg:flex">
                  {WeatherIcon && dayWeather && (
                    <span
                      title={`${dayWeather.tempMin}° - ${dayWeather.tempMax}°C`}
                      className={`inline-flex items-center gap-1 text-caption tabular-nums ${active ? "text-primary" : "text-text-muted"}`}
                    >
                      <WeatherIcon className="size-4 shrink-0" aria-hidden="true" />
                      <span>{dayWeather.tempMax}°</span>
                    </span>
                  )}
                  {countToCheck(entry) > 0 && (
                    <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden="true" />
                  )}
                  <span
                    aria-hidden="true"
                    className={`flex size-6 items-center justify-center rounded-full transition-[translate] duration-200 ease-out group-hover/day:translate-x-1 ${
                      active ? "bg-primary text-on-primary" : "text-text-muted"
                    }`}
                  >
                    <ChevronRight className="size-4" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${selected}`}
          className="min-w-0 px-4 pt-5 pb-5 sm:px-6 lg:px-8 lg:pt-6 lg:pb-8"
        >
          <div key={day.date} className="motion-safe:animate-message-in">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-h3 text-text">
                {dayName(selected)} · {longFormat.format(parseLocalDate(day.date))}
              </h3>
              {selectedDayWeather && (
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-caption font-medium text-text tabular-nums">
                  {(() => {
                    const sky = shownSky(selectedDayWeather);
                    const Icon = SKY_ICONS[sky];
                    return (
                      <>
                        <Icon className="size-4 text-primary" aria-hidden="true" />
                        <span>{selectedDayWeather.tempMin}° – {selectedDayWeather.tempMax}°C</span>
                        {selectedDayWeather.rainChance !== null && selectedDayWeather.rainChance > 20 && (
                          <span className={isRainy(selectedDayWeather) ? "font-bold text-primary" : "text-text-muted"}>
                            · 🌧️ {selectedDayWeather.rainChance}%
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {dayIsRainy && selectedDayWeather && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary-subtle px-3 py-2 text-caption text-text">
                <CloudRain className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <p>
                  {fillTemplate(text.itinerary.weather.rainAlert, {
                    chance: Math.round(selectedDayWeather.rainChance ?? 50),
                  })}
                </p>
              </div>
            )}

            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-text-muted tabular-nums">
              {plural(text.itinerary.stops, day.items.length, locale)}
              {honoured > 0 && (
                <span className="inline-flex items-center gap-1 text-success">
                  <Check className="size-4 stroke-3" aria-hidden="true" />
                  {plural(text.itinerary.honoured, honoured, locale)}
                </span>
              )}
              {toCheck > 0 && (
                <span className="inline-flex items-center gap-1 text-warning">
                  <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
                  {plural(text.itinerary.toCheck, toCheck, locale)}
                </span>
              )}
              {standingBy > 0 && (
                <span className="inline-flex items-center gap-1">
                  <LifeBuoy className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  {plural(text.itinerary.backups.ready, standingBy, locale)}
                </span>
              )}
            </p>

            {day.items.length === 0 && (
              <p className="py-8 text-body-sm text-text-muted">{text.itinerary.emptyDay}</p>
            )}

            <ol className="mt-4">
              {day.items.map((item, index) => (
                <ItineraryStop
                  key={`${item.time}-${item.title}`}
                  item={item}
                  phase={phases[index]}
                  order={index}
                  isLast={index === day.items.length - 1}
                  legCurrent={isLegCurrent(item, day.items[index + 1])}
                  locale={locale}
                  text={text.itinerary}
                  describeCover={describeCover}
                  onOpen={() => setOpenIndex(index)}
                />
              ))}
            </ol>
          </div>
        </div>
      </div>

      <StopDialog
        items={day.items}
        index={openIndex}
        phases={phases}
        dayLabel={dayName(selected)}
        destination={destination}
        text={text.itinerary}
        validated={!isSample}
        describeCover={describeCover}
        onUseBackup={
          onChange && openIndex !== null
            ? (backupIndex) => onChange(switchToBackup(itinerary, day.date, openIndex, backupIndex))
            : undefined
        }
        onNavigate={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />
    </section>
  );
}
