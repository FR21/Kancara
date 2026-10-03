import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import CoreFlowSection from "@/components/landing/CoreFlowSection";
import OfflineSection from "@/components/landing/OfflineSection";
import CtaSection from "@/components/landing/CtaSection";
import ScrollReveal from "@/components/landing/ScrollReveal";

export default function Home() {
  return (
    <main className="flex-1 bg-background text-text">
      <HeroSection />

      <ScrollReveal>
        <StatsSection />
      </ScrollReveal>

      <ScrollReveal delayMs={100}>
        <CoreFlowSection />
      </ScrollReveal>

      <ScrollReveal delayMs={100}>
        <OfflineSection />
      </ScrollReveal>

      <ScrollReveal delayMs={100}>
        <CtaSection />
      </ScrollReveal>
    </main>
  );
}
