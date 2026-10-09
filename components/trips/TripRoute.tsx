import type { CSSProperties } from "react";
import { Plane } from "lucide-react";

type TripRouteProps = {
  origin: string;
  destinations: string[];
  toLabel: string;
  emptyLabel: string;
};

const EMPTY_MARK = "—";
const DASH = "h-px flex-1 border-t border-dashed border-on-primary/60";
// An uppercase heading letter is about 0.8em wide on average.
const CHAR_EM = 0.8;
const ONE_LINE = { route: "flex-row items-center gap-x-3 text-[length:var(--route-fit)]", line: "min-w-12 flex-1" };
const STACKED = { route: "flex-col gap-y-1 text-h2", line: "w-full py-1" };
const ONE_LINE_WHEN_WIDE = {
  route: `${STACKED.route} @lg:flex-row @lg:items-center @lg:gap-x-3 @lg:gap-y-0 @lg:text-[length:var(--route-fit)]`,
  line: `${STACKED.line} @lg:w-auto @lg:min-w-12 @lg:flex-1 @lg:py-0`,
};

// A route short enough for a phone sits on one line everywhere, a medium one does once the band is wide, and a
// long one always stacks. The limits are the letter counts that still fit at the smallest heading size.
function layoutFor(letters: number) {
  if (letters <= 16) return ONE_LINE;
  return letters <= 30 ? ONE_LINE_WHEN_WIDE : STACKED;
}

function cityClass(name: string): string {
  return `min-w-0 wrap-break-word ${name ? "font-extrabold text-on-primary" : "text-on-primary/70"}`;
}

// The dashed line with a plane is the one piece of the boarding pass that travels to this page, printed on the
// detail panel's teal band. On one line the letters shrink a little to fit the band. When the route is too long
// for that it stacks on purpose: origin, the dashed line across the band, then the destinations.
export default function TripRoute({ origin, destinations, toLabel, emptyLabel }: TripRouteProps) {
  if (!origin && destinations.length === 0) return <p className="text-body text-on-primary/70">{emptyLabel}</p>;
  // The non-breaking space keeps each arrow on the line of the city it leaves from.
  const destination = destinations.join(" → ");
  const letters = (origin || EMPTY_MARK).length + (destination || EMPTY_MARK).length;
  const layout = layoutFor(letters);
  // The largest size at which every letter, plus 5rem for the dashed line, fits the band's width.
  const fit = `clamp(1.125rem, calc((100cqi - 5rem) / ${(letters * CHAR_EM).toFixed(1)}), 1.875rem)`;

  return (
    <div className="@container">
      <p
        style={{ "--route-fit": fit } as CSSProperties}
        className={`flex font-heading leading-tight uppercase ${layout.route}`}
      >
        <span className={cityClass(origin)}>{origin || EMPTY_MARK}</span>
        <span className="sr-only">{toLabel}</span>
        <span aria-hidden="true" className={`flex items-center gap-2 ${layout.line}`}>
          <span className={DASH} />
          <Plane className="size-5 shrink-0 motion-safe:animate-fly-in" />
          <span className={DASH} />
        </span>
        <span className={cityClass(destination)}>{destination || EMPTY_MARK}</span>
      </p>
    </div>
  );
}
