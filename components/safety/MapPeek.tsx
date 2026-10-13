"use client";

import { ExternalLink } from "lucide-react";
import { OUTLINE_BUTTON } from "@/components/plan/styles";
import type { Messages } from "@/lib/messages";
import type { MeetingPoint } from "@/lib/safety/pack";
import Sheet from "./Sheet";

type MapPeekProps = {
  /** The place shown, or null while the popup is closed. */
  place: MeetingPoint | null;
  online: boolean;
  text: Messages["safety"]["meeting"];
  closeLabel: string;
  onClose: () => void;
};

/** What the map is asked for: the point itself when the place has one, its name and address otherwise. */
function queryOf(place: MeetingPoint): string {
  if (place.latitude !== null && place.longitude !== null) return `${place.latitude},${place.longitude}`;
  return [place.label, place.note].filter(Boolean).join(", ");
}

// The meeting point on a map, inside the page: looking at where to go should not mean leaving for another app and
// finding the way back. It is Google's own embedded map, so it needs a connection; the link under it still opens
// the full map for turn-by-turn directions.
export default function MapPeek({ place, online, text, closeLabel, onClose }: MapPeekProps) {
  const query = place ? encodeURIComponent(queryOf(place)) : "";
  return (
    <Sheet
      open={place !== null}
      title={place?.label ?? ""}
      closeLabel={closeLabel}
      onClose={onClose}
      footer={
        place ? (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${query}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${OUTLINE_BUTTON} w-full`}
          >
            <ExternalLink className="size-4 text-primary" aria-hidden="true" />
            {text.openFull}
          </a>
        ) : undefined
      }
    >
      {place && (
        <>
          {place.note && <p className="text-body-sm text-pretty text-text-muted">{place.note}</p>}
          {online ? (
            <iframe
              title={text.mapLabel}
              src={`https://www.google.com/maps?q=${query}&z=17&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[50dvh] min-h-64 w-full rounded-2xl border border-border bg-surface-muted"
            />
          ) : (
            <p className="rounded-2xl bg-surface-muted px-4 py-6 text-center text-body-sm text-pretty text-text-muted">{text.mapOffline}</p>
          )}
        </>
      )}
    </Sheet>
  );
}
