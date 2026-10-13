"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isAuthRoute } from "@/lib/auth/routes";

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The page a stranger reaches by scanning a meeting card carries none of the site's own navigation either, and
  // neither do the group's invite page and the help page a member opens from their own link: whoever opens those
  // may have no account to navigate with.
  if (isAuthRoute(pathname) || ["/f/", "/h/", "/join/"].some((path) => pathname.startsWith(path))) return null;
  return <>{children}</>;
}
