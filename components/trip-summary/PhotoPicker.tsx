"use client";

import { CircleAlert, ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { type ChangeEvent, useEffect, useId, useRef, useState } from "react";
import { FIELD_LABEL, buttonClass } from "@/components/ui/styles";
import { MAX_MEMORY_PHOTO_BYTES, MEMORY_PHOTO_TYPES } from "@/lib/client/trip-memories";
import type { Messages } from "@/lib/messages";

type PhotoPickerProps = {
  photo: File | null;
  text: Messages["tripSummary"]["moments"]["form"];
  onChange: (photo: File | null) => void;
};

// Picks one photo and shows it before it is sent. Asking for JPEG, PNG, or WebP only makes iPhones hand over a
// JPEG instead of their HEIC original.
export default function PhotoPicker({ photo, text, onChange }: PhotoPickerProps) {
  const inputId = useId();
  const hintId = useId();
  const [problem, setProblem] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // The preview's address holds the file in memory until it is let go, here or when the form closes.
  const previewRef = useRef<string | null>(null);

  const showPreview = (file: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = file ? URL.createObjectURL(file) : null;
    setPreview(previewRef.current);
    onChange(file);
  };

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // The same file can be picked again after it was removed.
    event.target.value = "";
    if (!file) return;
    if (!MEMORY_PHOTO_TYPES.includes(file.type)) {
      setProblem(text.photoWrongType);
      return;
    }
    if (file.size > MAX_MEMORY_PHOTO_BYTES) {
      setProblem(text.photoTooLarge);
      return;
    }
    setProblem(null);
    showPreview(file);
  };

  return (
    <div>
      <p className={FIELD_LABEL}>{text.photo}</p>
      <p id={hintId} className="mt-1 text-body-sm text-text-muted">
        {text.photoHint}
      </p>
      {preview && (
        <div className="relative mt-2 aspect-4/3 w-full max-w-xs overflow-clip rounded-lg border border-border bg-surface-muted motion-safe:animate-pop-in">
          <Image src={preview} alt={text.photoPreview} fill unoptimized sizes="320px" className="object-cover" />
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-3">
        <input
          id={inputId}
          type="file"
          accept={MEMORY_PHOTO_TYPES.join(",")}
          aria-describedby={hintId}
          onChange={pick}
          className="peer sr-only"
        />
        <label
          htmlFor={inputId}
          className={`${buttonClass("outline", "small")} peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary`}
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          {photo ? text.photoChange : text.photoPick}
        </label>
        {photo && (
          <button type="button" onClick={() => showPreview(null)} className={buttonClass("ghost", "small")}>
            <X className="size-4" aria-hidden="true" />
            {text.photoRemove}
          </button>
        )}
      </div>
      {problem && (
        <p role="alert" className="mt-2 flex items-start gap-2 text-body-sm text-error">
          <CircleAlert className="mt-1 size-4 shrink-0" aria-hidden="true" />
          {problem}
        </p>
      )}
    </div>
  );
}
