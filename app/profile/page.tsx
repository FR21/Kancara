import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentViewer } from "@/lib/account";
import { getProfile } from "@/lib/profile";
import { requestMetadata } from "@/lib/seo";
import PageShell from "@/components/layout/PageShell";
import ProfileWorkspace from "@/components/profile/ProfileWorkspace";
import { sessionEndedPath } from "@/lib/auth/routes";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("profile");
}

export default async function ProfilePage() {
  const viewer = await currentViewer();
  if (!viewer) redirect(sessionEndedPath("/profile"));

  return (
    <PageShell width="workspace">
      <ProfileWorkspace email={viewer.email} profile={await getProfile(viewer)} />
    </PageShell>
  );
}
