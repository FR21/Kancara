import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import DietaryScanner from "@/components/dietary-scan/DietaryScanner";
import PageBackdrop from "@/components/layout/PageBackdrop";
import PageShell from "@/components/layout/PageShell";
import { currentViewer } from "@/lib/account";
import { requestMetadata } from "@/lib/seo";
import { getTripPlan } from "@/lib/trips/store";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("trip");
}

export default async function DietaryScanPage({ params }: PageProps<"/trips/[id]/dietary-scan">) {
  const { id } = await params;
  const viewer = await currentViewer();
  if (!viewer) redirect("/login");

  const plan = await getTripPlan(viewer, id);
  if (!plan) notFound();

  // Phone numbers have no part in reading a menu, so they stay on the server.
  const members = plan.draft.members.map((member) => ({ ...member, phone: undefined }));
  return (
    <PageShell width="reading">
      <PageBackdrop />
      <DietaryScanner
        tripId={id}
        tripName={plan.card.name}
        destination={plan.card.destinations.filter(Boolean).join(", ")}
        members={members}
      />
    </PageShell>
  );
}
