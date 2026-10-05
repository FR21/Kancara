"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isAuthRoute } from "@/lib/auth/routes";

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isAuthRoute(pathname)) return null;
  return <>{children}</>;
}
