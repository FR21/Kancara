"use client";

import { Check, CircleAlert, Globe, Loader2, LocateFixed, Map as MapIcon, Minus, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Checkbox from "@/components/plan/Checkbox";
import { EASE, INPUT } from "@/components/plan/styles";
import { fillTemplate } from "@/lib/plan-draft";
import { COUNTRIES, countryNames } from "@/lib/travel/countries";
import { loadVisited, saveVisited } from "@/lib/travel/visited";
import { MAX_ZOOM, MIN_ZOOM, type WorldMode } from "@/lib/travel/world-scene";
import { useLocale } from "@/lib/use-locale";
import { useMessages } from "@/lib/use-messages";
import WorldStage from "./WorldStage";

type TravelMapProps = {
  uid: string;
  customToken?: string;
};

type SaveState = "loading" | "idle" | "saving" | "saved" | "error" | "loadError";

const VIEWS = [
  { mode: "globe", Icon: Globe },
  { mode: "map", Icon: MapIcon },
] as const;
const SAVE_DELAY_MS = 600;
const ZOOM_STEP = 1.5;
const SKELETON_ROWS = [62, 48, 70, 55, 66, 44, 58];
const ZOOM_BUTTON =
  "inline-flex size-11 cursor-pointer items-center justify-center text-text transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40";

export default function TravelMap({ uid, customToken }: TravelMapProps) {
  const text = useMessages("travel");
  const locale = useLocale();
  const [visited, setVisited] = useState<ReadonlySet<string>>(new Set());
  const [mode, setMode] = useState<WorldMode>("globe");
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [focus, setFocus] = useState<{ code: string; tick: number } | null>(null);
  const [query, setQuery] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("loading");
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

  useEffect(() => {
    let cancelled = false;
    loadVisited(uid, customToken)
      .then((codes) => {
        if (cancelled) return;
        const loaded = new Set(codes);
        latest.current = loaded;
        setVisited(loaded);
        setSaveState("idle");
      })
      .catch(() => {
        if (!cancelled) setSaveState("loadError");
      });
    return () => {
      cancelled = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [uid, customToken]);

  const persist = async () => {
    setSaveState("saving");
    try {
      await saveVisited(uid, [...latest.current].sort());
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
  const loading = saveState === "loading";

  const renderRow = (code: string) => {
    const name = names.get(code) ?? code;
    return (
      <li key={code} className="flex items-center gap-1">
        <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-2 transition-colors duration-150 ease-out hover:bg-surface-muted">
          <Checkbox checked={visited.has(code)} onChange={() => toggle(code, true)} />
          <span className="min-w-0 truncate text-body text-text">{name}</span>
        </label>
        <button
          type="button"
          onClick={() => show(code)}
          aria-label={fillTemplate(text.list.locate, { name })}
          title={fillTemplate(text.list.locate, { name })}
          className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-muted transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-muted hover:text-primary active:scale-[0.97]"
        >
          <LocateFixed className="size-4" aria-hidden="true" />
        </button>
      </li>
    );
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 lg:max-w-5xl xl:px-0">
      <header className="motion-safe:animate-message-in">
        <h1 className="text-h2 text-text sm:text-h1">{text.title}</h1>
        <p className="mt-2 max-w-xl text-body text-pretty text-text-muted">{text.lead}</p>
      </header>

      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-x-12">
        <section aria-label={text.view.label}>
          <div className="flex items-center justify-between gap-3 motion-safe:animate-message-in motion-safe:[animation-delay:300ms]">
            <div
              role="group"
              aria-label={text.view.label}
              className="relative inline-grid grid-cols-2 rounded-full border border-border-strong bg-surface p-1"
            >
              <span
                aria-hidden="true"
                className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary transition-[translate] duration-200 ${EASE} motion-reduce:transition-none ${
                  mode === "map" ? "translate-x-full" : ""
                }`}
              />
              {VIEWS.map(({ mode: option, Icon }) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={mode === option}
                  onClick={() => setMode(option)}
                  className={`relative inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-label whitespace-nowrap transition-[color,scale] duration-150 ease-out active:scale-[0.97] ${
                    mode === option ? "text-on-primary" : "text-text-muted hover:text-text"
                  }`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {text.view[option]}
                </button>
              ))}
            </div>
            <div className="flex overflow-hidden rounded-full border border-border-strong bg-surface">
              <button
                type="button"
                onClick={() => setZoom((value) => Math.max(value / ZOOM_STEP, MIN_ZOOM))}
                disabled={zoom <= MIN_ZOOM}
                aria-label={text.stage.zoomOut}
                title={text.stage.zoomOut}
                className={ZOOM_BUTTON}
              >
                <Minus className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((value) => Math.min(value * ZOOM_STEP, MAX_ZOOM))}
                disabled={zoom >= MAX_ZOOM}
                aria-label={text.stage.zoomIn}
                title={text.stage.zoomIn}
                className={ZOOM_BUTTON}
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <p className="mt-3 text-body-sm text-text-muted">{text.stage.hint}</p>
          <div
            className={`relative mt-4 w-full transition-[aspect-ratio] duration-1000 ${EASE} motion-reduce:transition-none ${
              mode === "map" ? "aspect-2/1" : "aspect-square"
            }`}
          >
            <WorldStage
              visited={visited}
              mode={mode}
              zoom={zoom}
              focus={focus}
              names={names}
              label={fillTemplate(text.stage.label, { count })}
              text={text}
              onToggle={(code) => toggle(code, false)}
              onZoom={setZoom}
            />
          </div>

        </section>

        <aside className="mt-10 motion-safe:animate-message-in motion-safe:[animation-delay:200ms] lg:mt-0">
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
          <div aria-hidden="true" className="mt-3 h-1 overflow-hidden rounded-full bg-surface-muted">
            <div
              style={{ width: `${(count / COUNTRIES.length) * 100}%` }}
              className={`h-full rounded-full bg-accent transition-[width] duration-500 ${EASE} motion-reduce:transition-none`}
            />
          </div>

          <div className="mt-3 flex min-h-11 items-center gap-2 text-body-sm text-text-muted">
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
            {(saveState === "error" || saveState === "loadError") && (
              <span role="alert" className="inline-flex flex-wrap items-center gap-2 text-error">
                <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                {saveState === "error" ? text.status.error : text.status.loadError}
                {saveState === "error" && (
                  <button
                    type="button"
                    onClick={persist}
                    className="inline-flex min-h-11 cursor-pointer items-center rounded-sm text-label text-primary underline-offset-4 hover:underline"
                  >
                    {text.status.retry}
                  </button>
                )}
              </span>
            )}
          </div>

          <div className="group relative mt-2">
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

          <div
            aria-busy={loading}
            className="mt-4 max-h-96 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin] lg:max-h-[26rem]"
          >
            {loading &&
              SKELETON_ROWS.map((row) => (
                <div
                  key={row}
                  aria-hidden="true"
                  className="my-3 h-5 rounded-full bg-surface-muted motion-safe:animate-pulse"
                  style={{ width: `${row}%` }}
                />
              ))}
            {!loading && matches.length === 0 && (
              <p className="py-4 text-body-sm text-text-muted">{fillTemplate(text.search.empty, { query: query.trim() })}</p>
            )}
            {count === 0 && needle === "" && !loading && (
              <p className="pb-3 text-body-sm text-pretty text-text-muted">{text.empty}</p>
            )}
            {!loading && marked.length > 0 && (
              <>
                <h2 className="px-2 pb-1 text-label text-text-muted">{text.list.visitedHeading}</h2>
                <ul>{marked.map((country) => renderRow(country.code))}</ul>
              </>
            )}
            {!loading && unmarked.length > 0 && (
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
    </div>
  );
}
