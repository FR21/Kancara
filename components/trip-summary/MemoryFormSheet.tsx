"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import PhotoPicker from "@/components/trip-summary/PhotoPicker";
import RatingPicker from "@/components/trip-summary/RatingPicker";
import SelectField from "@/components/ui/SelectField";
import Sheet from "@/components/ui/Sheet";
import RequiredMark from "@/components/ui/RequiredMark";
import { buttonClass, FIELD_LABEL, INPUT, TEXTAREA, FIELD_DESCRIPTION } from "@/components/ui/styles";
import type { NewMemory, TripMemory, UpdateMemory } from "@/lib/client/trip-memories";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import FieldError from "@/components/ui/FieldError";
import ErrorAlert from "@/components/ui/ErrorAlert";

type MemoryFormSheetProps = {
  open: boolean;
  days: number;
  defaultDay: number;
  initialMemory?: TripMemory | null;
  /** The stops of the itinerary, offered as the place while typing. */
  places: string[];
  /** The group's names, for a memory someone records on another member's behalf. */
  members: string[];
  locale: string;
  text: Messages["tripSummary"]["moments"];
  onClose: () => void;
  onSave: (memory: NewMemory | UpdateMemory) => Promise<void>;
};

// Mirrors the server's limits, so what is typed is what is kept.
const MAX_PLACE_TITLE = 100;
const MAX_NOTE = 1000;

// The form for a new or edited memory.
export default function MemoryFormSheet({
  open,
  days,
  defaultDay,
  initialMemory,
  places,
  members,
  locale,
  text,
  onClose,
  onSave,
}: MemoryFormSheetProps) {
  const formText = text.form;
  const isEditing = Boolean(initialMemory);
  const formId = useId();
  const placeId = useId();
  const placeErrorId = useId();
  const placesId = useId();
  const dayId = useId();
  const ratingLabelId = useId();
  const ratingHintId = useId();
  const noteId = useId();
  const authorId = useId();
  const [placeTitle, setPlaceTitle] = useState(initialMemory?.placeTitle ?? "");
  const [dayNumber, setDayNumber] = useState(initialMemory?.dayNumber ?? defaultDay);
  const [rating, setRating] = useState<number | null>(initialMemory?.rating ?? null);
  const [note, setNote] = useState(initialMemory?.note ?? "");
  const [authorName, setAuthorName] = useState(initialMemory?.authorName ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
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
      await onSave({
        placeTitle: placeTitle.trim(),
        dayNumber,
        note: note.trim(),
        rating,
        authorName,
        photo,
        ...(isEditing ? { removePhoto } : {}),
      });
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
      title={isEditing ? formText.editTitle : formText.title}
      closeLabel={formText.cancel}
      onClose={close}
      footer={
        <>
          <button type="button" onClick={close} disabled={saving} className={`${buttonClass("ghost")} flex-1 basis-32`}>
            {formText.cancel}
          </button>
          <button type="submit" form={formId} disabled={saving} className={`${buttonClass("primary")} flex-1 basis-36`}>
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
              <RequiredMark />
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
              <FieldError id={placeErrorId} role="alert">{formText.placeRequired}</FieldError>
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
            <p id={ratingHintId} className={FIELD_DESCRIPTION}>
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

        <PhotoPicker
          photo={photo}
          initialUrl={initialMemory?.photoUrl}
          removePhoto={removePhoto}
          text={formText}
          onChange={setPhoto}
          onRemovePhoto={setRemovePhoto}
        />

        {failed && (
          <div className="motion-safe:animate-message-in">
            <ErrorAlert message={formText.failed} />
          </div>
        )}
      </form>
    </Sheet>
  );
}
