import type { Metadata } from "next";
import PlanWorkspace from "@/components/plan/PlanWorkspace";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("plan");
}

export default function PlanPage() {
  return <PlanWorkspace />;
}
