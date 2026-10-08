import { Plane } from "lucide-react";

type TripRouteProps = {
  origin: string;
  destinations: string[];
  toLabel: string;
  emptyLabel: string;
  /** Set on the detail panel's teal band, where the route is printed in the band's own text colour. */
  onBand?: boolean;
};

const EMPTY_MARK = "—";

// The dashed line with a plane is the one piece of the boarding pass that
// travels to this page. A long route wraps: the destination drops under the origin.
export default function TripRoute({ origin, destinations, toLabel, emptyLabel, onBand = false }: TripRouteProps) {
  const destination = destinations.join(" → ");
  const muted = onBand ? "text-on-primary/70" : "text-text-muted";
  if (!origin && !destination) return <p className={`text-body ${muted}`}>{emptyLabel}</p>;

  const filled = onBand ? "font-extrabold text-on-primary" : "font-extrabold text-text";
  const cityClass = (name: string) =>
    `min-w-0 font-heading text-h2 wrap-break-word uppercase sm:text-h1 ${name ? filled : muted}`;
  const dash = `h-px flex-1 border-t border-dashed ${onBand ? "border-on-primary/60" : "border-border-strong"}`;

  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className={cityClass(origin)}>{origin || EMPTY_MARK}</span>
      <span className="sr-only">{toLabel}</span>
      <span aria-hidden="true" className={`flex min-w-12 flex-1 items-center gap-2 ${onBand ? "" : "text-primary"}`}>
        <span className={dash} />
        <Plane className="size-5" />
        <span className={dash} />
      </span>
      <span className={cityClass(destination)}>{destination || EMPTY_MARK}</span>
    </p>
  );
}
