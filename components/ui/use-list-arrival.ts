"use client";

import { type CSSProperties, useState } from "react";

export type Arrival = { className: string; style?: CSSProperties };

const STILL: Arrival = { className: "" };
const POP: Arrival = { className: "motion-safe:animate-pop-in" };

function staggered(ids: readonly string[], into: Map<string, Arrival>) {
  ids.forEach((id, index) => {
    into.set(id, { className: "motion-safe:animate-list-in", style: { "--item-index": index } as CSSProperties });
  });
}

/**
 * How each item of a list comes in. The items there when the list first shows, and any page of them loaded at
 * once later, arrive one after another; a single item added by the visitor pops in on its own. Each item keeps
 * its entrance, so it does not play again while the list changes around it.
 */
export function useListArrival(ids: readonly string[]): (id: string) => Arrival {
  const key = ids.join("\n");
  const [record, setRecord] = useState(() => {
    const arrivals = new Map<string, Arrival>();
    staggered(ids, arrivals);
    return { key, arrivals };
  });

  let arrivals = record.arrivals;
  if (record.key !== key) {
    const fresh = ids.filter((id) => !arrivals.has(id));
    if (fresh.length > 0) {
      arrivals = new Map(arrivals);
      if (fresh.length === 1) arrivals.set(fresh[0], POP);
      else staggered(fresh, arrivals);
    }
    // Remembering what came before, during render, is how React keeps state that follows a prop.
    setRecord({ key, arrivals });
  }

  return (id) => arrivals.get(id) ?? STILL;
}
