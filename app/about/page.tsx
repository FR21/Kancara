import type { Metadata } from "next";
import AboutContent from "@/components/about/AboutContent";
import JsonLd from "@/components/seo/JsonLd";
import { requestLocale } from "@/lib/locale-server";
import { requestMetadata } from "@/lib/seo";
import { questionsGraph } from "@/lib/structured-data";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("about", "/about");
}

export default async function AboutPage() {
  return (
    <>
      <JsonLd data={questionsGraph(await requestLocale())} />
      <AboutContent />
    </>
  );
}
