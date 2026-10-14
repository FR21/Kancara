import { Plane } from "lucide-react";
import type { Messages } from "@/lib/messages";

type AboutRouteCardProps = {
  text: Messages["about"]["pass"];
};

const FIELD_LABEL = "text-caption font-bold text-text-muted";
const PLACE = "mt-1 font-heading text-h2 text-balance text-text lg:text-h1";
const LINE = "h-px flex-1 bg-border-strong";
const PRINT_START_MS = 700;
const PRINT_STEP_MS = 120;

// Where group planning usually starts and where Kancara takes it, on one plain card: the two ends of the route
// with the line between them, then a few facts about Kancara under a hairline.
export default function AboutRouteCard({ text }: AboutRouteCardProps) {
  return (
    <div className="group/route rounded-surface border border-border bg-surface p-surface shadow-xl shadow-neutral-950/10 motion-safe:animate-rise-in">
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-[minmax(0,1fr)_minmax(4rem,1fr)_minmax(0,1fr)] sm:items-center">
        <div>
          <p className={FIELD_LABEL}>{text.from}</p>
          <p className={PLACE}>{text.origin}</p>
          <p className="mt-2 text-body-sm text-pretty text-text-muted">{text.originNote}</p>
        </div>
        <div aria-hidden="true" className="flex items-center gap-3 text-primary">
          <span className={`hidden sm:block ${LINE}`} />
          <Plane className="size-6 rotate-90 transition-[translate] duration-500 ease-spring group-hover/route:translate-y-1 sm:rotate-0 sm:group-hover/route:translate-x-3 sm:group-hover/route:translate-y-0" />
          <span className={LINE} />
        </div>
        <div className="sm:text-right">
          <p className={FIELD_LABEL}>{text.to}</p>
          <p className={PLACE}>{text.destination}</p>
          <p className="mt-2 text-body-sm text-pretty text-text-muted">{text.destinationNote}</p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
        {text.fields.map((field, index) => (
          <div key={field.label}>
            <dt className={FIELD_LABEL}>{field.label}</dt>
            {/* Each value prints in after the card has risen, the way a trip prints on /plan. */}
            <dd
              style={{ animationDelay: `${PRINT_START_MS + index * PRINT_STEP_MS}ms` }}
              className="mt-1 rounded-lg font-heading text-h3 text-text motion-safe:animate-pass-print"
            >
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
