import type { Metadata } from "next";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import CoreFlowSection from "@/components/landing/CoreFlowSection";
import OfflineSection from "@/components/landing/OfflineSection";
import CtaSection from "@/components/landing/CtaSection";
import JsonLd from "@/components/seo/JsonLd";
import { requestLocale } from "@/lib/locale-server";
import { requestMetadata } from "@/lib/seo";
import { siteGraph } from "@/lib/structured-data";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("home", "/");
}

export default async function Home() {
  const locale = await requestLocale();

  return (
    <main className="flex-1 bg-background text-text">
      <JsonLd data={siteGraph(locale)} />
      <HeroSection />
      <StatsSection />
      <CoreFlowSection />
      <div className="relative">
        <OfflineSection />
        <CtaSection page="home" />
      </div>
    </main>
  );
}
