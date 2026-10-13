import type { Metadata } from "next";
import TripSummaryClient from "@/components/trips/TripSummaryClient";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("trip");
}

export default async function TripSummaryPage({ params }: PageProps<"/trips/[id]">) {
  const { id } = await params;
  return <TripSummaryClient tripId={id} />;
}
