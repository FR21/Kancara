"use client";

import { ArrowUpRight, Check, HeartHandshake, Hourglass, Star, Users, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BADGE, EASE } from "@/components/ui/styles";
import { useLocale } from "@/lib/use-locale";
import { useMessages } from "@/lib/use-messages";
import ScrollReveal from "./ScrollReveal";
import TrustedBy from "./TrustedBy";

const MONTHLY_TRAVELLERS = [1010, 1240, 1180, 1620, 1980, 2500, 2950];

const CARD = `group/card h-full rounded-surface border border-border bg-white p-surface dark:bg-neutral-900 transition-[translate,box-shadow,border-color] duration-300 ${EASE} hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5`;
const GROW = `transition-[scale] duration-700 ${EASE}`;
const GLINT =
  "pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-neutral-50/60 to-transparent opacity-0 motion-safe:group-hover/card:animate-glint";

type Figure = {
  prefix: string;
  suffix: string;
  number: number;
  decimals: number;
  thousands: string;
  decimal: string;
};

function parseFigure(text: string): Figure | null {
  const match = text.match(/\d[\d.,]*/);
  if (!match || match.index === undefined) return null;
  const raw = match[0];
  const last = Math.max(raw.lastIndexOf("."), raw.lastIndexOf(","));
  let thousands = "";
  let decimal = ".";
  let decimals = 0;
  if (last >= 0) {
    if (raw.length - last - 1 === 3) {
      thousands = raw[last];
    } else {
      decimal = raw[last];
      decimals = raw.length - last - 1;
      thousands = raw.slice(0, last).match(/[.,]/)?.[0] ?? "";
    }
  }
  const digits = (thousands ? raw.split(thousands).join("") : raw).replace(decimal, ".");
  return {
    prefix: text.slice(0, match.index),
    suffix: text.slice(match.index + raw.length),
    number: parseFloat(digits),
    decimals,
    thousands,
    decimal,
  };
}

function formatFigure(value: number, figure: Figure) {
  const [whole, fraction] = value.toFixed(figure.decimals).split(".");
  const grouped = figure.thousands ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, figure.thousands) : whole;
  return `${figure.prefix}${grouped}${fraction ? figure.decimal + fraction : ""}${figure.suffix}`;
}

function CountUp({ value, className }: { value: string; className: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [progress, setProgress] = useState(1);
  const figure = parseFigure(value);

  useEffect(() => {
    const element = ref.current;
    if (!element || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const elapsed = Math.min((now - start) / 1400, 1);
          setProgress(1 - Math.pow(1 - elapsed, 4));
          if (elapsed < 1) frame = requestAnimationFrame(step);
        };
        setProgress(0);
        frame = requestAnimationFrame(step);
      },
      { rootMargin: "0px 0px 15% 0px" },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <p ref={ref} className={className}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">{figure ? formatFigure(figure.number * progress, figure) : value}</span>
    </p>
  );
}

function CardLabel({
  icon: Icon,
  iconMotion = "group-hover/card:scale-110 group-hover/card:-rotate-8",
  children,
}: {
  icon: typeof Users;
  iconMotion?: string;
  children: string;
}) {
  return (
    <p className="flex items-center gap-2 text-label text-text-muted">
      <Icon
        aria-hidden="true"
        className={`size-4 shrink-0 text-primary transition-[rotate,scale] duration-500 ease-spring ${iconMotion}`}
      />
      {children}
    </p>
  );
}

function parseHours(text: string) {
  const inner = text.match(/\(([^)]+)\)/)?.[1] ?? text;
  return { name: text.split(" (")[0], label: inner, hours: parseFloat(inner.replace(",", ".")) || 0 };
}

