"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { OUTLINE_BUTTON } from "@/components/plan/styles";
import { useMessages } from "@/lib/use-messages";

type TripPlaceholderProps = {
  page: "detail" | "today" | "summary";
};

// Stand-in for the pages inside a trip, so My Trips can already link to their
// final URLs. Replace each route's page with the real one when it lands.
export default function TripPlaceholder({ page }: TripPlaceholderProps) {
  const text = useMessages("trips").placeholder;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-28 pb-16 sm:px-6 lg:max-w-5xl lg:pt-32 xl:px-0">
      <h1 className="text-h2 text-text sm:text-h1">{text[page]}</h1>
      <p className="mt-2 text-body text-text-muted">{text.soon}</p>
      <Link href="/trips" className={`${OUTLINE_BUTTON} mt-8`}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        {text.back}
      </Link>
    </main>
  );
}
