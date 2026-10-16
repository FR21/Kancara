import type { CSSProperties } from "react";
import { BADGE } from "@/components/ui/styles";
import type { DietaryAnalysis } from "@/lib/client/dietary-scan";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import SuitabilityBadge from "./SuitabilityBadge";

type DietaryResultProps = {
  analysis: DietaryAnalysis;
  text: Messages["dietaryScan"]["result"];
  /** Names by member id, to show who each check is for. */
  names: Record<string, string>;
  /** How many members have no food restriction, and so no check of their own. */
  unrestricted: number;
  /** Whether the card is currently re-scanning or updating in place. */
  loading?: boolean;
};

const SURFACE = "rounded-surface border border-border bg-surface p-surface";

/** The result while the photo is read: the verdict's card in outline, so nothing moves when it arrives. */
export function DietaryResultSkeleton() {
  return (
    <div aria-hidden="true" className={`${SURFACE} motion-safe:animate-pulse`}>
      <div className="flex items-start justify-between gap-3">
        <div className="h-7 w-1/2 rounded-lg bg-surface-muted" />
        <div className="h-7 w-28 rounded-full bg-surface-muted" />
      </div>
      <div className="mt-4 h-5 rounded-lg bg-surface-muted" />
      <div className="mt-2 h-5 w-2/3 rounded-lg bg-surface-muted" />
      <div className="mt-6 flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((chip) => (
          <div key={chip} className="h-7 w-20 rounded-full bg-surface-muted" />
        ))}
      </div>
    </div>
  );
}

// What the photo says, as one card in three groups split by hairlines: the verdict for the group, what is in the
// dish, and each member's own verdict.
export default function DietaryResult({ analysis, text, names, unrestricted, loading }: DietaryResultProps) {
  return (
    <section className={`${SURFACE} relative overflow-hidden transition-all duration-200`} aria-busy={loading}>
      {loading && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 flex flex-col justify-between bg-surface/80 p-surface backdrop-blur-[1px] motion-safe:animate-pulse pointer-events-none"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="h-7 w-1/2 rounded-lg bg-surface-muted" />
            <div className="h-7 w-28 rounded-full bg-surface-muted" />
          </div>
          <div className="mt-4 h-5 rounded-lg bg-surface-muted" />
          <div className="mt-2 h-5 w-2/3 rounded-lg bg-surface-muted" />
          <div className="mt-6 flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((chip) => (
              <div key={chip} className="h-7 w-20 rounded-full bg-surface-muted" />
            ))}
          </div>
        </div>
      )}

      <div className={`transition-opacity duration-200 ${loading ? "opacity-25 select-none pointer-events-none" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-h3 text-pretty text-text">{analysis.dishName}</h2>
            {analysis.originalLanguage && (
              <p className="mt-1 text-body-sm text-text-muted">{fillTemplate(text.language, { language: analysis.originalLanguage })}</p>
            )}
          </div>
          <SuitabilityBadge status={analysis.suitability} label={text.status[analysis.suitability]} />
        </div>
        {analysis.summary && <p className="mt-4 text-body text-pretty text-text">{analysis.summary}</p>}

        {analysis.ingredients.length + analysis.doubtfulIngredients.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            {analysis.ingredients.length > 0 && (
              <>
                <h3 className="text-label text-text">{text.ingredients}</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {analysis.ingredients.map((ingredient, index) => (
                    <li
                      key={`seen-${ingredient}`}
                      style={{ "--item-index": index } as CSSProperties}
                      className={`${BADGE} bg-surface-muted text-text motion-safe:animate-list-in`}
                    >
                      <span className="truncate">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {analysis.doubtfulIngredients.length > 0 && (
              <>
                <h3 className={`text-label text-text ${analysis.ingredients.length > 0 ? "mt-4" : ""}`}>{text.doubtful}</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {analysis.doubtfulIngredients.map((ingredient, index) => (
                    <li
                      key={`doubt-${ingredient}`}
                      style={{ "--item-index": index } as CSSProperties}
                      className={`${BADGE} bg-warning-subtle text-on-warning-subtle motion-safe:animate-list-in`}
                    >
                      <span className="truncate">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {analysis.memberChecks.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="text-label text-text">{text.members}</h3>
            <ul className="mt-1 divide-y border-t-0 divide-border">
              {analysis.memberChecks.map((check, index) => (
                <li
                  key={check.memberId}
                  style={{ "--item-index": index } as CSSProperties}
                  className="flex items-start justify-between gap-3 py-3 first:pt-1 last:pb-0 motion-safe:animate-list-in"
                >
                  <div className="min-w-0">
                    <p className="text-label-lg wrap-anywhere text-text">{names[check.memberId] ?? text.unknownMember}</p>
                    {check.reason && <p className="mt-1 text-body-sm text-pretty text-text-muted">{check.reason}</p>}
                  </div>
                  <SuitabilityBadge status={check.status} label={text.memberStatus[check.status]} />
                </li>
              ))}
            </ul>
            {unrestricted > 0 && <p className="mt-4 text-caption text-pretty text-text-muted">{fillTemplate(text.others, { count: unrestricted })}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
