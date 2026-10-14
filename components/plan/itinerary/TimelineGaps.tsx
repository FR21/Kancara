import { Armchair, Car } from "lucide-react";
import type { ReactNode } from "react";

type GapRowProps = { icon: ReactNode; children: ReactNode };

// A row between two stops on the day's line: an icon riding on the line, and one short line of words beside it.
function GapRow({ icon, children }: GapRowProps) {
  return (
    <li className="grid grid-cols-[3.5rem_2rem_minmax(0,1fr)] items-center gap-x-3">
      <span aria-hidden="true" />
      <span className="relative z-10 flex justify-center">
        <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-background text-text-muted">
          {icon}
        </span>
      </span>
      <p className="py-2 text-body-sm text-pretty text-text-muted tabular-nums">{children}</p>
    </li>
  );
}

/** How the group gets from one stop to the next: "Car 15 min · 4.2 km". */
export function TravelSegment({ label }: { label: string }) {
  return <GapRow icon={<Car className="size-4" />}>{label}</GapRow>;
}

/** A free stretch long enough to rest in, and who in the group needs it: "Rest 30 min · Grandma, kids". */
export function RestSlot({ label }: { label: string }) {
  return (
    <GapRow icon={<Armchair className="size-4 text-primary" />}>
      <span className="text-text">{label}</span>
    </GapRow>
  );
}
