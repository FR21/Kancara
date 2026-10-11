import type { Metadata } from "next";
import { requestLocale } from "@/lib/locale-server";
import SplitBillClient from "./SplitBillClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  const title = locale === "id" ? "Bagi Tagihan - Kancara" : "Split Bill - Kancara";
  return { title };
}

export default function Page() {
  return <SplitBillClient />;
}
