import type { Metadata } from "next";
import PlaceholderPage from "@/components/placeholder/PlaceholderPage";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("terms");
}

// Placeholder. Replace with the real page.
export default function Page() {
  return <PlaceholderPage page="terms" />;
}
