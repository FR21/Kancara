import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ConversationTranslatorClient from "@/components/trips/ConversationTranslatorClient";
import { currentViewer } from "@/lib/account";
import { requestMetadata } from "@/lib/seo";
import { getTripPlan } from "@/lib/trips/store";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("trip");
}

export default async function ConversationTranslatorPage({ params }: PageProps<"/trips/[id]">) {
  const { id } = await params;
  const viewer = await currentViewer();

  if (!viewer) {
    redirect("/login");
  }

  const plan = await getTripPlan(viewer, id);
  if (!plan) {
    notFound();
  }

  const destination =
    plan.card.destinations.filter(Boolean).join(", ") ||
    plan.draft.destinations.filter(Boolean).join(", ") ||
    plan.card.name ||
    "";

  return (
    <ConversationTranslatorClient
      tripId={id}
      tripName={plan.card.name}
      destination={destination}
    />
  );
}
