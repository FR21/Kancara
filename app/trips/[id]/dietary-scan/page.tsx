import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import DietaryScannerClient from "@/components/trips/DietaryScannerClient";
import { currentViewer } from "@/lib/account";
import { requestMetadata } from "@/lib/seo";
import { getTripPlan } from "@/lib/trips/store";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("trip");
}

export default async function DietaryScanPage({ params }: PageProps<"/trips/[id]">) {
  const { id } = await params;
  const viewer = await currentViewer();

  if (!viewer) {
    redirect("/login");
  }

  const plan = await getTripPlan(viewer, id);
  if (!plan) {
    notFound();
  }

  const members = plan.draft.members || [];
  const destination = plan.card.destinations.join(", ") || "";

  return (
    <DietaryScannerClient
      tripId={id}
      tripName={plan.card.name}
      destination={destination}
      members={members.map((m) => ({
        id: m.id,
        name: m.name,
        allergies: m.allergies || "",
        needs: m.needs || [],
      }))}
    />
  );
}
