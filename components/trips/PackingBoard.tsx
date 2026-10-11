"use client";

import { ArrowRight, CalendarCheck, Check, CloudOff, Info, Loader2, Plus, RotateCcw, Shirt, TriangleAlert } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import MemberAvatar from "@/components/plan/MemberAvatar";
import { INPUT, choiceClass } from "@/components/plan/styles";
import Stamp from "@/components/ui/stamp";
import { type Itinerary, captain } from "@/lib/api/captain";
import { fetchWeather } from "@/lib/api/weather";
import { laundryDayNumbers } from "@/lib/laundry";
import type { Messages } from "@/lib/messages";
import {
  type PackingItem,
  buildPackingList,
  hasFreeText,
  isWeatherReason,
  needsLaundryChoice,
  OUTFITS_PER_DAY,
  tripDayCount,
} from "@/lib/packing";
import {
  type PlanDraft,
  type PlanDraftAction,
  fillTemplate,
  getMemberName,
  LAUNDRY_CHOICES,
  MAX_CUSTOM_CHARS,
  MAX_OWN_PACKING,
  parseLocalDate,
} from "@/lib/plan-draft";
import { plural } from "@/lib/trips/format";
import { useLocale } from "@/lib/use-locale";
import PackingRow from "./PackingRow";
import WeatherStrip, { type WeatherState } from "./WeatherStrip";

type PackingBoardProps = {
  draft: PlanDraft;
  itinerary: Itinerary | null;
  itineraryHref: string;
  laundrySync: LaundrySync;
  text: Messages["packing"];
  planText: Messages["plan"];
  onChange: (action: PlanDraftAction) => void;
  onLaundryRetry: () => void;
};

/** Where the laundry choice stands on its way into the itinerary. "waiting" is for a connection. */
export type LaundrySync = "idle" | "looking" | "waiting" | "failed";

type Filter = "all" | "todo" | "essential" | "weather" | `member:${string}`;
type FilterChip = { key: Filter; label: string; count: number; memberIndex?: number };
type CaptainState = "idle" | "asking" | "failed";

const QUIET_ACTION =
  "inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-border-strong px-4 text-label text-text transition-[background-color,border-color,scale] duration-150 ease-out hover:border-primary hover:bg-primary-subtle active:scale-[0.97]";
const TEXT_ACTION =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-label text-primary transition-[background-color,scale] duration-150 ease-out hover:bg-primary-subtle active:scale-[0.97]";
// Destination names joined with a character no name holds, so the list can be a single effect dependency.
const PLACE_JOINER = "\u0000";

