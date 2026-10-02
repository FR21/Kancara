"use client";

import type { Messages } from "@/lib/messages";
import { useMessages } from "@/lib/use-messages";

// Stand-in for pages that don't exist yet, so the navbar links navigate
// client-side instead of reloading the app. Delete once a real page lands.
export default function PlaceholderPage({ page }: { page: keyof Messages["navbar"]["links"] }) {
  const text = useMessages("navbar");
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 pt-40 pb-24">
      <h1 className="text-display">{text.links[page]}</h1>
    </main>
  );
}
