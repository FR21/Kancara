import type { Metadata } from "next";
import AboutContent from "@/components/about/AboutContent";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("about", "/about");
}

export default function AboutPage() {
  return <AboutContent />;
}
