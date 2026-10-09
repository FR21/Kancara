"use client";

import { ArrowRight, Check, CircleDashed } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { useMessages } from "@/lib/use-messages";
import { useTilt } from "@/lib/use-tilt";
import AboutTicket from "./AboutTicket";
import ManifestDemo from "./ManifestDemo";

const CONTAINER = "mx-auto w-full max-w-5xl px-4 sm:px-6 xl:px-0";
const SECTION_TITLE = "font-heading text-h1 text-balance text-text sm:text-display";
const LEAD = "text-body text-pretty text-text-muted sm:text-h3";
const LIST_TITLE = "font-sans text-label text-text-muted";
const STAMP_STEP_MS = 90;
// A dashed ring that drifts behind a band at its own pace, echoing the ticket's route line.
const ROUTE_RING =
  "parallax-y pointer-events-none absolute -z-10 aspect-square rounded-full border-2 border-dashed [--parallax-from:10rem] [--parallax-to:-10rem]";

export default function AboutContent() {
  const text = useMessages("about");
  const ticketRef = useTilt<HTMLDivElement>();

  return (
    <main className="flex-1 bg-background text-text">
      <section className="relative isolate overflow-clip pt-32 pb-44 sm:pt-40 lg:pb-52">
        {/* Three layers move at three speeds as the page leaves the top: the sky lags far behind, the
            copy lags a little and fades, and Captain runs ahead.
            The section clips with overflow-clip, not overflow-hidden: a hidden box would become the
            scroll container these layers watch, and they would never move. */}
        <div
          aria-hidden="true"
          className="parallax-top absolute inset-0 -z-20 [--parallax-to:45vh]"
        >
          <Image src="/images/hero/Sky.webp" alt="" fill priority sizes="100vw" className="object-cover object-top" />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-b from-primary-950/75 via-primary-950/35 to-primary-950/65"
        />

        <div className={`${CONTAINER} grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16`}>
          <div className="parallax-top-fade [--parallax-to:16vh]">
            <h1 className="font-heading text-5xl leading-[1.05] font-extrabold tracking-tight text-balance text-white motion-safe:animate-rise-in sm:text-6xl lg:text-7xl">
              {text.hero.headline}{" "}
              <span className="whitespace-nowrap text-accent-300">
                <span className="relative inline-block">
                  {text.hero.underlined}
                  <svg
                    aria-hidden="true"
                    className="absolute -bottom-2 left-0 h-3 w-full"
                    viewBox="0 0 200 12"
                    preserveAspectRatio="none"
                    fill="none"
                  >
                    <path
                      d="M2 10C50 3 150 3 198 10"
                      pathLength={1}
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="1"
                      className="motion-safe:animate-draw motion-safe:[animation-delay:600ms]"
                    />
                  </svg>
                </span>
                {text.hero.headlineEnd}
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-body font-medium text-pretty text-white/90 motion-safe:animate-rise-in motion-safe:[animation-delay:100ms] sm:mt-8 sm:text-h3">
              {text.hero.lead}
            </p>
          </div>

          <div className="parallax-top order-first [--parallax-to:-16vh] lg:order-last">
            <div className="group/captain motion-safe:animate-rise-in motion-safe:[animation-delay:200ms]">
              <div className="motion-safe:animate-float">
                <Image
                  src="/images/logo/kancara_mascot_captain_logo.webp"
                  alt=""
                  width={500}
                  height={500}
                  sizes="(min-width: 1024px) 256px, 128px"
                  priority
                  className="size-32 drop-shadow-xl transition-[rotate,scale] duration-500 ease-spring group-hover/captain:scale-105 group-hover/captain:-rotate-6 lg:size-64"
                />
              </div>
            </div>
          </div>
        </div>

        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -bottom-px h-[clamp(3rem,7vw,6rem)]">
          <svg
            viewBox="0 0 1440 240"
            preserveAspectRatio="none"
            className="parallax-top absolute inset-x-0 top-0 h-[200%] w-full fill-background opacity-40 [--parallax-to:-35%]"
          >
            <path d="M0 72C150 44 260 36 380 38C520 40 600 60 760 60C900 60 1020 34 1160 30C1280 27 1380 44 1440 56V240H0Z" />
          </svg>
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute inset-0 size-full fill-background">
            <path d="M0 96C240 54 470 72 720 84S1200 46 1440 80V120H0Z" />
          </svg>
        </div>
      </section>

      <div className={`${CONTAINER} relative z-10 -mt-28 lg:-mt-36`}>
        <div className="parallax-y [--parallax-from:5rem] [--parallax-to:-5rem]">
          <div
            ref={ticketRef}
            className="transition-transform duration-300 ease-out [transform:perspective(75rem)_rotateX(calc(var(--tilt-y,0deg)*-1))_rotateY(var(--tilt-x,0deg))]"
          >
            <AboutTicket text={text.pass} />
          </div>
        </div>
      </div>

      <section className={`${CONTAINER} py-20 lg:grid lg:grid-cols-[5fr_6fr] lg:items-center lg:gap-16 lg:py-28`}>
        <ScrollReveal from="left" className="lg:parallax-y lg:[--parallax-from:-2rem] lg:[--parallax-to:2rem]">
          <h2 className={SECTION_TITLE}>{text.problem.title}</h2>
          <p className={`mt-6 ${LEAD}`}>{text.problem.body}</p>
          <p className="mt-4 text-body font-bold text-pretty text-primary sm:text-h3 sm:font-semibold">
            {text.problem.answer}
          </p>
        </ScrollReveal>
        <ScrollReveal from="right" delayMs={120} className="mt-10 lg:mt-0">
          <div className="parallax-y [--parallax-from:4rem] [--parallax-to:-4rem]">
            <ManifestDemo text={text.manifest} />
          </div>
        </ScrollReveal>
      </section>

      <section className="relative isolate overflow-clip bg-section-muted py-20 lg:py-28">
        <span aria-hidden="true" className={`${ROUTE_RING} -top-24 -right-32 w-96 border-accent/50 lg:w-[32rem]`} />
        <div className={`${CONTAINER} lg:grid lg:grid-cols-[5fr_7fr] lg:items-start lg:gap-16`}>
          <ScrollReveal className="lg:sticky lg:top-32">
            <h2 className={SECTION_TITLE}>{text.principles.title}</h2>
            <p className={`mt-4 ${LEAD}`}>{text.principles.lead}</p>
          </ScrollReveal>
          <ul className="mt-8 divide-y divide-border-strong/40 lg:mt-0">
            {text.principles.items.map((item, index) => (
              <li key={item.title} className="group/principle py-6 first:pt-0 last:pb-0 lg:py-8">
                <ScrollReveal delayMs={index * 80}>
                  {/* The gold mark draws in when the principle arrives and stretches while it is pointed at. */}
                  <span
                    aria-hidden="true"
                    className="block h-1 w-0 rounded-full bg-accent transition-[width] duration-500 ease-spring group-hover/principle:w-16 motion-safe:group-data-visible/reveal:w-8 motion-safe:group-data-visible/reveal:group-hover/principle:w-16 motion-reduce:w-8"
                  />
                  <h3 className="mt-4 font-heading text-h2 text-balance text-text transition-[translate] duration-300 ease-out motion-safe:group-hover/principle:translate-x-1">
                    {item.title}
                  </h3>
                  <p className="mt-2 max-w-prose text-body text-pretty text-text-muted">{item.body}</p>
                </ScrollReveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${CONTAINER} py-20 lg:py-28`}>
        <ScrollReveal className="max-w-3xl">
          <h2 className={SECTION_TITLE}>{text.status.title}</h2>
          <p className={`mt-6 ${LEAD}`}>{text.status.body}</p>
        </ScrollReveal>
        <ScrollReveal delayMs={120} className="mt-10 grid gap-10 sm:grid-cols-2 sm:gap-16">
          <div>
            <h3 className={LIST_TITLE}>{text.status.nowTitle}</h3>
            <ul className="mt-4 space-y-4">
              {text.status.now.map((entry, index) => (
                <li key={entry} className="flex items-start gap-3 text-body text-pretty text-text">
                  {/* Each check is stamped on, one after another, once the list is on screen. */}
                  <span
                    style={{ animationDelay: `${300 + index * STAMP_STEP_MS}ms` }}
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success motion-safe:opacity-0 motion-safe:group-data-visible/reveal:animate-stamp-in motion-safe:group-data-visible/reveal:opacity-100"
                  >
                    <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                  </span>
                  {entry}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className={LIST_TITLE}>{text.status.nextTitle}</h3>
            <ul className="mt-4 space-y-4">
              {text.status.next.map((entry) => (
                <li key={entry} className="flex items-start gap-3 text-body text-pretty text-text-muted">
                  <CircleDashed className="size-6 shrink-0 motion-safe:animate-turn" aria-hidden="true" />
                  {entry}
                </li>
              ))}
            </ul>
          </div>
        </ScrollReveal>
      </section>

      <section className="relative isolate overflow-clip bg-cta px-4 py-20 sm:px-6 lg:py-28">
        <span aria-hidden="true" className={`${ROUTE_RING} -bottom-40 -left-24 w-80 border-primary/30 lg:w-[28rem]`} />
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <h2 className={SECTION_TITLE}>{text.cta.title}</h2>
          <p className={`mx-auto mt-4 max-w-xl ${LEAD}`}>{text.cta.body}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-6">
            <Link
              href="/plan"
              className="group relative inline-flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-accent-300 px-8 text-label-lg text-neutral-950 shadow-xl shadow-neutral-950/10 transition-[background-color,scale] duration-150 ease-out hover:bg-accent-200 active:scale-[0.97] sm:w-auto"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-neutral-50/70 to-transparent opacity-0 group-hover:motion-safe:animate-glint"
              />
              <span className="relative">{text.cta.primary}</span>
              <ArrowRight
                className="relative size-5 transition-[translate] duration-200 ease-out group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/#story-steps"
              className="inline-flex h-12 items-center justify-center rounded-full px-4 text-label-lg text-text underline-offset-8 hover:underline"
            >
              {text.cta.secondary}
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </main>
  );
}
