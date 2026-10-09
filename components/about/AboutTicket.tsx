import { Plane } from "lucide-react";
import type { Messages } from "@/lib/messages";

type AboutTicketProps = {
  text: Messages["about"]["pass"];
};

const LABEL = "text-caption font-bold tracking-wider text-text-muted uppercase";
const CITY = "font-heading text-h2 font-extrabold text-balance text-text uppercase lg:text-h1";
// One half of the pass. The notches are cut out of it, so whatever lies behind the ticket shows through them.
const HALF = "ticket-notch overflow-clip bg-surface [--ticket-notch-size:0.75rem]";
const DASH = "h-px flex-1 border-t border-dashed border-border-strong";
const PRINT_START_MS = 700;
const PRINT_STEP_MS = 120;

// Kancara's own boarding pass: where group planning starts and where Kancara
// takes it, printed the way a trip is printed on /plan.
export default function AboutTicket({ text }: AboutTicketProps) {
  return (
    <div className="group/ticket drop-shadow-xl motion-safe:animate-ticket-in">
      <div className={`relative notch-bottom rounded-t-3xl ${HALF}`}>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 bg-linear-to-r from-transparent via-neutral-50/40 to-transparent opacity-0 group-hover/ticket:motion-safe:animate-glint"
        />
        <div className="flex h-12 items-center gap-2 bg-primary px-5 text-on-primary sm:px-8">
          <Plane className="size-4" aria-hidden="true" />
          <p className="text-label-lg">{text.brand}</p>
        </div>

        <div className="grid gap-x-6 gap-y-4 px-5 py-6 sm:grid-cols-[minmax(0,1fr)_minmax(4rem,1fr)_minmax(0,1fr)] sm:items-center sm:px-8 sm:py-8">
          <div>
            <p className={LABEL}>{text.from}</p>
            <p className={`mt-1 ${CITY}`}>{text.origin}</p>
            <p className="mt-2 text-body-sm text-pretty text-text-muted">{text.originNote}</p>
          </div>
          <div aria-hidden="true" className="flex items-center gap-3 text-primary">
            <span className={`hidden sm:block ${DASH}`} />
            <Plane className="size-6 rotate-90 transition-[translate] duration-500 ease-spring group-hover/ticket:translate-y-1 sm:rotate-0 sm:group-hover/ticket:translate-x-3 sm:group-hover/ticket:translate-y-0" />
            <span className={DASH} />
          </div>
          <div className="sm:text-right">
            <p className={LABEL}>{text.to}</p>
            <p className={`mt-1 ${CITY}`}>{text.destination}</p>
            <p className="mt-2 text-body-sm text-pretty text-text-muted">{text.destinationNote}</p>
          </div>
        </div>
      </div>

      <dl
        className={`grid notch-top grid-cols-2 gap-x-4 gap-y-5 rounded-b-3xl border-t border-dashed border-border-strong px-5 py-6 sm:grid-cols-4 sm:px-8 ${HALF}`}
      >
        {text.fields.map((field, index) => (
          <div key={field.label}>
            <dt className={LABEL}>{field.label}</dt>
            {/* Each value prints in after the pass has unrolled, the way a trip prints on /plan. */}
            <dd
              style={{ animationDelay: `${PRINT_START_MS + index * PRINT_STEP_MS}ms` }}
              className="mt-1 rounded-sm font-heading text-h3 font-extrabold text-text motion-safe:animate-pass-print"
            >
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
