import { Plane } from "lucide-react";

type TripRouteProps = {
  origin: string;
  destinations: string[];
  toLabel: string;
  emptyLabel: string;
  large?: boolean;
};

const EMPTY_MARK = "—";
const DASH = "h-px flex-1 border-t border-dashed border-border-strong";

export default function TripRoute({ origin, destinations, toLabel, emptyLabel, large = false }: TripRouteProps) {
  const destination = destinations.join(" → ");
  if (!origin && !destination) return <p className="text-body-sm text-text-muted">{emptyLabel}</p>;

  const size = large ? "text-h2 lg:text-h1" : "text-h3";
  const cityClass = (name: string) =>
    `min-w-0 font-heading wrap-break-word uppercase ${size} ${name ? "font-extrabold text-text" : "text-text-muted"}`;

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className={cityClass(origin)}>
        {origin || EMPTY_MARK}
      </span>
      <span className="sr-only">{toLabel}</span>
      <span aria-hidden="true" className="flex min-w-10 flex-1 items-center gap-2 text-primary">
        <span className={DASH} />
        <Plane className={large ? "size-5" : "size-4"} />
        <span className={DASH} />
      </span>
      <span className={cityClass(destination)}>
        {destination || EMPTY_MARK}
      </span>
    </p>
  );
}
