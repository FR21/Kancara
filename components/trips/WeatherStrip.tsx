import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  type LucideIcon,
  RotateCcw,
  Snowflake,
  Sun,
} from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import { fillTemplate, parseLocalDate } from "@/lib/plan-draft";
import { type Sky, type Weather, type WeatherDay, shownSky } from "@/lib/weather";

export type WeatherState = { status: "loading" } | { status: "failed" } | { status: "ready"; weather: Weather };

type WeatherStripProps = {
  state: WeatherState;
  locale: string;
  text: Messages["packing"]["weather"];
  retryLabel: string;
  onRetry: () => void;
};

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

// A cell in a scrolling row on a phone; a line in a short table in the side column from 1024px.
// On a phone each day is a compact surface; from 1024px the days become the rows of one framed list.
const CELL =
  "surface-compact flex w-24 shrink-0 flex-col items-center rounded-surface border bg-background p-surface text-center lg:w-auto lg:flex-row lg:gap-3 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:border-solid lg:border-border lg:bg-transparent lg:px-0 lg:text-left lg:last:border-b-0";

function rainLine(day: WeatherDay, text: WeatherStripProps["text"]): string {
  if (day.rainChance !== null) return fillTemplate(text.rainChance, { chance: Math.round(day.rainChance) });
  const millimetres = Math.round(day.rainMm ?? 0);
  return millimetres > 0 ? fillTemplate(text.rainMm, { mm: millimetres }) : text.dry;
}

// The weather the packing list was written for: one block per destination, one cell per day of the trip. A day
// too far off to forecast shows last year's weather on that date and wears a dashed outline, the mark of
// something not settled yet.
export default function WeatherStrip({ state, locale, text, retryLabel, onRetry }: WeatherStripProps) {
  const dayFormat = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric" });

  if (state.status === "loading") {
    return (
      <div role="status" className="flex gap-2 overflow-hidden motion-safe:animate-pulse lg:flex-col">
        <span className="sr-only">{text.loading}</span>
        {[0, 1, 2].map((cell) => (
          <span key={cell} className="surface-compact h-32 w-24 shrink-0 rounded-surface bg-surface-muted lg:h-12 lg:w-full lg:rounded-lg" />
        ))}
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <div className="surface-compact flex flex-wrap items-center gap-3 rounded-surface border border-dashed border-border-strong p-surface">
        <p className="min-w-0 flex-1 basis-48 text-body-sm text-pretty text-text-muted">{text.unavailable}</p>
        <button
          type="button"
          onClick={onRetry}
          className={buttonClass("outline", "small")}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {retryLabel}
        </button>
      </div>
    );
  }

  const { places } = state.weather;
  const hasTypical = places.some((entry) => entry.days.some((day) => day.source === "typical"));

  return (
    <div className="space-y-6">
      {places.map((entry, index) => (
        <section key={entry.place} aria-labelledby={`weather-title-${index}`}>
          <h2 id={`weather-title-${index}`} className="text-label-lg text-text">
            {fillTemplate(text.title, { place: entry.place })}
          </h2>
          <ul className="scrollbar-none -mx-surface mt-3 flex gap-2 overflow-x-auto px-surface lg:mx-0 lg:block lg:overflow-visible lg:rounded-surface lg:border lg:border-border lg:bg-background">
            {entry.days.map((day) => {
              const sky = shownSky(day);
              const Icon = SKY_ICONS[sky];
              const typical = day.source === "typical";
              return (
                <li key={day.date} className={`${CELL} ${typical ? "border-dashed border-border-strong" : "border-border"}`}>
                  <p className="text-caption font-bold text-text-muted tabular-nums lg:w-14 lg:shrink-0">
                    {dayFormat.format(parseLocalDate(day.date))}
                  </p>
                  <Icon className="mt-2 size-6 shrink-0 text-primary lg:mt-0 lg:size-5" aria-hidden="true" />
                  <p className="sr-only">{text.sky[sky]}</p>
                  <p className="mt-2 text-label text-text tabular-nums lg:mt-0 lg:flex-1">
                    <span aria-hidden="true">{fillTemplate(text.temps, { max: day.tempMax, min: day.tempMin })}</span>
                    <span className="sr-only">{fillTemplate(text.tempsLabel, { max: day.tempMax, min: day.tempMin })}</span>
                  </p>
                  <div className="mt-1 text-caption text-text-muted tabular-nums lg:mt-0 lg:text-right">
                    <p>{rainLine(day, text)}</p>
                    {typical && <p className="mt-1 font-bold lg:mt-0">{text.typicalTag}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {hasTypical && <p className="text-caption text-pretty text-text-muted">{text.typical}</p>}
    </div>
  );
}
