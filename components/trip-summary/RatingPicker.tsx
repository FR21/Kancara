import { Star } from "lucide-react";
import type { Messages } from "@/lib/messages";
import { plural } from "@/lib/trips/format";

type RatingPickerProps = {
  labelId: string;
  hintId: string;
  value: number | null;
  locale: string;
  text: Messages["tripSummary"]["moments"]["form"];
  onChange: (value: number | null) => void;
};

const STARS = [1, 2, 3, 4, 5];

// One to five stars, or none: a rating is optional, so tapping the chosen star again takes it back.
export default function RatingPicker({ labelId, hintId, value, locale, text, onChange }: RatingPickerProps) {
  return (
    <div role="radiogroup" aria-labelledby={labelId} aria-describedby={hintId} className="-ml-2 flex">
      {STARS.map((star) => {
        const lit = value !== null && star <= value;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={plural(text.ratingStar, star, locale)}
            onClick={() => onChange(value === star ? null : star)}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97]"
          >
            <Star
              aria-hidden="true"
              className={`size-6 transition-colors duration-150 ${lit ? "fill-accent text-accent-500" : "text-border-strong"}`}
            />
          </button>
        );
      })}
    </div>
  );
}
