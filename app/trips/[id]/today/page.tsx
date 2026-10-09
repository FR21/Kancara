import type { Metadata } from "next";
import TripItinerary from "@/components/trips/TripItinerary";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("tripToday");
}

// Until the trip home is built, "open today" shows the itinerary opened on today's date.
export default async function TripTodayPage({ params }: PageProps<"/trips/[id]/today">) {
  const { id } = await params;
  return <TripItinerary tripId={id} openToday />;
}
