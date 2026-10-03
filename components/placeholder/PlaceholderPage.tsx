"use client";

import type { LegalLink, NavLink } from "@/lib/nav-links";
import { useMessages } from "@/lib/use-messages";

// Stand-in for pages that don't exist yet, so the navbar and footer links
// navigate client-side instead of reloading the app. Delete once a real page lands.
export default function PlaceholderPage({ page }: { page: NavLink["key"] | LegalLink["key"] }) {
  const titles = { ...useMessages("navbar").links, ...useMessages("footer").legal };
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 pt-40 pb-24">
      <h1 className="text-display">{titles[page]}</h1>
    </main>
  );
}
