"use client";

import { useEffect } from "react";

/** Mounted once in the root layout: starts keeping pages for use without a connection. Renders nothing. */
export default function OfflineReady() {
  useEffect(() => {
    const register = () => {
      import("@/lib/offline")
        .then(({ registerOfflineSupport }) => {
          registerOfflineSupport();
        })
        .catch(() => undefined);
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(register);
      return () => (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
    } else {
      const timer = setTimeout(register, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  return null;
}
