"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { TEXT_LINK } from "@/components/ui/styles";

type DisclosureProps = {
  /** What the link says while the details are folded away, and while they are shown. */
  showLabel: string;
  hideLabel: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

// Details that matter less than what is around them, folded under one link: the screen leads with what is needed
// now, and the rest is one tap away. The details unfold in place (their height grows from nothing), and while
// folded they are out of the tab order and hidden from screen readers.
export default function Disclosure({ showLabel, hideLabel, children, defaultOpen = false }: DisclosureProps) {
  const regionId = useId();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button type="button" aria-expanded={open} aria-controls={regionId} onClick={() => setOpen((current) => !current)} className={TEXT_LINK}>
        {open ? hideLabel : showLabel}
        <ChevronDown
          className={`size-4 transition-[rotate] duration-200 ease-out ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      <div
        id={regionId}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div inert={!open} className="min-h-0 overflow-hidden">
          <div className="pt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
