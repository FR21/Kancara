import { withTimeout } from "@/lib/client/abort";
import type { SplitBill } from "@/lib/split-bill/bill";

export class SplitBillError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
}

const BASE_URL = "/api/split-bill";
const REQUEST_TIMEOUT_MS = 15000;
const RATE_LIMIT_WAIT_MS = 1100;

async function send(id: string, init: RequestInit, signal?: AbortSignal, retried = false): Promise<Response> {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(id)}`, {
    ...init,
    signal: withTimeout(signal, REQUEST_TIMEOUT_MS),
  });
  // Every API allows three requests a second; one busy moment is waited out, not shown as a failure.
  if (response.status === 429 && !retried) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
    return send(id, init, signal, true);
  }
  if (!response.ok) throw new SplitBillError(`Split bill request failed with ${response.status}`, response.status);
  return response;
}

export const splitBills = {
  /** Saves the whole bill, creating it the first time. */
  async save(bill: SplitBill, signal?: AbortSignal): Promise<void> {
    await send(
      bill.id,
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bill) },
      signal,
    );
  },

  /** Deletes a bill. One that was never saved, or is already gone, counts as deleted. */
  async remove(id: string): Promise<void> {
    try {
      await send(id, { method: "DELETE" });
    } catch (caught) {
      if (caught instanceof SplitBillError && caught.status === 404) return;
      throw caught;
    }
  },
};
