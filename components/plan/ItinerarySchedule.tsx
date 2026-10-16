"use client";

import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, type LucideIcon, Download, Loader2, Map as MapIcon, SlidersHorizontal, ShieldAlert, ShieldCheck, Snowflake, Sun } from "lucide-react";
import { Fragment, useEffect, useId, useState } from "react";
import DayAdjustSheet, { type StopSwitch } from "@/components/plan/DayAdjustSheet";
import DayPicker from "@/components/plan/itinerary/DayPicker";
import DayMap from "@/components/plan/itinerary/DayMap";
import StopItem from "@/components/plan/itinerary/StopItem";
import { RestSlot, TravelSegment } from "@/components/plan/itinerary/TimelineGaps";
import { restAfter, restingMembers, summarize } from "@/components/plan/itinerary/timeline";
import StopBackups from "@/components/plan/StopBackups";
import StopDialog from "@/components/plan/StopDialog";
import type { StopPhase } from "@/components/plan/StopBadges";
import IconButton from "@/components/ui/IconButton";
import Sheet from "@/components/ui/Sheet";
import { BADGE, buttonClass } from "@/components/ui/styles";
import { isLegCurrent, rebuildDayStops, switchToBackup } from "@/lib/backups";
import type { BackupKind, Itinerary, ItineraryCover, ItineraryDay } from "@/lib/client/captain";
import { fetchWeather } from "@/lib/client/weather";
import { mapsAvailable } from "@/lib/itinerary-map";
import { downloadItineraryPdf } from "@/lib/itinerary-pdf";
import type { Messages } from "@/lib/messages";
import { type Member, fillTemplate, getMemberName } from "@/lib/plan-draft";
import { splitTime, toMinutes } from "@/lib/stop-time";
import { plural } from "@/lib/trips/format";
import { useWibNow } from "@/lib/use-jakarta-clock";
import { useLocale } from "@/lib/use-locale";
import { type Sky, type WeatherDay, isRainy, shownSky } from "@/lib/weather";
import FieldError from "@/components/ui/FieldError";

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

