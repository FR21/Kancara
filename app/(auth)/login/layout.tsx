import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("login", "/login");
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
