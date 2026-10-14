import { Check, LifeBuoy } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";

type SeparatedButtonProps = {
  /** True once the group was told, when the button says the member is back. */
  asked: boolean;
  label: string;
  onPress: () => void;
  className?: string;
};

// The help page's one action, drawn the same in the bar at a phone's bottom edge and in the guide from 1024px:
// filled while it would tell the group, outlined once it has and now only says the member is back.
export default function SeparatedButton({ asked, label, onPress, className = "" }: SeparatedButtonProps) {
  return (
    <button type="button" onClick={onPress} className={`${buttonClass(asked ? "outline" : "primary", "large")} w-full ${className}`}>
      {asked ? <Check className="size-5" strokeWidth={3} aria-hidden="true" /> : <LifeBuoy className="size-5" aria-hidden="true" />}
      {label}
    </button>
  );
}