type ItineraryScheduleProps = {
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
/** Below this chance of rain the forecast leaves rain out. */
const RAIN_WORTH_MENTIONING = 20;

// Where each stop stands against the clock. Only today's schedule gets phases; a stop without a readable time is
// left unmarked.
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

/** Which stop is pointed at after the pointer enters or leaves one; leaving another stop changes nothing. */
function pointedAfter(current: number | null, index: number, pointing: boolean): number | null {
  if (pointing) return index;
  return current === index ? null : current;
}

// The day's forecast in one tag: the sky, the temperatures, and the chance of rain once it is worth mentioning.
function DayWeather({ weather, text }: { weather: WeatherDay; text: Messages["plan"]["itinerary"]["weather"] }) {
  const Icon = SKY_ICONS[shownSky(weather)];
  const showRain = weather.rainChance !== null && weather.rainChance > RAIN_WORTH_MENTIONING;
  return (
    <p className={`${BADGE} bg-surface-muted text-text tabular-nums`}>
      <Icon className="size-4 text-primary" aria-hidden="true" />
      {weather.tempMin}° – {weather.tempMax}°C
      {showRain && <span className={isRainy(weather) ? "text-primary" : "text-text-muted"}>· {fillTemplate(text.chance, { chance: weather.rainChance ?? 0 })}</span>}
    </p>
  );
}

// The itinerary as a day you can read at a glance: the day and a date picker for moving between days, then the
// chosen day as a line of numbered stops with the drives and rests between them. From 1024px the day's map stands beside the line, with
// the same numbers on its pins; on a phone it opens from the day's header.
export default function ItinerarySchedule({
  itinerary,
  destination,
  members,
  text,
  isSample,
  initialDate,
  live = false,
  onChange,
}: ItineraryScheduleProps) {
  const locale = useLocale();
  const baseId = useId();
  const words = text.itinerary;
  const [selected, setSelected] = useState(() => Math.max(itinerary.days.findIndex((entry) => entry.date === initialDate), 0));
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [pointed, setPointed] = useState<number | null>(null);
  const [backupsFor, setBackupsFor] = useState<number | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  // The day adjustment sheet, and what it opens on. A new key each time it opens starts it fresh.
  const [adjusting, setAdjusting] = useState<{ kind: BackupKind; key: number } | null>(null);
  const [weatherMap, setWeatherMap] = useState<Map<string, WeatherDay>>(new Map());
  const [pdf, setPdf] = useState<"idle" | "making" | "failed">("idle");
  const clock = useWibNow(true);
  const now = live ? clock : null;
  const dayCount = itinerary.days.length;
  const day = itinerary.days[Math.min(selected, dayCount - 1)];
  const phases = readPhases(day, now);
  const summary = summarize(day);
  const resting = restingMembers(members);
  const dayWeather = weatherMap.get(day.date);
  const rainy = dayWeather ? isRainy(dayWeather) : false;
  const firstDate = itinerary.days[0]?.date;
  const lastDate = itinerary.days[dayCount - 1]?.date;
  const dayTitleId = `${baseId}-day`;
  const kilometres = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  // The forecast for the trip's dates. Keyed on the dates, not the days, so switching a stop to a backup does not
  // ask again. Without it the schedule simply shows no weather.
  useEffect(() => {
    if (isSample || !destination || !firstDate || !lastDate) return;
    const controller = new AbortController();
    fetchWeather([destination], firstDate, lastDate, locale, controller.signal)
      .then((weather) => {
        setWeatherMap(new Map(weather.places.flatMap((place) => place.days.map((entry): [string, WeatherDay] => [entry.date, entry]))));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [destination, firstDate, lastDate, isSample, locale]);

  const describeCover = (cover: ItineraryCover) => {
    const covered = members.filter((member) => cover.memberIds.includes(member.id));
    if (covered.length === 0) return text.needs[cover.need];
    if (covered.length === members.length && members.length > 1) return `${words.everyone}: ${text.needs[cover.need]}`;
    const names = covered.slice(0, MAX_NAMES).map((member) => getMemberName(member, members, text.ageGroups));
    const extra = covered.length > MAX_NAMES ? ` +${covered.length - MAX_NAMES}` : "";
    return `${names.join(", ")}${extra}: ${text.needs[cover.need]}`;
  };

  const minutesLabel = (total: number) =>
    [
      Math.floor(total / 60) > 0 ? fillTemplate(words.hours, { count: Math.floor(total / 60) }) : "",
      total % 60 > 0 ? fillTemplate(words.minutes, { count: total % 60 }) : "",
    ]
      .filter(Boolean)
      .join(" ");

  const restNames = () => {
    const names = resting.slice(0, MAX_NAMES).map((member) => getMemberName(member, members, text.ageGroups));
    if (resting.length > MAX_NAMES) names.push(fillTemplate(words.timeline.restMore, { count: resting.length - MAX_NAMES }));
    return names.join(", ");
  };

  const savePdf = () => {
    setPdf("making");
    downloadItineraryPdf({ itinerary, destination, text: words, needLabels: text.needs, locale }).then(
      () => setPdf("idle"),
      () => setPdf("failed"),
    );
  };

  const selectDay = (index: number) => {
    setSelected(index);
    setOpenIndex(null);
    setPointed(null);
  };

  const openStop = (index: number) => {
    setPointed(index);
    setOpenIndex(index);
  };

  const applyAdjust = (switches: StopSwitch[]) => {
    if (onChange) onChange(rebuildDayStops(itinerary, day.date, switches));
  };

  const summaryLine = [
    plural(words.stops, summary.stops, locale),
    summary.kilometres !== null ? fillTemplate(words.timeline.byCar, { distance: `${kilometres.format(summary.kilometres)} km` }) : "",
  ].filter(Boolean);

  const mapLabels = { unavailable: words.timeline.mapUnavailable, open: words.timeline.openInMaps, loading: words.timeline.mapLoading };
  const backupItem = backupsFor === null ? null : day.items[backupsFor];

  return (
    <section aria-labelledby={`${baseId}-title`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${baseId}-title`} className="text-h3 text-text">
          {fillTemplate(words.title, { destination })}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {isSample && <span className={`${BADGE} bg-info-subtle text-on-info-subtle`}>{words.sample}</span>}
          <button type="button" onClick={savePdf} disabled={pdf === "making"} className={buttonClass("outline", "small")}>
            {pdf === "making" ? (
              <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4 text-primary" aria-hidden="true" />
            )}
            {pdf === "making" ? words.pdf.making : words.pdf.download}
          </button>
        </div>
      </div>
      {pdf === "failed" && (
        <FieldError role="alert">{words.pdf.failed}</FieldError>
      )}

      <div className={`mt-6 ${mapsAvailable ? "lg:grid lg:grid-cols-[minmax(0,40rem)_minmax(0,1fr)] lg:items-start lg:gap-8" : "w-full"}`}>
        <section aria-labelledby={dayTitleId} className="min-w-0">
          {/* The header stays while the day changes, so the date picker keeps its place and its focus. */}
          <header className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 id={dayTitleId} className="text-h3 text-text tabular-nums">
                {fillTemplate(words.picker.position, { number: selected + 1, total: dayCount })}
              </h3>
              <div className="flex items-center gap-2">
                {/* Adjusting the day (rain, a closed place) sits with the day it changes, as one round button. */}
                {onChange && day.items.length > 0 && (
                  <IconButton
                    label={words.adjust.open}
                    onClick={() => setAdjusting({ kind: "closed", key: Date.now() })}
                    className="border border-border-strong"
                  >
                    <SlidersHorizontal className="size-5" aria-hidden="true" />
                  </IconButton>
                )}
                <DayPicker
                  days={itinerary.days}
                  selected={selected}
                  today={clock?.date ?? null}
                  locale={locale}
                  text={words.picker}
                  onSelect={selectDay}
                />
                {/* The map stands beside the day from 1024px; below that it opens from here. A wrapper hides it,
                    since "hidden" on the button itself would race the button's own display. */}
                {mapsAvailable && day.items.length > 0 && (
                  <div className="lg:hidden">
                    <IconButton label={words.timeline.map} onClick={() => setMapOpen(true)} className="border border-border-strong">
                      <MapIcon className="size-5 text-primary" aria-hidden="true" />
                    </IconButton>
                  </div>
                )}
              </div>
            </div>
          </header>
          <div key={day.date} className="motion-safe:animate-message-in">
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="flex flex-wrap items-center gap-x-2 text-body-sm text-text-muted tabular-nums">
                {summaryLine.join(" · ")}
                <span aria-hidden="true">·</span>
                <span className={`inline-flex items-center gap-1 ${summary.issues > 0 ? "text-warning" : "text-success"}`}>
                  {summary.issues > 0 ? (
                    <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
                  )}
                  {plural(words.timeline.issues, summary.issues, locale)}
                </span>
              </p>
              {dayWeather && <DayWeather weather={dayWeather} text={words.weather} />}
            </div>

            {rainy && dayWeather && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 surface-compact rounded-surface bg-primary-subtle p-surface text-body-sm text-on-primary-subtle">
                <p className="flex min-h-11 min-w-0 flex-1 basis-56 items-center gap-2 text-pretty">
                  <CloudRain className="size-4 shrink-0" aria-hidden="true" />
                  {fillTemplate(words.weather.rainAlert, { chance: Math.round(dayWeather.rainChance ?? 50) })}
                </p>
                {onChange && day.items.length > 0 && (
                  <button type="button" onClick={() => setAdjusting({ kind: "rain", key: Date.now() })} className={`${buttonClass("outline", "small")} bg-background`}>
                    <SlidersHorizontal className="size-4" aria-hidden="true" />
                    {words.adjust.forRain}
                  </button>
                )}
              </div>
            )}

            {day.items.length === 0 ? (
              <p className="mt-6 text-body-sm text-pretty text-text-muted">{words.emptyDay}</p>
            ) : (
              <div className="relative mt-6">
                {/* The day's line, running through the centre of the markers' column. */}
                <span aria-hidden="true" className="absolute top-8 bottom-8 left-21 w-0.5 -translate-x-1/2 rounded-full bg-border" />
                <ol className="relative space-y-2">
                  {day.items.map((item, index) => {
                    const next = day.items[index + 1];
                    const rest = resting.length > 0 ? restAfter(item, next) : null;
                    const travel = next && item.travelToNext && isLegCurrent(item, next) ? item.travelToNext : null;
                    return (
                      <Fragment key={`${item.time}-${item.title}`}>
                        <StopItem
                          item={item}
                          number={index + 1}
                          phase={phases[index]}
                          active={pointed === index}
                          text={words}
                          needLabels={text.needs}
                          onOpen={() => openStop(index)}
                          onBackups={() => setBackupsFor(index)}
                          onPoint={(pointing) => setPointed((current) => pointedAfter(current, index, pointing))}
                        />
                        {travel && (
                          <TravelSegment label={fillTemplate(words.timeline.travelCar, { duration: travel.duration, distance: travel.distance })} />
                        )}
                        {rest !== null && <RestSlot label={fillTemplate(words.timeline.rest, { duration: minutesLabel(rest), names: restNames() })} />}
                      </Fragment>
                    );
                  })}
                </ol>
              </div>
            )}

          </div>
        </section>

        {mapsAvailable && day.items.length > 0 && (
          <aside aria-label={fillTemplate(words.timeline.mapTitle, { number: selected + 1 })} className="hidden lg:sticky lg:top-28 lg:block">
            <DayMap
              key={day.date}
              stops={day.items}
              destination={destination}
              activeIndex={pointed}
              labels={mapLabels}
              onPick={openStop}
              className="h-[min(40rem,calc(100dvh-9rem))]"
            />
          </aside>
        )}
      </div>

      {mapsAvailable && (
        <Sheet open={mapOpen} title={fillTemplate(words.timeline.mapTitle, { number: selected + 1 })} closeLabel={words.close} onClose={() => setMapOpen(false)}>
          {mapOpen && (
            <DayMap
              stops={day.items}
              destination={destination}
              activeIndex={pointed}
              labels={mapLabels}
              onPick={(index) => {
                setMapOpen(false);
                openStop(index);
              }}
              className="h-[60dvh]"
            />
          )}
        </Sheet>
      )}

      <Sheet
        open={backupItem !== null}
        title={backupItem ? fillTemplate(words.timeline.backupsFor, { name: backupItem.title }) : ""}
        closeLabel={words.close}
        onClose={() => setBackupsFor(null)}
      >
        {backupItem && backupsFor !== null && (
          <StopBackups
            item={backupItem}
            destination={destination}
            text={words}
            validated={!isSample}
            describeCover={describeCover}
            onUse={
              onChange
                ? (backupIndex) => {
                    onChange(switchToBackup(itinerary, day.date, backupsFor, backupIndex));
                    setBackupsFor(null);
                  }
                : undefined
            }
          />
        )}
      </Sheet>

      <StopDialog
        items={day.items}
        index={openIndex}
        phases={phases}
        dayLabel={fillTemplate(words.day, { number: selected + 1 })}
        destination={destination}
        text={words}
        validated={!isSample}
        describeCover={describeCover}
        onUseBackup={onChange && openIndex !== null ? (backupIndex) => onChange(switchToBackup(itinerary, day.date, openIndex, backupIndex)) : undefined}
        onNavigate={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />

      {adjusting && (
        <DayAdjustSheet
          key={adjusting.key}
          open
          day={day}
          dayNumber={selected + 1}
          initialKind={adjusting.kind}
          rainChance={dayWeather?.rainChance ?? null}
          text={words}
          onApply={applyAdjust}
          onClose={() => setAdjusting(null)}
        />
      )}
    </section>
  );
}
