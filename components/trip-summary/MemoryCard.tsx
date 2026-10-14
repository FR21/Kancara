import { Star, Trash2 } from "lucide-react";
import Image from "next/image";
import IconButton from "@/components/ui/IconButton";
import type { TripMemory } from "@/lib/client/trip-memories";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";

type MemoryCardProps = {
  memory: TripMemory;
  locale: string;
  text: Messages["tripSummary"]["moments"];
  onRemove: (memory: TripMemory) => void;
};

const STARS = [1, 2, 3, 4, 5];
const TIME_ZONE = "Asia/Jakarta";

function savedOn(createdAt: string, locale: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: TIME_ZONE }).format(date);
}

export default function MemoryCard({ memory, locale, text, onRemove }: MemoryCardProps) {
  const author = memory.authorName || text.someone;
  const date = savedOn(memory.createdAt, locale);

  // The photo, then what the moment is (the place, its stars, the story), then a footer of when and by whom,
  // with the one action the card has.
  return (
    <article className="surface-compact flex w-full flex-col rounded-surface border border-border bg-surface p-surface">
      {memory.photoUrl && (
        <div className="relative mb-3 aspect-4/3 w-full overflow-clip rounded-lg bg-surface-muted">
          {/* Served by the API to the group only, so it cannot pass through the image optimizer. */}
          <Image
            src={memory.photoUrl}
            alt={fillTemplate(text.photoAlt, { place: memory.placeTitle })}
            fill
            unoptimized
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-h3 text-pretty wrap-break-word text-text">{memory.placeTitle}</h2>
          {memory.rating !== null && (
            <span className="mt-1 flex shrink-0 items-center gap-1">
              <span className="sr-only">{fillTemplate(text.rating, { rating: memory.rating })}</span>
              {STARS.map((star) => (
                <Star
                  key={star}
                  aria-hidden="true"
                  className={`size-4 ${star <= (memory.rating ?? 0) ? "fill-warning text-warning" : "text-border-strong"}`}
                />
              ))}
            </span>
          )}
        </div>
        {memory.note && <p className="mt-2 text-body-sm text-pretty wrap-break-word whitespace-pre-line text-text-muted">{memory.note}</p>}
      </div>
      <div className="mt-4 flex min-h-11 items-center justify-between gap-2 border-t border-border pt-1">
        <p className="min-w-0 text-caption text-pretty text-text-muted">
          {[fillTemplate(text.day, { day: memory.dayNumber }), fillTemplate(text.by, { name: author }), date].filter(Boolean).join(" · ")}
        </p>
        {memory.removable && (
          <IconButton
            label={fillTemplate(text.remove, { place: memory.placeTitle })}
            onClick={() => onRemove(memory)}
            className="group/remove -mr-2"
          >
            <Trash2 className="size-4 text-text-muted transition-colors duration-150 group-hover/remove:text-error" aria-hidden="true" />
          </IconButton>
        )}
      </div>
    </article>
  );
}
