import type { Metadata } from "next";
import { redirect } from "next/navigation";
import TravelMap from "@/components/travel/TravelMap";
import { verifySession } from "@/lib/auth/session";
import { adminAuth } from "@/lib/firebase/admin";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("travelMap");
}

export default async function TravelMapPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  const customToken = await adminAuth.createCustomToken(session.uid);

  return (
    <main className="flex-1 pt-28 pb-16 lg:pt-32">
      <TravelMap uid={session.uid} customToken={customToken} />
    </main>
  );
}
