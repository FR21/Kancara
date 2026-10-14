import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageBackdrop from "@/components/layout/PageBackdrop";
import PageShell from "@/components/layout/PageShell";
import SplitBillWorkspace from "@/components/split-bill/SplitBillWorkspace";
import { currentViewer } from "@/lib/account";
import { sessionEndedPath } from "@/lib/auth/routes";
import { requestLocale } from "@/lib/locale-server";
import { MESSAGES } from "@/lib/messages";
import { emptyBill } from "@/lib/split-bill/bill";
import { getLatestBill } from "@/lib/split-bill/store";

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = MESSAGES[await requestLocale()].splitBill.meta;
  // A bill belongs to one account, so the page stays out of search results.
  return { title, description, robots: { index: false, follow: false } };
}

// Bills are kept in the account, so a visitor who is not signed in is sent to sign in and brought back here.
export default async function SplitBillPage() {
  const viewer = await currentViewer();
  if (!viewer) redirect(sessionEndedPath("/split-bill"));

  const bill = await getLatestBill(viewer);

  return (
    <PageShell width="workspace">
      <PageBackdrop />
      <SplitBillWorkspace initialBill={bill ?? emptyBill(randomUUID())} stored={bill !== null} />
    </PageShell>
  );
}
