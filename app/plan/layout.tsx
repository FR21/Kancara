import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { sessionEndedPath } from "@/lib/auth/routes";
import { verifySession } from "@/lib/auth/session";

export default async function PlanLayout({ children }: { children: ReactNode }) {
  const session = await verifySession();
  if (!session) redirect(sessionEndedPath("/plan"));

  return children;
}
