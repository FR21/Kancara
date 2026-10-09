import { Plane } from "lucide-react";

const RING = "parallax-top absolute rounded-full border-2 border-dashed";

// The scenery behind the top of a working page: a tinted sky, two dashed route
// rings, a plane, and two waves. Each piece shifts by a different amount as the
// page scrolls, so the header has depth without touching the content on top of
// it. The parent must be `relative isolate`.
export default function PageBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-1/2 -z-10 h-96 w-screen -translate-x-1/2 overflow-clip"
    >
      <div className="absolute inset-0 bg-linear-to-b from-cta to-background" />
      <span className={`${RING} -top-28 right-[6%] size-80 border-accent/60 [--parallax-to:14rem]`} />
      <span className={`${RING} top-16 -left-24 size-64 border-primary/25 [--parallax-to:-7rem]`} />
      <Plane className="parallax-top absolute top-44 left-[6%] hidden size-6 -rotate-12 text-primary/40 [--parallax-to:-12rem] lg:block" />
      <svg
        viewBox="0 0 1440 240"
        preserveAspectRatio="none"
        className="parallax-top absolute inset-x-0 -bottom-20 h-40 w-full fill-background opacity-50 [--parallax-to:-30%]"
      >
        <path d="M0 72C150 44 260 36 380 38C520 40 600 60 760 60C900 60 1020 34 1160 30C1280 27 1380 44 1440 56V240H0Z" />
      </svg>
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="absolute inset-x-0 -bottom-px h-16 w-full fill-background"
      >
        <path d="M0 96C240 54 470 72 720 84S1200 46 1440 80V120H0Z" />
      </svg>
    </div>
  );
}
