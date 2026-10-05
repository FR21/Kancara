"use client";

import Image from "next/image";
import { useState } from "react";
import { fillTemplate } from "@/lib/plan-draft";
import { useMessages } from "@/lib/use-messages";

const SLIDES = [1, 2, 3, 4, 5].map((number) => `/images/auth/auth_img${number}.jpg`);

export default function AuthSlideshow() {
  const text = useMessages("auth").slideshow;
  const brand = useMessages("footer");
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [restLoaded, setRestLoaded] = useState(false);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={text.label}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative mx-4 h-40 min-w-0 overflow-hidden rounded-3xl bg-primary-900 sm:mx-8 lg:sticky lg:top-0 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mx-0 lg:h-dvh lg:rounded-none lg:bg-background"
    >
      <div className="absolute inset-0 lg:mask-[linear-gradient(to_right,black_72%,transparent)]">
        {SLIDES.map((source, index) => {
          if (index > 0 && !restLoaded) return null;
          return (
            <Image
              key={source}
              src={source}
              alt=""
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              preload={index === 0}
              onLoad={index === 0 ? () => setRestLoaded(true) : undefined}
              className={`object-cover transition-[opacity,scale] duration-1000 ease-out motion-reduce:transition-none ${
                index === current ? "scale-100 opacity-100" : "scale-105 opacity-0"
              }`}
            />
          );
        })}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-neutral-950/90 via-neutral-950/50 via-40% to-neutral-950/10"
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 px-4 pb-1 lg:p-12">
        <p className="hidden max-w-md font-heading text-display text-balance text-neutral-50 lg:block">
          {brand.tagline}
        </p>
        <p className="mt-4 hidden max-w-md text-body text-pretty text-neutral-50/85 lg:block">{brand.description}</p>

        <div className="flex gap-2 lg:mt-8">
          {SLIDES.map((source, index) => (
            <button
              key={source}
              type="button"
              onClick={() => setCurrent(index)}
              aria-label={fillTemplate(text.slide, { current: index + 1, total: SLIDES.length })}
              aria-current={index === current ? "true" : undefined}
              className="group flex h-11 max-w-16 flex-1 cursor-pointer items-center"
            >
              <span className="relative h-1 w-full overflow-hidden rounded-full bg-neutral-50/35 transition-colors duration-150 ease-out group-hover:bg-neutral-50/60">
                {index === current && (
                  <span
                    key={current}
                    onAnimationEnd={() => setCurrent((current + 1) % SLIDES.length)}
                    style={{ animationPlayState: paused ? "paused" : "running" }}
                    className="absolute inset-0 origin-left rounded-full bg-neutral-50 motion-safe:animate-slide-progress"
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
