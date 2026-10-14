import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import PageBackdrop from "@/components/layout/PageBackdrop";
import PageShell from "@/components/layout/PageShell";
import ConversationTranslator from "@/components/translator/ConversationTranslator";
import { currentViewer } from "@/lib/account";
import { requestMetadata } from "@/lib/seo";
import { getTripPlan } from "@/lib/trips/store";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("trip");
}

export default async function ConversationTranslatorPage({ params }: PageProps<"/trips/[id]/translator">) {
  const { id } = await params;
  const viewer = await currentViewer();
  if (!viewer) redirect("/login");

  const plan = await getTripPlan(viewer, id);
  if (!plan) notFound();

  const destinations = plan.card.destinations.length > 0 ? plan.card.destinations : plan.draft.destinations;
  return (
    <PageShell width="reading">
      <PageBackdrop />
      <ConversationTranslator tripId={id} tripName={plan.card.name} destination={destinations.filter(Boolean).join(", ")} />
    </PageShell>
  );
}
