import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("register", "/register");
}

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children;
}
