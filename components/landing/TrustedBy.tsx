import {
  BedDouble,
  Bus,
  Compass,
  GraduationCap,
  Mountain,
  Plane,
  Ship,
  type LucideIcon,
} from "lucide-react";

const PLACEHOLDER_LOGOS: { name: string; icon: LucideIcon }[] = [
  { name: "Airline", icon: Plane },
  { name: "Stays", icon: BedDouble },
  { name: "Transit", icon: Bus },
  { name: "Tours", icon: Compass },
  { name: "Outdoor", icon: Mountain },
  { name: "Ferries", icon: Ship },
  { name: "Campus", icon: GraduationCap },
];

function Logos({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-12 pr-12">
      {PLACEHOLDER_LOGOS.map(({ name, icon: Icon }) => (
        <li key={name} className="flex shrink-0 items-center gap-3 text-text-muted/70">
          <Icon aria-hidden="true" className="size-6" strokeWidth={2.25} />
          <span className="font-heading text-h3 font-extrabold tracking-tight whitespace-nowrap">{name}</span>
        </li>
      ))}
    </ul>
  );
}

// The names drift past in one endless row that pauses under the pointer. The list is drawn twice so the row loops
// without a seam; the copy is hidden from assistive technology. With reduced motion the row stands still.
export default function TrustedBy({ label }: { label: string }) {
  return (
    <div className="mt-16">
      <p className="text-center text-caption font-bold tracking-widest text-text-muted uppercase">{label}</p>
      <div className="mt-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max motion-safe:animate-marquee">
          <Logos />
          <Logos hidden />
        </div>
      </div>
    </div>
  );
}
