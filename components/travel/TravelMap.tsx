"use client";

import { Check, CircleAlert, Loader2, LocateFixed, Minus, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Checkbox from "@/components/ui/Checkbox";
import IconButton from "@/components/ui/IconButton";
import { EASE, INPUT, TEXT_LINK } from "@/components/ui/styles";
import { saveVisitedCountries } from "@/lib/client/profile";
import { fillTemplate } from "@/lib/plan-draft";
import { COUNTRIES, countryNames } from "@/lib/travel/countries";
import { MAX_ZOOM, MIN_ZOOM } from "@/lib/travel/world-scene";
import { useLocale } from "@/lib/use-locale";
import { useMessages } from "@/lib/use-messages";
import WorldStage from "./WorldStage";

type TravelMapProps = {
  initialVisited: string[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_DELAY_MS = 600;
const ZOOM_STEP = 1.5;

export default function TravelMap({ initialVisited }: TravelMapProps) {
  const text = useMessages("travel");
  const navText = useMessages("navbar");
  const locale = useLocale();
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set(initialVisited));
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [focus, setFocus] = useState<{ code: string; tick: number } | null>(null);
  const [query, setQuery] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [announcement, setAnnouncement] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<ReadonlySet<string>>(visited);
  const tick = useRef(0);

  const names = useMemo(() => countryNames(locale), [locale]);
  const sorted = useMemo(() => {
    const collator = new Intl.Collator(locale);
    return [...COUNTRIES].sort((first, second) =>
      collator.compare(names.get(first.code) ?? first.name, names.get(second.code) ?? second.name),
    );
  }, [locale, names]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const persist = async () => {
    setSaveState("saving");
    try {
      await saveVisitedCountries([...latest.current].sort());
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const toggle = (code: string, locate: boolean) => {
    const next = new Set(latest.current);
    const marking = !next.has(code);
    if (marking) next.add(code);
    else next.delete(code);
    latest.current = next;
    setVisited(next);
    setAnnouncement(
      fillTemplate(marking ? text.announce.marked : text.announce.unmarked, { name: names.get(code) ?? code }),
    );
    if (marking && locate) show(code);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, SAVE_DELAY_MS);
  };

  const show = (code: string) => {
    tick.current += 1;
    setFocus({ code, tick: tick.current });
  };

  const needle = query.trim().toLocaleLowerCase(locale);
  const matches = sorted.filter((country) =>
    (names.get(country.code) ?? country.name).toLocaleLowerCase(locale).includes(needle),
  );
  const marked = matches.filter((country) => visited.has(country.code));
  const unmarked = matches.filter((country) => !visited.has(country.code));
  const count = visited.size;

  const renderRow = (code: string) => {
    const name = names.get(code) ?? code;
    return (
      <li key={code} className="flex items-center gap-1">
        <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-2 transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.99]">
          <Checkbox checked={visited.has(code)} onChange={() => toggle(code, true)} />
          <span className="min-w-0 truncate text-body text-text">{name}</span>
        </label>
        <IconButton label={fillTemplate(text.list.locate, { name })} onClick={() => show(code)} className="group/locate">
          <LocateFixed
            className="size-4 text-text-muted transition-colors duration-150 ease-out group-hover/locate:text-primary"
            aria-hidden="true"
          />
        </IconButton>
      </li>
    );
  };

  return (
    <>
      <PageHeader
        crumbs={{ label: navText.breadcrumb, items: [{ label: navText.profile, href: "/profile" }, { label: text.title }] }}
        title={text.title}
        lead={text.lead}
      />

      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-x-12">
        <section aria-label={text.view.label}>
          <p className="text-body-sm text-pretty text-text-muted">{text.stage.hint}</p>
          <div className="relative mt-2 aspect-square w-full">
            <WorldStage
              visited={visited}
              mode="globe"
              zoom={zoom}
              focus={focus}
              names={names}
              label={fillTemplate(text.stage.label, { count })}
              text={text}
              onToggle={(code) => toggle(code, false)}
              onZoom={setZoom}
            />
            {/* The zoom sits in the globe's corner: one small pill of two 36px buttons, 4px in. */}
            <div className="absolute top-0 right-0 z-10 flex rounded-full border border-border-strong bg-surface/90 p-1 shadow-sm shadow-neutral-950/10 backdrop-blur-sm motion-safe:animate-message-in">
              <IconButton
                label={text.stage.zoomOut}
                onClick={() => setZoom((value) => Math.max(value / ZOOM_STEP, MIN_ZOOM))}
                disabled={zoom <= MIN_ZOOM}
                size="small"
              >
                <Minus className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton
                label={text.stage.zoomIn}
                onClick={() => setZoom((value) => Math.min(value * ZOOM_STEP, MAX_ZOOM))}
                disabled={zoom >= MAX_ZOOM}
                size="small"
              >
                <Plus className="size-4" aria-hidden="true" />
              </IconButton>
            </div>
          </div>
        </section>

        <aside className="mt-8 motion-safe:animate-message-in motion-safe:[animation-delay:200ms] lg:mt-0">
          <p className="flex items-center gap-4">
            <span
              key={count}
              className="font-heading text-display text-text tabular-nums motion-safe:animate-pop-in"
            >
              {count}
            </span>
            <span className="text-body text-text">
              {text.count.label}
              <span className="block text-body-sm text-text-muted">
                {fillTemplate(text.count.of, { total: COUNTRIES.length })}
              </span>
            </span>
          </p>
          <div aria-hidden="true" className="mt-2 h-1 overflow-clip rounded-full bg-surface-muted">
            {/* Scaled, not resized, so the bar grows without making the browser lay the page out again. */}
            <div
              style={{ scale: `${count / COUNTRIES.length} 1` }}
              className={`h-full origin-left rounded-full bg-accent transition-[scale] duration-500 ${EASE} motion-reduce:transition-none`}
            />
          </div>

          <div className="mt-2 flex min-h-6 items-center gap-2 text-body-sm text-text-muted">
            {saveState === "saving" && (
              <>
                <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                {text.status.saving}
              </>
            )}
            {saveState === "saved" && (
              <span key={count} className="inline-flex items-center gap-2 text-success motion-safe:animate-message-in">
                <Check className="size-4 motion-safe:animate-stamp-in" aria-hidden="true" />
                {text.status.saved}
              </span>
            )}
            {saveState === "error" && (
              <span role="alert" className="inline-flex flex-wrap items-center gap-2 text-error">
                <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                {text.status.error}
                <button type="button" onClick={persist} className={TEXT_LINK}>
                  {text.status.retry}
                </button>
              </span>
            )}
          </div>

          <div className="group relative mt-6">
            <label htmlFor="travel-search" className="sr-only">
              {text.search.label}
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-text-muted transition-colors duration-150 ease-out group-focus-within:text-primary"
            />
            <input
              id="travel-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={text.search.placeholder}
              autoComplete="off"
              className={`${INPUT} pl-12`}
            />
          </div>

          <div className="mt-2 max-h-96 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin] lg:max-h-[26rem]">
            {matches.length === 0 && (
              <p className="py-4 text-body-sm text-text-muted">{fillTemplate(text.search.empty, { query: query.trim() })}</p>
            )}
            {count === 0 && needle === "" && (
              <p className="pb-3 text-body-sm text-pretty text-text-muted">{text.empty}</p>
            )}
            {marked.length > 0 && (
              <>
                <h2 className="px-2 pb-1 text-label text-text-muted">{text.list.visitedHeading}</h2>
                <ul>{marked.map((country) => renderRow(country.code))}</ul>
              </>
            )}
            {unmarked.length > 0 && (
              <>
                <h2 className={`px-2 pb-1 text-label text-text-muted ${marked.length > 0 ? "mt-4" : ""}`}>
                  {text.list.allHeading}
                </h2>
                <ul>{unmarked.map((country) => renderRow(country.code))}</ul>
              </>
            )}
          </div>
        </aside>
      </div>

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
