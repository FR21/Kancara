"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SplitBillError, splitBills } from "@/lib/client/split-bill";
import { type SplitBill, hasContent } from "@/lib/split-bill/bill";

export type SaveStatus = "idle" | "pending" | "saved" | "failed" | "conflict";

// Long enough that typing a run of changes sends one save, short enough that a closed tab rarely loses anything.
const SAVE_DELAY_MS = 800;

/**
 * Keeps the bill saved to the account: a short while after each change the whole bill is sent. Saves run one
 * after another, never side by side, so an older bill can never land after a newer one.
 */
export function useBillAutosave(bill: SplitBill, initiallyStored: boolean) {
  const [savedBill, setSavedBill] = useState(bill);
  const [stored, setStored] = useState(initiallyStored);
  const [problem, setProblem] = useState<"failed" | "conflict" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const latestRef = useRef(bill);
  const savedRef = useRef(bill);

  useEffect(() => {
    latestRef.current = bill;
  });

  /** Runs a request after every save already asked for. */
  const enqueue = useCallback(<Result>(task: () => Promise<Result>): Promise<Result> => {
    const run = queueRef.current.then(task, task);
    queueRef.current = run.catch(() => undefined);
    return run;
  }, []);

  const save = useCallback(
    (next: SplitBill) =>
      enqueue(() => (savedRef.current === next ? Promise.resolve() : splitBills.save(next))).then(
        () => {
          savedRef.current = next;
          setSavedBill(next);
          setStored(true);
          setProblem(null);
        },
        (caught: unknown) => setProblem(caught instanceof SplitBillError && caught.status === 409 ? "conflict" : "failed"),
      ),
    [enqueue],
  );

  const changed = bill !== savedBill;
  const worthSaving = stored || hasContent(bill);

  useEffect(() => {
    if (!changed || !worthSaving) return;
    const timer = setTimeout(() => save(bill), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [bill, changed, worthSaving, attempt, save]);

  // Leaving for another page of the app would drop a save still waiting for its delay, so it is sent at once.
  useEffect(
    () => () => {
      if (latestRef.current !== savedRef.current && hasContent(latestRef.current)) save(latestRef.current);
    },
    [save],
  );

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (latestRef.current === savedRef.current || !hasContent(latestRef.current)) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  /** Records a bill as already saved (or as never saved), so it is not sent again. */
  const markSaved = useCallback((next: SplitBill, isStored: boolean) => {
    savedRef.current = next;
    setSavedBill(next);
    setStored(isStored);
    setProblem(null);
  }, []);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  let status: SaveStatus = "idle";
  if (problem) status = problem;
  else if (changed && worthSaving) status = "pending";
  else if (stored) status = "saved";

  return { status, retry, enqueue, markSaved };
}
