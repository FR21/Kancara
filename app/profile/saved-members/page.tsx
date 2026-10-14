import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import SavedProfilesWorkspace from "@/components/saved-profiles/SavedProfilesWorkspace";
import { currentViewer } from "@/lib/account";
import { sessionEndedPath } from "@/lib/auth/routes";
import { requestLocale } from "@/lib/locale-server";
import { MESSAGES } from "@/lib/messages";
import { listSavedProfiles } from "@/lib/saved-profiles/store";

const PATH = "/profile/saved-members";

// A page behind the sign-in: it is kept out of search results.
export async function generateMetadata(): Promise<Metadata> {
  const text = MESSAGES[await requestLocale()].savedProfiles;
  return { title: text.metaTitle, description: text.metaDescription, robots: { index: false, follow: false } };
}

export default async function SavedMembersPage() {
  const viewer = await currentViewer();
  if (!viewer) redirect(sessionEndedPath(PATH));

  return (
    <PageShell width="workspace">
      <SavedProfilesWorkspace initial={await listSavedProfiles(viewer)} />
    </PageShell>
  );
}
