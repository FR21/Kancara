import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import CoreFlowSection from "@/components/landing/CoreFlowSection";
import OfflineSection from "@/components/landing/OfflineSection";
import CtaSection from "@/components/landing/CtaSection";

export default function Home() {
  return (
    <main className="flex-1 bg-background text-text">
      <HeroSection />
      <StatsSection />
      <CoreFlowSection />
      <OfflineSection />
      <CtaSection />
    </main>
  );
}
