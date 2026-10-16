import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

type FieldErrorProps = {
  /** Lets the field point at it with aria-describedby. */
  id?: string;
  /** "alert" for a problem that appears on its own (not tied to a field the person is typing in). */
  role?: "alert" | "status";
  children: ReactNode;
};

// What is wrong with a field, under it: one look on every form. The icon sits in a box as tall as the first line,
// so it stays centred on that line however many lines the message takes.
export default function FieldError({ id, role, children }: FieldErrorProps) {
  return (
    <p id={id} role={role} className="mt-2 flex items-start gap-2 text-body-sm text-pretty text-error motion-safe:animate-message-in">
      <span aria-hidden="true" className="flex h-5 shrink-0 items-center">
        <CircleAlert className="size-4" />
      </span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}
