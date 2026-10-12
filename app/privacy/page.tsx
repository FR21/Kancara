import type { Metadata } from "next";
import LegalDocument from "@/components/legal/LegalDocument";
import { requestLocale } from "@/lib/locale-server";
import { MESSAGES } from "@/lib/messages";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("privacy");
}

export default async function Page() {
  const legal = MESSAGES[await requestLocale()].legal;
  return <LegalDocument current="privacy" legal={legal} />;
}
