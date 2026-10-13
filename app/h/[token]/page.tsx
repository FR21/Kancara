import type { Metadata } from "next";
import HelpWorkspace from "@/components/safety/HelpWorkspace";
import { requestMetadata } from "@/lib/seo";

// A member's own link lets its holder ask for help as that member, so search engines are told to stay out.
export async function generateMetadata(): Promise<Metadata> {
  return { ...(await requestMetadata("tripHelp")), robots: { index: false, follow: false } };
}

export default async function MemberHelpPage({ params }: PageProps<"/h/[token]">) {
  const { token } = await params;
  return <HelpWorkspace door={{ kind: "link", token }} />;
}
