import type { Metadata } from "next";
import PackingWorkspace from "@/components/trips/PackingWorkspace";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("tripPacking");
}

export default async function TripPackingPage({ params }: PageProps<"/trips/[id]/packing">) {
  const { id } = await params;
  return <PackingWorkspace tripId={id} />;
}
