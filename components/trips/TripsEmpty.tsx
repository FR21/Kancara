import { History, Plus, SearchX, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "@/components/ui/styles";
import EmptyState from "@/components/ui/EmptyState";
import type { Messages } from "@/lib/messages";

type TripsEmptyProps = {
  kind: "active" | "history" | "search";
  text: Messages["trips"];
  planHref: string;
  onClear: () => void;
};

export default function TripsEmpty({ kind, text, planHref, onClear }: TripsEmptyProps) {
  if (kind === "search") {
    return (
      <EmptyState
        icon={SearchX}
        headingLevel={2}
        title={text.empty.searchTitle}
        body={text.empty.search}
        action={
          <button type="button" onClick={onClear} className={OUTLINE_BUTTON}>
            <X className="size-4" aria-hidden="true" />
            {text.history.clear}
          </button>
        }
      />
    );
  }

  if (kind === "history") {
    return (
      <EmptyState icon={History} headingLevel={2} title={text.empty.historyTitle} body={text.empty.history} />
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-12 text-center motion-safe:animate-message-in">
      <Image
        src="/images/logo/kancara_mascot_captain_logo.webp"
        alt=""
        width={500}
        height={500}
        sizes="(min-width: 1024px) 128px, 96px"
        className="size-24 lg:size-32"
      />
      <h2 className="mt-6 text-h2 text-balance text-text">{text.empty.activeTitle}</h2>
      <p className="mt-2 text-body text-pretty text-text-muted">{text.empty.activeBody}</p>
      <Link href={planHref} className={`${PRIMARY_BUTTON} mt-8`}>
        <Plus className="size-4" aria-hidden="true" />
        {text.plan}
      </Link>
    </div>
  );
}
