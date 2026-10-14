import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { INPUT } from "@/components/ui/styles";

/**
 * A native select drawn like every other field. The browser's own arrow sits against the edge, so it is hidden
 * and one is drawn at the field's inset. `className` places the field; the select itself keeps the INPUT look.
 */
export default function SelectField({ className = "", children, ...props }: ComponentProps<"select">) {
  return (
    <div className={`relative ${className}`}>
      <select {...props} className={`${INPUT} cursor-pointer appearance-none pr-12 disabled:cursor-not-allowed disabled:opacity-40`}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-text-muted" />
    </div>
  );
}
