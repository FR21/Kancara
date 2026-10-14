import {
  Accessibility,
  Armchair,
  Baby,
  Backpack,
  Bus,
  CloudRain,
  Ear,
  HeartPulse,
  type LucideIcon,
  PenLine,
  Pill,
  Shirt,
  ThermometerSnowflake,
  ThermometerSun,
  TreePine,
  Users,
  Utensils,
  X,
} from "lucide-react";
import Image from "next/image";
import Checkbox from "@/components/ui/Checkbox";
import MemberAvatar from "@/components/ui/MemberAvatar";
import type { Messages } from "@/lib/messages";
import type { PackingItem, PackingReason } from "@/lib/packing";
import { type Member, type NeedCategory, fillTemplate, NEED_CATEGORIES, NEED_CATEGORY_KEYS } from "@/lib/plan-draft";

type PackingRowProps = {
  item: PackingItem;
  label: string;
  reason: string;
  /** How many to pack, shown after the name. Null when there is one, or when the name already says how many. */
  times: number | null;
  /** The member the item is for, with their place in the group for the character's colours. Null for everyone. */
  owner: { member: Member; name: string; index: number } | null;
  checked: boolean;
  text: Messages["packing"];
  onToggle: () => void;
  onRemove: () => void;
};

const REASON_ICONS: Record<Exclude<PackingReason["kind"], "age" | "need" | "captain">, LucideIcon> = {
  basics: Backpack,
  laundry: Shirt,
  rain: CloudRain,
  heat: ThermometerSun,
  cold: ThermometerSnowflake,
  allergy: Pill,
  transport: Bus,
  interest: TreePine,
  own: PenLine,
};

// A need is drawn by its kind: a diet is not a mobility need, and neither is a nap.
const NEED_ICONS: Record<NeedCategory, LucideIcon> = {
  mobility: Accessibility,
  diet: Utensils,
  rest: Armchair,
  sensory: Ear,
  other: Accessibility,
};

function ReasonIcon({ reason }: { reason: PackingReason }) {
  // Captain's reasons carry Captain's own mark instead of an icon.
  if (reason.kind === "captain") return null;
  if (reason.kind === "need") {
    const { need } = reason;
    const category = NEED_CATEGORY_KEYS.find((key) => NEED_CATEGORIES[key].some((entry) => entry === need));
    const NeedIcon = NEED_ICONS[category ?? "other"];
    return <NeedIcon className="size-4 shrink-0" aria-hidden="true" />;
  }
  const ageIcon = reason.kind === "age" && reason.ageGroup === "elderly" ? HeartPulse : Baby;
  const Icon = reason.kind === "age" ? ageIcon : REASON_ICONS[reason.kind];
  return <Icon className="size-4 shrink-0" aria-hidden="true" />;
}

// One thing to pack. Under its name it says who it is for and why it is on the list, which is what lets someone
// packing for another person trust it.
export default function PackingRow({
  item,
  label,
  reason,
  times,
  owner,
  checked,
  text,
  onToggle,
  onRemove,
}: PackingRowProps) {
  const removeLabel = fillTemplate(text.remove, { name: label });

  return (
    <li className="flex items-start gap-1 py-1 pr-1 pl-surface motion-safe:animate-message-in">
      <label className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-start gap-3 py-3">
        <Checkbox checked={checked} onChange={onToggle} />
        <span className="min-w-0 flex-1">
          <span
            className={`block text-label-lg text-pretty wrap-anywhere transition-colors duration-150 ${
              checked ? "text-text-muted line-through" : "text-text"
            } ${item.reason.kind === "captain" ? "motion-safe:animate-pass-print" : ""}`}
          >
            {label}
            {times !== null && times > 1 && (
              <span className="font-normal text-text-muted tabular-nums"> {fillTemplate(text.times, { count: times })}</span>
            )}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-muted">
            {item.essential && (
              <span className="rounded-full border border-primary px-2 py-1 font-bold text-primary">{text.essential}</span>
            )}
            <span className="inline-flex items-center gap-1 font-bold text-text">
              {owner ? (
                <MemberAvatar ageGroup={owner.member.ageGroup} variant={owner.index} className="size-5" />
              ) : (
                <Users className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
              )}
              <span className="min-w-0 wrap-anywhere">{owner ? owner.name : text.everyone}</span>
            </span>
            {item.reason.kind === "captain" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent py-1 pr-2 pl-1 font-bold text-on-accent">
                <Image
                  src="/images/logo/kancara_mascot_captain_logo.webp"
                  alt=""
                  width={16}
                  height={16}
                  className="size-4 rounded-full bg-surface object-cover"
                />
                {text.fromCaptain}
              </span>
            )}
            {reason && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <ReasonIcon reason={item.reason} />
                <span className="min-w-0 wrap-anywhere">{reason}</span>
              </span>
            )}
          </span>
        </span>
      </label>
      <button
        type="button"
        aria-label={removeLabel}
        title={removeLabel}
        onClick={onRemove}
        className="mt-1 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-muted transition-[background-color,color,scale] duration-150 ease-out hover:bg-error-subtle hover:text-error active:scale-[0.95]"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </li>
  );
}
