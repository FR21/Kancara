import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { type IconButtonTone, iconButtonClass } from "@/components/ui/styles";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> & {
  /** Read aloud and shown on hover, since the button carries no visible words. */
  label: string;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
  tone?: IconButtonTone;
};

// A 44px round button with only an icon in it: closing, removing, moving one step.
export default function IconButton({ label, children, tone = "plain", className = "", type = "button", ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={`${iconButtonClass(tone)} ${className}`} {...rest}>
      {children}
    </button>
  );
}
