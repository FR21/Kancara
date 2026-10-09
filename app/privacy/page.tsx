import type { Metadata } from "next";
import PlaceholderPage from "@/components/placeholder/PlaceholderPage";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("privacy");
}

// Placeholder. Replace with the real page.
export default function Page() {
  return <PlaceholderPage page="privacy" />;
}
