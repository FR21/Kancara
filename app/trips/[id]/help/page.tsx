import type { Metadata } from "next";
import HelpWorkspace from "@/components/safety/HelpWorkspace";
import { requestMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("tripHelp");
}

export default async function TripHelpPage({ params, searchParams }: PageProps<"/trips/[id]/help">) {
  const { id } = await params;
  const { member } = await searchParams;
  return <HelpWorkspace door={{ kind: "trip", tripId: id }} startWithMember={typeof member === "string" ? member : undefined} />;
}
