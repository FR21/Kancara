"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useMediaQuery } from "@/lib/use-media-query";

// The places a trip could go: a beach, a mountain in weather, a forest, a valley, a coast.
const PLACES = [1, 3, 2, 4, 5].map((number) => `/images/auth/auth_img${number}.jpg`);
/** How long each place stays before the next one fades in. */
const PLACE_MS = 7000;

// The scenery behind the opening of a plan: where the trip could go, one place at a time, drifting slowly and
// fading into the next. It is not a picture on the page but the page's own sky: tinted toward the page's colour,
// darkened under the heading so the words stay sharp, and dissolving into the background at its foot and edges,
// so the heading and the plan's steps stand on it rather than beside it. It runs to the screen's edges behind the
// navbar. Still with reduced motion: the first place, without drift or changes. The parent must be relative isolate.
export default function PlanBackdrop() {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [current, setCurrent] = useState(0);
  const [restLoaded, setRestLoaded] = useState(false);

  useEffect(() => {
    if (reduceMotion || !restLoaded) return;
    const timer = window.setInterval(() => setCurrent((index) => (index + 1) % PLACES.length), PLACE_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion, restLoaded]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[min(52rem,115svh)] w-screen -translate-x-1/2 overflow-clip mask-[linear-gradient(to_bottom,black_45%,transparent)] motion-safe:animate-message-in motion-safe:[animation-duration:1200ms]"
    >
      {PLACES.map((source, index) => {
        if (index > 0 && !restLoaded) return null;
        return (
          <Image
            key={source}
            src={source}
            alt=""
            fill
            sizes="100vw"
            priority={index === 0}
            onLoad={index === 0 ? () => setRestLoaded(true) : undefined}
            className={`object-cover saturate-[0.8] transition-opacity duration-1600 ease-out motion-safe:animate-drift ${
              index === current ? "opacity-100" : "opacity-0"
            }`}
          />
        );
      })}
      {/* The page's colour laid over the photo, thicker toward the foot where the content continues. */}
      <div className="absolute inset-0 bg-linear-to-b from-background/55 via-background/70 to-background" />
      {/* A tint of the brand's deep teal, so every place reads as part of the same app. */}
      <div className="absolute inset-0 bg-cta/30 mix-blend-multiply dark:bg-primary-900/30" />
      {/* The heading's side is darker on a wide screen (or lighter, in the light theme), where the words sit. */}
      <div className="absolute inset-0 bg-linear-to-r from-background/85 via-background/40 to-transparent max-lg:hidden" />
      {/* The edges dissolve too, so the photo has no frame. */}
      <div className="absolute inset-0 shadow-[inset_0_0_8rem_2rem_var(--background)]" />
    </div>
  );
}
