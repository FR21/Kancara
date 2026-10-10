"use client";

import dynamic from "next/dynamic";
import { useMessages } from "@/lib/use-messages";

function MapPlaceholder() {
  const text = useMessages("travel");
  return (
    <div role="status" className="mx-auto w-full max-w-2xl px-4 lg:max-w-5xl xl:px-0">
      <span className="sr-only">{text.stage.loading}</span>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        <div className="h-9 w-56 rounded-full bg-surface-muted" />
        <div className="mt-4 h-5 w-full max-w-md rounded-full bg-surface-muted" />
        <div className="mx-auto mt-10 aspect-square w-full max-w-md rounded-full bg-surface-muted" />
      </div>
    </div>
  );
}

// The travel map is drawn in the browser only. Country names and their order come from the browser's own
// language data, which can differ from the server's, so rendering the list on both sides would not match.
const TravelMap = dynamic(() => import("./TravelMap"), { ssr: false, loading: MapPlaceholder });

export default function TravelMapLoader({ initialVisited }: { initialVisited: string[] }) {
  return <TravelMap initialVisited={initialVisited} />;
}
