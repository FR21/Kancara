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

// The names stand still in a wrapping row: a looping marquee would be motion for decoration only.
export default function TrustedBy({ label }: { label: string }) {
  return (
    <div className="mt-16">
      <p className="text-center text-caption font-bold tracking-widest text-text-muted uppercase">
        {label}
      </p>
      <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
        {PLACEHOLDER_LOGOS.map(({ name, icon: Icon }) => (
          <li key={name} className="flex shrink-0 items-center gap-3 text-text-muted/70">
            <Icon aria-hidden="true" className="size-6" strokeWidth={2.25} />
            <span className="font-heading text-h3 font-extrabold tracking-tight">{name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
