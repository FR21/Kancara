/**
 * A signal that aborts when the caller's does or when the time runs out. AbortSignal.any is missing before
 * Safari 17.4, where every request would otherwise throw before it was sent.
 */
export function withTimeout(signal: AbortSignal | undefined, milliseconds: number): AbortSignal {
  const timeout = AbortSignal.timeout(milliseconds);
  if (!signal) return timeout;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([signal, timeout]);
  const controller = new AbortController();
  const stop = (source: AbortSignal) => controller.abort(source.reason);
  if (signal.aborted) stop(signal);
  else if (timeout.aborted) stop(timeout);
  else {
    signal.addEventListener("abort", () => stop(signal), { once: true });
    timeout.addEventListener("abort", () => stop(timeout), { once: true });
  }
  return controller.signal;
}
