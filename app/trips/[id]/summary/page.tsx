import type { Metadata } from "next";
import TripSummary from "@/components/trip-summary/TripSummary";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("trip");
}

export default async function TripSummaryPage({ params }: PageProps<"/trips/[id]/summary">) {
  const { id } = await params;
  return <TripSummary tripId={id} />;
}
