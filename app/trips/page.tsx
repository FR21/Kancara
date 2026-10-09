import type { Metadata } from "next";
import TripsWorkspace from "@/components/trips/TripsWorkspace";

export const metadata: Metadata = {
  title: "Perjalanan Saya | Kancara",
  description: "Semua perjalananmu di satu tempat: yang sedang berlangsung, yang akan datang, draf, dan riwayat.",
};

export default async function TripsPage({ searchParams }: PageProps<"/trips">) {
  const { tab } = await searchParams;

  return (
    <main className="flex-1 pt-28 pb-16 lg:pt-32">
      <TripsWorkspace initialTab={tab === "history" ? "history" : "active"} />
    </main>
  );
}
