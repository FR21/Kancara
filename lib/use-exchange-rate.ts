import { useEffect, useState } from "react";
import { fetchExchangeRate } from "@/lib/api/exchange-rate";
import { type ExchangeRate, ESTIMATED_RATE } from "@/lib/currency";

let liveRate: ExchangeRate | null = null;

/** The dollar rate to convert with: the built-in estimate at first, then the live rate once it has loaded. */
export function useExchangeRate(): ExchangeRate {
  const [rate, setRate] = useState(liveRate ?? ESTIMATED_RATE);

  useEffect(() => {
    if (liveRate) return;
    const controller = new AbortController();
    fetchExchangeRate(controller.signal)
      .then((loaded) => {
        // Only a dated rate is kept for the session; an estimate from the server is tried again next time.
        if (loaded.date) liveRate = loaded;
        setRate(loaded);
      })
      // Offline or the rate service is down: the estimate stays in use.
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return rate;
}
