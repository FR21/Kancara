import type { Metadata } from "next";
import PlanWorkspace from "@/components/plan/PlanWorkspace";

export const metadata: Metadata = {
  title: "Rencanakan Trip | Kancara",
  description: "Ceritakan kebutuhan rombonganmu dan susun draf rencana trip bersama Kancara.",
};

export default function PlanPage() {
  return <PlanWorkspace />;
}
