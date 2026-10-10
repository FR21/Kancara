import { verifySession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { sessionEndedPath } from "@/lib/auth/routes";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();

  if (!session) {
    redirect(sessionEndedPath("/plan"));
  }

  return <>{children}</>;
}
