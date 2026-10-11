"use client";

import { useEffect } from "react";
import { registerOfflineSupport } from "@/lib/offline";

/** Mounted once in the root layout: starts keeping pages for use without a connection. Renders nothing. */
export default function OfflineReady() {
  useEffect(() => {
    registerOfflineSupport();
  }, []);
  return null;
}
