import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("forgotPassword");
}

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
