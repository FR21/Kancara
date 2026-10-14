import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  body: string;
  /** The one thing to do next: a primary button or link. Left out where the way to fill the place is beside it. */
  action?: ReactNode;
  /** Draws the dashed frame of a surface. Leave it off inside a sheet or another surface. */
  framed?: boolean;
  /** Keeps the page's outline in order: one level under the heading of the place it stands in. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
};

const HEADINGS = { 2: "h2", 3: "h3", 4: "h4" } as const;

// What a place says while it holds nothing yet: an icon in a soft circle, what is missing, one sentence on what
// goes here, and the one thing to do about it.
export default function EmptyState({ icon: Icon, title, body, action, framed = true, headingLevel = 3, className = "" }: EmptyStateProps) {
  const Heading = HEADINGS[headingLevel];
  const frame = framed ? "rounded-surface border border-dashed border-border-strong p-surface" : "";
  return (
    <div className={`motion-safe:animate-message-in ${frame} ${className}`}>
      <div className="flex flex-col items-center py-4 text-center">
        <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-primary-subtle text-on-primary-subtle">
          <Icon className="size-6" />
        </span>
        <Heading className="mt-4 text-h3 text-balance text-text">{title}</Heading>
        <p className="mt-2 max-w-md text-body-sm text-pretty text-text-muted">{body}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}
