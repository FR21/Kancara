import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentViewer } from "@/lib/account";
import { getProfile } from "@/lib/profile";
import { requestMetadata } from "@/lib/seo";
import ProfileContent from "./ProfileContent";
import { sessionEndedPath } from "@/lib/auth/routes";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("profile");
}

export default async function ProfilePage() {
  const viewer = await currentViewer();
  if (!viewer) redirect(sessionEndedPath("/profile"));

  return (
    <main className="flex-1 pt-28 pb-16 lg:pt-32">
      <ProfileContent email={viewer.email} profile={await getProfile(viewer)} />
    </main>
  );
}
