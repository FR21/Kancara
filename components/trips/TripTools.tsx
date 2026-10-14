import { Compass, Languages, Luggage, type LucideIcon, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import type { Messages } from "@/lib/messages";

type TripToolsProps = {
  tripId: string;
  text: Messages["trips"]["tools"];
  /** The field pass opens in place rather than on a page of its own. */
  onOpenFieldPass: () => void;
};

type Tool = "packing" | "menuScan" | "translator" | "fieldPass";

const TOOLS: Tool[] = ["packing", "menuScan", "translator", "fieldPass"];

const ICONS: Record<Tool, LucideIcon> = {
  packing: Luggage,
  menuScan: UtensilsCrossed,
  translator: Languages,
  fieldPass: Compass,
};

const PAGES: Record<Exclude<Tool, "fieldPass">, string> = {
  packing: "packing",
  menuScan: "dietary-scan",
  translator: "translator",
};

// Icon over its name, no outline: four quiet shortcuts that read as one row of tools, under the trip's main
// action. The tile's 8px corner sits inside the card's 24px padding (32px corner), so the two stay concentric.
const TILE =
  "group/tool flex min-h-11 min-w-0 cursor-pointer flex-col items-center justify-start gap-2 rounded-lg px-1 py-2 text-center text-caption font-bold text-balance text-text transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97]";
const ICON = "size-5 shrink-0 text-primary transition-[translate] duration-200 ease-out group-hover/tool:-translate-y-0.5";

// The helpers a trip has on the road: packing, reading a menu, talking with people, the offline pass.
export default function TripTools({ tripId, text, onOpenFieldPass }: TripToolsProps) {
  return (
    <ul aria-label={text.label} className="grid grid-cols-4 gap-2">
      {TOOLS.map((tool) => {
        const Icon = ICONS[tool];
        const content = (
          <>
            <Icon className={ICON} aria-hidden="true" />
            {text[tool]}
          </>
        );
        return (
          <li key={tool} className="min-w-0">
            {tool === "fieldPass" ? (
              <button type="button" onClick={onOpenFieldPass} className={`${TILE} w-full`}>
                {content}
              </button>
            ) : (
              <Link href={`/trips/${encodeURIComponent(tripId)}/${PAGES[tool]}`} className={TILE}>
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
