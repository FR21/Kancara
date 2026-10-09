import type { Metadata } from "next";
import TripItinerary from "@/components/trips/TripItinerary";

export const metadata: Metadata = {
  title: "Jadwal hari ini | Kancara",
};

// Until the trip home is built, "open today" shows the itinerary opened on today's date.
export default async function TripTodayPage({ params }: PageProps<"/trips/[id]/today">) {
  const { id } = await params;
  return <TripItinerary tripId={id} openToday />;
}
