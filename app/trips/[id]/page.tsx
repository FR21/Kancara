import type { Metadata } from "next";
import TripItinerary from "@/components/trips/TripItinerary";

export const metadata: Metadata = {
  title: "Itinerary | Kancara",
};

export default async function TripItineraryPage({ params }: PageProps<"/trips/[id]">) {
  const { id } = await params;
  return <TripItinerary tripId={id} />;
}
