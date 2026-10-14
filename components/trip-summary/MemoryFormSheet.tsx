"use client";

import { CircleAlert, Loader2 } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import PhotoPicker from "@/components/trip-summary/PhotoPicker";
import RatingPicker from "@/components/trip-summary/RatingPicker";
import SelectField from "@/components/ui/SelectField";
import Sheet from "@/components/ui/Sheet";
import { buttonClass, FIELD_LABEL, INPUT, TEXTAREA } from "@/components/ui/styles";
import type { NewMemory } from "@/lib/client/trip-memories";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";

type MemoryFormSheetProps = {
  open: boolean;
  days: number;
  defaultDay: number;
  /** The stops of the itinerary, offered as the place while typing. */
  places: string[];
  /** The group's names, for a memory someone records on another member's behalf. */
  members: string[];
  locale: string;
  text: Messages["tripSummary"]["moments"];
  onClose: () => void;
  onSave: (memory: NewMemory) => Promise<void>;
};

// Mirrors the server's limits, so what is typed is what is kept.
const MAX_PLACE_TITLE = 100;
const MAX_NOTE = 1000;

// The form for a new memory. It starts empty each time it opens: the album gives it a new key.
export default function MemoryFormSheet({
  open,
  days,
  defaultDay,
  places,
  members,
  locale,
  text,
  onClose,
  onSave,
}: MemoryFormSheetProps) {
  const formText = text.form;
  const formId = useId();
  const placeId = useId();
  const placeErrorId = useId();
  const placesId = useId();
  const dayId = useId();
  const ratingLabelId = useId();
  const ratingHintId = useId();
  const noteId = useId();
  const authorId = useId();
  const [placeTitle, setPlaceTitle] = useState("");
  const [dayNumber, setDayNumber] = useState(defaultDay);
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [triedSaving, setTriedSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const missingPlace = placeTitle.trim() === "";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTriedSaving(true);
    if (missingPlace || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      await onSave({ placeTitle: placeTitle.trim(), dayNumber, note: note.trim(), rating, authorName, photo });
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };

  const close = () => {
    if (!saving) onClose();
  };

  return (
    <Sheet
      open={open}
      title={formText.title}
      closeLabel={formText.cancel}
      onClose={close}
      footer={
        <>
          <button type="button" onClick={close} disabled={saving} className={`${buttonClass("ghost")} flex-1 basis-32`}>
            {formText.cancel}
          </button>
          <button type="submit" form={formId} disabled={saving} className={`${buttonClass("primary")} flex-1 basis-48`}>
            {saving && <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
            {saving ? formText.saving : formText.save}
          </button>
        </>
      }
    >
      {/* Where and when, then how it was, then the photo: fields of one group 16px apart, the groups 24px. */}
      <form id={formId} noValidate onSubmit={submit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor={placeId} className={FIELD_LABEL}>
              {formText.place}
            </label>
            <input
              id={placeId}
              type="text"
              value={placeTitle}
              maxLength={MAX_PLACE_TITLE}
              list={places.length > 0 ? placesId : undefined}
              placeholder={formText.placePlaceholder}
              aria-invalid={triedSaving && missingPlace}
              aria-describedby={triedSaving && missingPlace ? placeErrorId : undefined}
              onChange={(event) => setPlaceTitle(event.target.value)}
              className={`${INPUT} mt-2 aria-invalid:border-error`}
            />
            {places.length > 0 && (
              <datalist id={placesId}>
                {places.map((place) => (
                  <option key={place} value={place} />
                ))}
              </datalist>
            )}
            {triedSaving && missingPlace && (
              <p id={placeErrorId} role="alert" className="mt-2 flex items-start gap-2 text-body-sm text-error">
                <CircleAlert className="mt-1 size-4 shrink-0" aria-hidden="true" />
                {formText.placeRequired}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={dayId} className={FIELD_LABEL}>
                {formText.day}
              </label>
              <SelectField id={dayId} value={dayNumber} onChange={(event) => setDayNumber(Number(event.target.value))} className="mt-2">
                {Array.from({ length: days }, (_, index) => index + 1).map((day) => (
                  <option key={day} value={day}>
                    {fillTemplate(text.day, { day })}
                  </option>
                ))}
              </SelectField>
            </div>
            {members.length > 0 && (
              <div>
                <label htmlFor={authorId} className={FIELD_LABEL}>
                  {formText.author}
                </label>
                <SelectField id={authorId} value={authorName} onChange={(event) => setAuthorName(event.target.value)} className="mt-2">
                  <option value="">{formText.authorSelf}</option>
                  {members.map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </SelectField>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p id={ratingLabelId} className={FIELD_LABEL}>
              {formText.rating}
            </p>
            <p id={ratingHintId} className="mt-1 text-body-sm text-text-muted">
              {formText.ratingOptional}
            </p>
            <RatingPicker
              labelId={ratingLabelId}
              hintId={ratingHintId}
              value={rating}
              locale={locale}
              text={formText}
              onChange={setRating}
            />
          </div>
          <div>
            <label htmlFor={noteId} className={FIELD_LABEL}>
              {formText.note}
            </label>
            <textarea
              id={noteId}
              value={note}
              maxLength={MAX_NOTE}
              rows={3}
              placeholder={formText.notePlaceholder}
              onChange={(event) => setNote(event.target.value)}
              className={`${TEXTAREA} mt-2`}
            />
          </div>
        </div>

        <PhotoPicker photo={photo} text={formText} onChange={setPhoto} />

        {failed && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-error-subtle px-4 py-3 text-body-sm text-on-error-subtle motion-safe:animate-message-in">
            <CircleAlert className="mt-1 size-4 shrink-0 text-error" aria-hidden="true" />
            {formText.failed}
          </p>
        )}
      </form>
    </Sheet>
  );
}