// The packing list of one trip: the weather it was written for, how much is packed, and one list that can be
// narrowed with a chip. The list is worked out here from the group and the weather; only ticks, removals, and
// additions travel back up to be saved.
export default function PackingBoard({
  draft,
  itinerary,
  itineraryHref,
  laundrySync,
  text,
  planText,
  onChange,
  onLaundryRetry,
}: PackingBoardProps) {
  const locale = useLocale();
  const [weather, setWeather] = useState<WeatherState>({ status: "loading" });
  const [weatherTries, setWeatherTries] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [captainState, setCaptainState] = useState<CaptainState>("idle");
  const [pending, setPending] = useState("");
  const askedRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  const placesKey = draft.destinations.join(PLACE_JOINER);
  const { startDate, endDate } = draft;

  useEffect(() => {
    const controller = new AbortController();
    fetchWeather(placesKey.split(PLACE_JOINER), startDate, endDate, locale, controller.signal).then(
      (loaded) => setWeather({ status: "ready", weather: loaded }),
      () => {
        if (!controller.signal.aborted) setWeather({ status: "failed" });
      },
    );
    return () => controller.abort();
  }, [placesKey, startDate, endDate, locale, weatherTries]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const forecast = weather.status === "ready" ? weather.weather : null;
  const items = buildPackingList(draft, forecast);
  const checked = new Set(draft.packing.checked);
  const done = items.filter((item) => checked.has(item.id)).length;
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long" });
  const manyPlaces = draft.destinations.length > 1;

  const labelOf = (item: PackingItem) => {
    if (item.key === "clothes") {
      const days = item.count ?? 1;
      return fillTemplate(text.items.clothes, { days, min: days * OUTFITS_PER_DAY.min, max: days * OUTFITS_PER_DAY.max });
    }
    return item.key ? text.items[item.key] : item.label;
  };

  const reasonOf = (item: PackingItem): string => {
    const { reason } = item;
    const reasons = text.reasons;
    if (isWeatherReason(reason) && "place" in reason) {
      const day = weekday.format(parseLocalDate(reason.date));
      let line = "";
      if (reason.kind === "rain") {
        line =
          reason.chance === null
            ? fillTemplate(reasons.rainTypical, { day })
            : fillTemplate(reasons.rainChance, { chance: Math.round(reason.chance), day });
      } else if (reason.kind === "heat") {
        line = fillTemplate(reason.typical ? reasons.heatTypical : reasons.heat, { temp: reason.temp, day });
      } else if (reason.kind === "cold") {
        line = fillTemplate(reason.typical ? reasons.coldTypical : reasons.cold, { temp: reason.temp, day });
      }
      // With one destination the place goes without saying.
      return manyPlaces ? fillTemplate(reasons.atPlace, { reason: line, place: reason.place }) : line;
    }
    if (reason.kind === "laundry") return text.laundry.choices[reason.choice];
    if (reason.kind === "age") return planText.ageGroups[reason.ageGroup];
    if (reason.kind === "need") return planText.needs[reason.need];
    if (reason.kind === "allergy") return fillTemplate(reasons.allergy, { allergies: reason.allergies });
    if (reason.kind === "transport") return planText.transport[reason.transport];
    if (reason.kind === "interest") return planText.interests[reason.interest];
    if (reason.kind === "captain") return reason.note;
    return reason.kind === "own" ? reasons.own : reasons.basics;
  };

  const askCaptain = async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setCaptainState("asking");
    try {
      // Captain is told what the rules already listed, so it adds to them instead of repeating them.
      const known = buildPackingList({ ...draft, packing: { ...draft.packing, captain: [] } }, forecast).map(labelOf);
      const added = await captain.packing({ draft, itinerary, weather: forecast, known, locale }, controller.signal);
      onChange({ type: "setCaptainPacking", items: added });
      setCaptainState("idle");
    } catch {
      if (!controller.signal.aborted) setCaptainState("failed");
    }
  };

  // Captain reads the trip once, after the weather has settled either way, and only when there is something the
  // fixed rules cannot read: words the group typed, or an itinerary.
  const weatherSettled = weather.status !== "loading";
  const captainUnread = draft.packing.captain === null;
  const worthAsking = hasFreeText(draft) || itinerary !== null;
  useEffect(() => {
    if (!weatherSettled || !captainUnread || !worthAsking || askedRef.current) return;
    askedRef.current = true;
    askCaptain();
    // The request is built from the draft as it stands when the weather settles; later edits do not ask again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherSettled, captainUnread, worthAsking]);

  const owners = draft.members.filter((member) => items.some((item) => item.memberId === member.id));
  const chips: FilterChip[] = [
    { key: "all", label: text.filters.all, count: items.length },
    { key: "todo", label: text.filters.todo, count: items.length - done },
    { key: "essential", label: text.filters.essential, count: items.filter((item) => item.essential).length },
    { key: "weather", label: text.filters.weather, count: items.filter((item) => isWeatherReason(item.reason)).length },
    ...owners.map(
      (member): FilterChip => ({
        key: `member:${member.id}`,
        label: getMemberName(member, draft.members, planText.ageGroups),
        count: items.filter((item) => item.memberId === member.id).length,
        memberIndex: draft.members.indexOf(member),
      }),
    ),
  ];
  const filters = chips.filter((entry) => entry.key === "all" || entry.key === "todo" || entry.count > 0);
  // A chip can vanish while it is picked (its last item removed); the list then shows everything again.
  const active = filters.some((entry) => entry.key === filter) ? filter : "all";
  const activeMemberId = active.startsWith("member:") ? active.slice("member:".length) : null;
  const activeMember = draft.members.find((member) => member.id === activeMemberId) ?? null;

  const shown = items.filter((item) => {
    if (active === "todo") return !checked.has(item.id);
    if (active === "essential") return item.essential;
    if (active === "weather") return isWeatherReason(item.reason);
    return activeMemberId === null || item.memberId === activeMemberId;
  });

  const addOwn = () => {
    if (pending.trim() === "") return;
    onChange({ type: "addOwnPackingItem", label: pending, memberId: activeMember?.id ?? null });
    setPending("");
  };

  const handleAddKey = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter that confirms a word in an input method (Japanese, Chinese, Korean) is not an answer yet.
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    addOwn();
  };

  const captainCount = draft.packing.captain?.length ?? 0;
  const captainNote = () => {
    if (captainState === "asking") return text.captain.pending;
    if (captainState === "failed") return text.captain.failed;
    if (draft.packing.captain === null) return "";
    return captainCount > 0 ? plural(text.captain.added, captainCount, locale) : text.captain.none;
  };
  const note = captainNote();
  const addLabel = activeMember
    ? fillTemplate(text.add.labelFor, { name: getMemberName(activeMember, draft.members, planText.ageGroups) })
    : text.add.label;
  const ownFull = draft.packing.own.length >= MAX_OWN_PACKING;
  const allPacked = items.length > 0 && done === items.length;
  const removed = draft.packing.removed.length;
  const askLaundry = needsLaundryChoice(draft);
  const laundryChoice = draft.packing.laundry;
  const laundryDays = itinerary ? laundryDayNumbers(itinerary) : [];
  const laundrySettled = itinerary !== null && laundrySync === "idle" && laundryDays.length > 0;
  // What the choice did to the schedule, so the packing list never promises a wash the days have no room for.
  const laundryNote = () => {
    if (laundryChoice === null || laundryChoice === "all") return "";
    if (!itinerary) return text.laundry.plan.noItinerary;
    if (laundrySync !== "idle") return text.laundry.plan[laundrySync];
    if (laundryDays.length === 0) return "";
    const days = new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(laundryDays.map(String));
    return fillTemplate(text.laundry.plan[laundryChoice], { days });
  };
  const laundryLine = askLaundry ? laundryNote() : "";

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-10">
      {/* On a phone the column's parts take their place in the page's own order, with Captain's note after the
          list; from 1024px they are one column that stays in view. */}
      <div className="contents lg:sticky lg:top-28 lg:block lg:space-y-6">
        <div className="order-1">
          <WeatherStrip
            state={weather}
            locale={locale}
            text={text.weather}
            retryLabel={text.retry}
            onRetry={() => {
              setWeather({ status: "loading" });
              setWeatherTries((count) => count + 1);
            }}
          />
        </div>

        <div className="order-2">
          <p className="text-label-lg whitespace-nowrap text-text tabular-nums">
            {fillTemplate(text.progress, { done, total: items.length })}
          </p>
          <div
            role="progressbar"
            aria-label={text.title}
            aria-valuemin={0}
            aria-valuemax={items.length}
            aria-valuenow={done}
            className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
          >
            <div
              className={`h-full rounded-full transition-[width,background-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                allPacked ? "bg-success" : "bg-primary"
              }`}
              style={{ width: `${items.length === 0 ? 0 : (done / items.length) * 100}%` }}
            />
          </div>
          {allPacked && (
            <Stamp label={text.allPacked} className="mt-4 whitespace-nowrap motion-safe:animate-stamp-in" />
          )}
        </div>

        {note && captainState !== "asking" && (
          <div className="order-4 flex flex-wrap items-center gap-3">
            <Image
              src="/images/logo/kancara_mascot_captain_logo.webp"
              alt=""
              width={40}
              height={40}
              className="size-10 shrink-0"
            />
            <p role="status" className="min-w-0 flex-1 basis-48 text-body-sm text-pretty text-text-muted">
              {note}
            </p>
            <button type="button" onClick={askCaptain} className={QUIET_ACTION}>
              <RotateCcw className="size-4" aria-hidden="true" />
              {captainState === "failed" ? text.retry : text.captain.again}
            </button>
          </div>
        )}
      </div>

      <div className="order-3 min-w-0">
        <div
          role="group"
          aria-label={text.filters.label}
          className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {filters.map((entry) => {
            const selected = entry.key === active;
            return (
              <button
                key={entry.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter(entry.key)}
                className={`${choiceClass(selected)} shrink-0 whitespace-nowrap`}
              >
                {selected && <Check className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />}
                {!selected && entry.memberIndex !== undefined && (
                  <MemberAvatar
                    ageGroup={draft.members[entry.memberIndex].ageGroup}
                    variant={entry.memberIndex}
                    className="-ml-2 size-6"
                  />
                )}
                {entry.label}
                <span className={`tabular-nums ${selected ? "text-on-primary" : "text-text-muted"}`}>{entry.count}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 overflow-clip rounded-2xl border border-border bg-surface">
          {/* A trip longer than a week cannot pack clothes for every day; the group says how it will manage. */}
          {askLaundry && (
            <div role="group" aria-labelledby="laundry-title" className="border-b border-border px-4 py-4 sm:px-5">
              <p id="laundry-title" className="flex items-center gap-2 text-label text-text">
                <Shirt className="size-4 shrink-0 text-primary" aria-hidden="true" />
                {fillTemplate(text.laundry.title, { days: tripDayCount(draft) })}
              </p>
              <p className="mt-1 text-caption text-pretty text-text-muted">{text.laundry.hint}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {LAUNDRY_CHOICES.map((choice) => {
                  const selected = draft.packing.laundry === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChange({ type: "setLaundry", choice })}
                      className={choiceClass(selected)}
                    >
                      {selected && <Check className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />}
                      {text.laundry.choices[choice]}
                    </button>
                  );
                })}
              </div>
              {laundryLine && (
                <div className="mt-1 flex flex-wrap items-center gap-x-3">
                  <p role="status" className="flex min-h-11 min-w-0 items-center gap-2 text-caption text-pretty text-text-muted tabular-nums">
                    {laundrySettled && <CalendarCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />}
                    {!itinerary && <Info className="size-4 shrink-0" aria-hidden="true" />}
                    {laundrySync === "looking" && (
                      <Loader2 className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
                    )}
                    {laundrySync === "waiting" && <CloudOff className="size-4 shrink-0" aria-hidden="true" />}
                    {laundrySync === "failed" && <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden="true" />}
                    {laundryLine}
                  </p>
                  {laundrySettled && (
                    <Link
                      href={itineraryHref}
                      className="group inline-flex min-h-11 items-center gap-1 rounded-sm text-label text-primary underline-offset-4 hover:underline"
                    >
                      {text.laundry.plan.view}
                      <ArrowRight
                        className="size-4 transition-[translate] duration-200 ease-out group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </Link>
                  )}
                  {laundrySync === "failed" && itinerary && (
                    <button type="button" onClick={onLaundryRetry} className={TEXT_ACTION}>
                      <RotateCcw className="size-4" aria-hidden="true" />
                      {text.retry}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {captainState === "asking" && (
            <p
              role="status"
              className="flex items-center gap-3 border-b border-border px-4 py-3 text-body-sm text-text-muted motion-safe:animate-message-in sm:px-5"
            >
              <Image
                src="/images/logo/kancara_mascot_captain_logo.webp"
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 motion-safe:animate-float"
              />
              {text.captain.pending}
            </p>
          )}
          {/* The way back from a removal sits at the head of the list, where the removal was made. */}
          {removed > 0 && (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border py-1 pr-2 pl-4 motion-safe:animate-message-in sm:pl-5"
            >
              <p className="text-body-sm text-text-muted tabular-nums">{plural(text.removed, removed, locale)}</p>
              <button
                type="button"
                onClick={() => onChange({ type: "restorePackingItems" })}
                className={TEXT_ACTION}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                {text.restore}
              </button>
            </div>
          )}
          {shown.length === 0 && (
            <p className="px-5 py-8 text-center text-body-sm text-text-muted">
              {active === "todo" ? text.empty.todo : text.empty.other}
            </p>
          )}
          <ul className="divide-y divide-border">
            {shown.map((item) => {
              const member = draft.members.find((entry) => entry.id === item.memberId);
              return (
                <PackingRow
                  key={item.id}
                  item={item}
                  label={labelOf(item)}
                  reason={reasonOf(item)}
                  times={item.key === "clothes" ? null : item.count}
                  owner={
                    member
                      ? {
                          member,
                          name: getMemberName(member, draft.members, planText.ageGroups),
                          index: draft.members.indexOf(member),
                        }
                      : null
                  }
                  checked={checked.has(item.id)}
                  text={text}
                  onToggle={() => onChange({ type: "togglePacked", id: item.id })}
                  onRemove={() => onChange({ type: "removePackingItem", id: item.id })}
                />
              );
            })}
          </ul>

          <div className="border-t border-border px-4 py-4 sm:px-5">
            {ownFull ? (
              <p className="text-body-sm text-text-muted">
                {fillTemplate(text.add.full, { count: draft.packing.own.length })}
              </p>
            ) : (
              <>
                <label htmlFor="packing-add" className="block text-caption font-bold text-text-muted">
                  {addLabel}
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="packing-add"
                    type="text"
                    autoComplete="off"
                    maxLength={MAX_CUSTOM_CHARS}
                    value={pending}
                    placeholder={text.add.placeholder}
                    onChange={(event) => setPending(event.target.value)}
                    onKeyDown={handleAddKey}
                    className={`${INPUT} min-w-0`}
                  />
                  <button
                    type="button"
                    disabled={pending.trim() === ""}
                    onClick={addOwn}
                    className="inline-flex h-12 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-border-strong px-4 text-label text-text transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    {text.add.button}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
