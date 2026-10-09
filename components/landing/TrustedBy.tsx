"use client";

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
import { useInViewAttribute } from "@/lib/use-in-view";

const PLACEHOLDER_LOGOS: { name: string; icon: LucideIcon }[] = [
  { name: "Airline", icon: Plane },
  { name: "Stays", icon: BedDouble },
  { name: "Transit", icon: Bus },
  { name: "Tours", icon: Compass },
  { name: "Outdoor", icon: Mountain },
  { name: "Ferries", icon: Ship },
  { name: "Campus", icon: GraduationCap },
];

export default function TrustedBy({ label }: { label: string }) {
  const ref = useInViewAttribute<HTMLDivElement>();
  const logos = [...PLACEHOLDER_LOGOS, ...PLACEHOLDER_LOGOS];

  return (
    <div ref={ref} className="mt-14">
      <p className="text-center text-caption font-bold tracking-widest text-text-muted uppercase">
        {label}
      </p>
      <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] motion-reduce:[mask-image:none]">
        <ul className="marquee flex w-max items-center motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-y-4">
          {logos.map(({ name, icon: Icon }, index) => {
            const duplicate = index >= PLACEHOLDER_LOGOS.length;
            return (
              <li
                key={`${name}-${index}`}
                aria-hidden={duplicate || undefined}
                className={`group flex shrink-0 items-center gap-3 px-7 text-text-muted/70 transition-colors duration-300 hover:text-primary sm:px-9 ${
                  duplicate ? "motion-reduce:hidden" : ""
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className="size-6 transition-[scale] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-110"
                  strokeWidth={2.25}
                />
                <span className="font-heading text-h3 font-extrabold tracking-tight">{name}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