function TravellersCard() {
  const t = useMessages("landing").stats;
  const locale = useLocale();
  const monthFormat = new Intl.DateTimeFormat(locale, { month: "short" });
  const numberFormat = new Intl.NumberFormat(locale);
  const months = MONTHLY_TRAVELLERS.map((_, index) => monthFormat.format(new Date(2026, index, 1)));
  const max = Math.max(...MONTHLY_TRAVELLERS);
  const last = MONTHLY_TRAVELLERS.length - 1;

  return (
    <div className={`${CARD} flex flex-col`}>
      <div className="flex items-start justify-between gap-3">
        <CardLabel icon={Users}>{t.card1Label}</CardLabel>
        <span className={`${BADGE} shrink-0 bg-success-subtle text-on-success-subtle`}>
          <ArrowUpRight
            aria-hidden="true"
            strokeWidth={2.5}
            className={`size-4 transition-[translate] duration-300 ${EASE} group-hover/card:translate-x-1 group-hover/card:-translate-y-1`}
          />
          {t.card1Growth}
        </span>
      </div>

      <CountUp
        value={t.card1Value}
        className="mt-2 font-heading text-display font-extrabold tracking-tight text-text"
      />

      <figure className="mt-auto pt-6">
        <div aria-hidden="true" className="flex h-44 items-end gap-2 border-b border-border">
          {MONTHLY_TRAVELLERS.map((value, index) => {
            const current = index === last;
            const height = (value / max) * 100;
            return (
              <div key={months[index]} className="group/bar relative flex h-full flex-1 items-end justify-center">
                <div
                  style={{ height: `${height}%`, transitionDelay: `${200 + index * 70}ms` }}
                  className={`w-full max-w-8 origin-bottom rounded-t-lg transition-[scale,background-color] duration-700 ${EASE} motion-safe:scale-y-0 motion-safe:group-data-visible/reveal:scale-y-100 ${
                    current
                      ? "bg-primary group-hover/bar:bg-primary-hover"
                      : "bg-neutral-300 group-hover/bar:bg-neutral-400 dark:bg-neutral-700 dark:group-hover/bar:bg-neutral-600"
                  }`}
                />
                <span
                  style={{ bottom: `calc(${height}% + 0.5rem)` }}
                  className={`pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-lg px-2 py-1 text-caption font-bold whitespace-nowrap transition-[opacity,translate] duration-200 ${EASE} ${
                    current
                      ? "text-text motion-safe:opacity-0 motion-safe:group-data-visible/reveal:opacity-100 motion-safe:[transition-delay:900ms]"
                      : "translate-y-1 bg-text text-background opacity-0 shadow-md group-hover/bar:translate-y-0 group-hover/bar:opacity-100"
                  }`}
                >
                  {current ? numberFormat.format(value) : `${months[index]} · ${numberFormat.format(value)}`}
                </span>
              </div>
            );
          })}
        </div>
        <div aria-hidden="true" className="mt-2 flex gap-2">
          {months.map((month, index) => (
            <span
              key={month}
              className={`flex-1 text-center text-caption ${index === last ? "font-bold text-text" : "text-text-muted"}`}
            >
              {month}
            </span>
          ))}
        </div>
        <table className="sr-only">
          <caption>{t.card1Label}</caption>
          <tbody>
            {MONTHLY_TRAVELLERS.map((value, index) => (
              <tr key={months[index]}>
                <th scope="row">{months[index]}</th>
                <td>{numberFormat.format(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </div>
  );
}

function NeedsCard() {
  const t = useMessages("landing").stats;
  const share = parseFloat(t.card2Value) || 0;
  const rating = parseFloat(t.card2Rating.replace(",", ".")) || 0;

  return (
    <div className={`${CARD} flex flex-col`}>
      <CardLabel icon={HeartHandshake}>{t.card2Label}</CardLabel>
      <CountUp value={t.card2Value} className="mt-2 font-heading text-h1 font-extrabold tracking-tight text-text" />

      <div
        role="meter"
        aria-label={t.card2Label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={share}
        className="mt-4 h-2 overflow-hidden rounded-full bg-primary-100 dark:bg-primary-950"
      >
        <div
          style={{ width: `${share}%`, transitionDelay: "300ms" }}
          className={`relative h-full origin-left overflow-hidden rounded-full bg-primary ${GROW} motion-safe:scale-x-0 motion-safe:group-data-visible/reveal:scale-x-100`}
        >
          <span aria-hidden="true" className={GLINT} />
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-6">
        <span className="flex gap-1" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((index) => {
            const fill = Math.min(Math.max(rating - index, 0), 1);
            return (
              <span
                key={index}
                style={{ transitionDelay: `${index * 50}ms` }}
                className="relative size-4 transition-[scale] duration-300 ease-spring group-hover/card:scale-125"
              >
                <Star className="absolute inset-0 size-4 text-border" fill="currentColor" strokeWidth={0} aria-hidden="true" />
                <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                  <Star className="size-4 text-accent-400" fill="currentColor" strokeWidth={0} aria-hidden="true" />
                </span>
              </span>
            );
          })}
        </span>
        <span className="text-label text-text">{t.card2Rating}</span>
      </div>
    </div>
  );
}

function TimeCard() {
  const t = useMessages("landing").stats;
  const before = parseHours(t.card3Before);
  const after = parseHours(t.card3WithUs);
  const scale = Math.max(before.hours, after.hours) || 1;
  const rows = [
    { ...before, bar: "bg-neutral-300 dark:bg-neutral-700", text: "text-text-muted", glint: false },
    { ...after, bar: "bg-primary", text: "text-primary font-bold", glint: true },
  ];

  return (
    <div className={`${CARD} flex flex-col`}>
      <CardLabel icon={Hourglass} iconMotion="group-hover/card:rotate-180">
        {t.card3Label}
      </CardLabel>
      <CountUp value={t.card3Value} className="mt-2 font-heading text-h1 font-extrabold tracking-tight text-text" />

      <div className="mt-auto space-y-3 pt-6" role="list">
        {rows.map((row, index) => (
          <div key={row.name} role="listitem">
            <div className="flex items-baseline justify-between text-caption">
              <span className={row.text}>{row.name}</span>
              <span className={`${row.text} tabular-nums`}>{row.label}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-surface-muted">
              <div
                style={{ width: `${(row.hours / scale) * 100}%`, transitionDelay: `${350 + index * 150}ms` }}
                className={`relative h-full origin-left overflow-hidden rounded-full ${row.bar} ${GROW} motion-safe:scale-x-0 motion-safe:group-data-visible/reveal:scale-x-100`}
              >
                {row.glint && <span aria-hidden="true" className={GLINT} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OfflineCard() {
  const t = useMessages("landing").stats;

  return (
    <div
      className={`group/card relative flex h-full items-center justify-between gap-6 overflow-clip rounded-surface bg-night p-surface transition-[translate,box-shadow] duration-300 ${EASE} hover:-translate-y-1 hover:shadow-xl hover:shadow-neutral-950/20`}
    >
      <div
        aria-hidden="true"
        className={`absolute -right-16 -bottom-24 size-64 rounded-full bg-primary-400/10 blur-3xl transition-[scale,opacity] duration-700 ${EASE} group-hover/card:scale-125`}
      />
      <div className="relative max-w-sm">
        <p className="flex items-center gap-2 text-label text-primary-200">
          <WifiOff
            aria-hidden="true"
            className="size-4 shrink-0 text-accent-300 transition-[rotate,scale] duration-500 ease-spring group-hover/card:scale-110 group-hover/card:-rotate-8"
          />
          {t.card4Value}
        </p>
        <p className="mt-2 font-heading text-h1 font-extrabold tracking-tight text-neutral-50">{t.card4Label}</p>
      </div>

      <div aria-hidden="true" className="relative flex shrink-0 flex-col items-center gap-3">
        <div className="flex h-14 items-end gap-2">
          {[30, 55, 78, 100].map((height, index) => (
            <span
              key={height}
              style={{ height: `${height}%`, transitionDelay: `${400 + index * 80}ms` }}
              className={`relative w-3 origin-bottom overflow-clip rounded-full border-2 border-neutral-50/25 ${GROW} motion-safe:scale-y-0 motion-safe:group-data-visible/reveal:scale-y-100`}
            >
              <span
                style={{ animationDelay: `${index * 140}ms` }}
                className="absolute inset-0 bg-neutral-50/70 opacity-0 motion-safe:group-hover/card:animate-signal"
              />
            </span>
          ))}
        </div>
        <span className="flex size-9 items-center justify-center rounded-full bg-success-400 text-neutral-950 transition-[scale] duration-500 ease-spring group-hover/card:scale-115">
          <Check className="size-5" strokeWidth={3} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

export default function StatsSection() {
  const t = useMessages("landing");

  return (
    <section className="relative w-full bg-[linear-gradient(to_bottom,var(--section-muted)_calc(100%_-_12rem),var(--background))] px-4 py-16 sm:px-6 sm:py-24 md:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal className="mb-12 text-center">
          <h2 className="font-heading text-h1 text-balance text-text sm:text-display">
            {t.stats.heading}
          </h2>
          <p className="mt-4 text-body text-pretty text-text-muted">
            {t.stats.subtitle}
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <ScrollReveal className="md:col-span-5">
            <TravellersCard />
          </ScrollReveal>
          <div className="flex flex-col gap-6 md:col-span-7">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <ScrollReveal delayMs={100}>
                <NeedsCard />
              </ScrollReveal>
              <ScrollReveal delayMs={200}>
                <TimeCard />
              </ScrollReveal>
            </div>
            <ScrollReveal delayMs={300}>
              <OfflineCard />
            </ScrollReveal>
          </div>
        </div>

        <ScrollReveal delayMs={150}>
          <TrustedBy label={t.stats.trustedBy} />
        </ScrollReveal>
      </div>
    </section>
  );
}
