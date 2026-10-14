import { CircleCheck, CircleQuestionMark, CircleX } from "lucide-react";
import { BADGE } from "@/components/ui/styles";
import type { Suitability } from "@/lib/client/dietary-scan";

const LOOK: Record<Suitability, { icon: typeof CircleCheck; tone: string }> = {
  safe: { icon: CircleCheck, tone: "bg-success-subtle text-on-success-subtle" },
  warning: { icon: CircleQuestionMark, tone: "bg-warning-subtle text-on-warning-subtle" },
  danger: { icon: CircleX, tone: "bg-error-subtle text-on-error-subtle" },
};

// A verdict as a pill: a colour, an icon, and words, so it never rests on colour alone.
export default function SuitabilityBadge({ status, label }: { status: Suitability; label: string }) {
  const { icon: Icon, tone } = LOOK[status];
  return (
    <span className={`${BADGE} shrink-0 ${tone}`}>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
