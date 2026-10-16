import type { ReactNode } from "react";
import Breadcrumbs, { type Crumb } from "@/components/layout/Breadcrumbs";
import MobileActionBar from "@/components/layout/MobileActionBar";

type PageHeaderProps = {
  /** The trail to this page; the page itself last. Left out on top-level pages. */
  crumbs?: { label: string; items: Crumb[] };
  title: ReactNode;
  lead?: ReactNode;
  /** Controls that act on the whole page (add, share), beside the title from 640px and under it on a phone. */
  actions?: ReactNode;
  /** Lets a page move focus to its title after a client-side change of view. */
  titleId?: string;
  /** How actions align with the title block: "end" (default, bottom-aligned) or "center" (vertically centered). */
  alignActions?: "end" | "center";
  /**
   * The page's main action on a phone, pinned in a bar at the bottom of the screen where the thumb rests, instead
   * of at the top of a long page. From 640px the page shows its own copy among `actions`.
   */
  mobileAction?: ReactNode;
};

// The top of every app page in one order: where you are, what this is, one sentence on it, what you can do.
export default function PageHeader({ crumbs, title, lead, actions, titleId, alignActions = "end", mobileAction }: PageHeaderProps) {
  const alignClass = alignActions === "center" ? "sm:items-center" : "sm:items-end";
  return (
    <header className="motion-safe:animate-message-in">
      {crumbs && <Breadcrumbs label={crumbs.label} items={crumbs.items} />}
      <div className={`flex flex-col gap-4 sm:flex-row ${alignClass} sm:justify-between ${crumbs ? "mt-4" : ""}`}>
        <div className="min-w-0">
          <h1 id={titleId} tabIndex={titleId ? -1 : undefined} className="text-h2 text-balance text-text outline-none sm:text-h1">
            {title}
          </h1>
          {lead && <p className="mt-2 max-w-2xl text-body text-pretty text-text-muted">{lead}</p>}
        </div>
        {/* On a phone the actions share one row, each as wide as the others, instead of stacking unevenly. */}
        {actions && <div className="flex shrink-0 gap-2 empty:hidden max-sm:*:flex-1">{actions}</div>}
      </div>
      {mobileAction && <MobileActionBar>{mobileAction}</MobileActionBar>}
    </header>
  );
}
