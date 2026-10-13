import type { Metadata } from "next";
import FinderPage from "@/components/safety/FinderPage";
import { requestMetadata } from "@/lib/seo";

// A card's address is a secret between the card and whoever scans it, so search engines are told to stay out.
export async function generateMetadata(): Promise<Metadata> {
  return { ...(await requestMetadata("finder")), robots: { index: false, follow: false } };
}

export default async function FinderRoute({ params }: PageProps<"/f/[token]">) {
  const { token } = await params;
  return <FinderPage token={token} />;
}
