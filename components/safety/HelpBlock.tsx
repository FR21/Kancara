import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/styles";
import type { HelpContext } from "@/components/safety/help-context";

/**
 * The surface every part of the help page stands in: blocks stacked inside, split by hairlines. It clips nothing
 * by itself, since the list of countries opens over its lower edge; a frame whose rows reach its edges adds
 * overflow-clip.
 */
export const HELP_FRAME = "divide-y divide-border rounded-surface border border-border bg-surface";

/** The two buttons that close a form in a block: keep it, or leave things as they were. */
export const SAVE_BUTTON = buttonClass("primary", "small");
export const CANCEL_BUTTON = buttonClass("ghost", "small");

type BlockHeadingProps = {
  id?: string;
  title: string;
  /** One sentence under the title, on what the block is for. */
  hint?: string;
  /** A text action at the far end of the title's row, such as "Change". */
  action?: ReactNode;
};

/** A block's title row, the same height with or without an action beside it. */
export function BlockHeading({ id, title, hint, action }: BlockHeadingProps) {
  return (
    <div>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 id={id} className="min-w-0 text-h3 text-pretty text-text">
          {title}
        </h2>
        {action}
      </div>
      {hint && <p className="text-body-sm text-pretty text-text-muted">{hint}</p>}
    </div>
  );
}

type HelpBlockProps = BlockHeadingProps & { children: ReactNode; className?: string };

/** One block of a help frame: its title row, then what it holds, at the surface's padding. */
export function HelpBlock({ children, className = "", ...heading }: HelpBlockProps) {
  return (
    <section aria-labelledby={heading.id} className={`p-surface ${className}`}>
      <BlockHeading {...heading} />
      {children}
    </section>
  );
}

/** Why a change did not go through: the server failed, or it cannot be kept for later without a connection. */
export function Problem({ context, show }: { context: HelpContext; show: boolean }) {
  if (!show) return null;
  return (
    <p role="alert" className="mt-2 text-caption text-pretty text-error">
      {context.online ? context.text.failed : context.text.offlineOnly}
    </p>
  );
}
