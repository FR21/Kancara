import type { Metadata } from "next";
import { redirect } from "next/navigation";
import TravelMapLoader from "@/components/travel/TravelMapLoader";
import { currentViewer } from "@/lib/account";
import { requestMetadata } from "@/lib/seo";
import { listVisited } from "@/lib/travel/visited-store";
import { sessionEndedPath } from "@/lib/auth/routes";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("travelMap");
}

export default async function TravelMapPage() {
  const viewer = await currentViewer();
  if (!viewer) redirect(sessionEndedPath("/profile/map"));

  return (
    <main className="flex-1 pt-28 pb-16 lg:pt-32">
      <TravelMapLoader initialVisited={await listVisited(viewer)} />
    </main>
  );
}
