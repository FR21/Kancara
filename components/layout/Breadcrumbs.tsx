import { ChevronRight } from "lucide-react";
import Link from "next/link";

export type Crumb = { label: string; href?: string; loading?: boolean };

type BreadcrumbsProps = {
  /** What a screen reader calls the trail. */
  label: string;
  /** The way here from the top, the page itself last. Every item but the last carries a link. */
  items: Crumb[];
};

// Where a page sits, as the trail that leads to it: every step back is one tap, not only the last one. It stands
// where a lone "back" link used to. A long name in the middle is cut short so the page's own name stays in view.
export default function Breadcrumbs({ label, items }: BreadcrumbsProps) {
  return (
    <nav aria-label={label}>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1 text-label">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${index}-${item.label}`} className="flex min-w-0 items-center gap-x-1">
              {index > 0 && <ChevronRight className="size-4 shrink-0 text-text-muted" aria-hidden="true" />}
              {item.loading ? (
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-28 rounded-full bg-surface-muted motion-safe:animate-pulse"
                />
              ) : item.href && !last ? (
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 max-w-40 items-center rounded-sm text-primary underline-offset-4 transition-[color] duration-150 ease-out hover:underline sm:max-w-64"
                >
                  <span className="truncate">{item.label}</span>
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="inline-flex min-h-11 max-w-48 items-center text-text-muted sm:max-w-80">
                  <span className="truncate">{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
