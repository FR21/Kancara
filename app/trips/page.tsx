import type { Metadata } from "next";
import PageBackdrop from "@/components/layout/PageBackdrop";
import PageShell from "@/components/layout/PageShell";
import TripsWorkspace from "@/components/trips/TripsWorkspace";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("trips");
}

export default async function TripsPage({ searchParams }: PageProps<"/trips">) {
  const { tab } = await searchParams;

  return (
    <PageShell width="workspace">
      <PageBackdrop />
      <TripsWorkspace initialTab={tab === "history" ? "history" : "active"} />
    </PageShell>
  );
}
