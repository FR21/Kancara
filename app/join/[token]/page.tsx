import type { Metadata } from "next";
import JoinPage from "@/components/safety/JoinPage";
import { requestMetadata } from "@/lib/seo";

// An invite link lets its holder into a trip, so search engines are told to stay out.
export async function generateMetadata(): Promise<Metadata> {
  return { ...(await requestMetadata("join")), robots: { index: false, follow: false } };
}

export default async function JoinRoute({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  return <JoinPage token={token} />;
}
