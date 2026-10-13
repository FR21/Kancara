"use client";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { useMessages } from "@/lib/use-messages";

// Stand-in for the summary of a finished trip, so My Trips can already link to
// its final URL. Replace the route's page with the real one when it lands.
export default function TripPlaceholder() {
  const text = useMessages("trips").placeholder;
  const navText = useMessages("navbar");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:max-w-5xl xl:px-0">
      <Breadcrumbs label={navText.breadcrumb} items={[{ label: navText.links.trips, href: "/trips" }, { label: text.summary }]} />
      <h1 className="mt-2 text-h2 text-text sm:text-h1">{text.summary}</h1>
      <p className="mt-2 text-body text-text-muted">{text.soon}</p>
    </main>
  );
}
