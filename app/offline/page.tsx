import type { Metadata } from "next";
import OfflinePage from "@/components/layout/OfflinePage";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("offline");
}

export default function Offline() {
  return <OfflinePage />;
}
