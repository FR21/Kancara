import type { Metadata } from "next";
import PageBackdrop from "@/components/layout/PageBackdrop";
import TripsWorkspace from "@/components/trips/TripsWorkspace";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("trips");
}

export default async function TripsPage({ searchParams }: PageProps<"/trips">) {
  const { tab } = await searchParams;

  return (
    <main className="relative isolate flex-1 pt-28 pb-16 lg:pt-32">
      <PageBackdrop />
      <TripsWorkspace initialTab={tab === "history" ? "history" : "active"} />
    </main>
  );
}
