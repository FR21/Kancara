import type { Metadata } from "next";
import TripItinerary from "@/components/trips/TripItinerary";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("trip");
}

export default async function TripItineraryPage({ params }: PageProps<"/trips/[id]">) {
  const { id } = await params;
  return <TripItinerary tripId={id} />;
}
