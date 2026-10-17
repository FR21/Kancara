"use client";

import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { type ChangeEvent, useEffect, useId, useRef, useState } from "react";
import { FIELD_LABEL, buttonClass, FIELD_DESCRIPTION } from "@/components/ui/styles";
import { MAX_MEMORY_PHOTO_BYTES, MEMORY_PHOTO_TYPES } from "@/lib/client/trip-memories";
import type { Messages } from "@/lib/messages";
import FieldError from "@/components/ui/FieldError";

type PhotoPickerProps = {
  photo: File | null;
  initialUrl?: string | null;
  removePhoto?: boolean;
  text: Messages["tripSummary"]["moments"]["form"];
  onChange: (photo: File | null) => void;
  onRemovePhoto?: (remove: boolean) => void;
};

// Picks one photo and shows it before it is sent. Asking for JPEG, PNG, or WebP only makes iPhones hand over a
// JPEG instead of their HEIC original.
export default function PhotoPicker({ photo, initialUrl, removePhoto, text, onChange, onRemovePhoto }: PhotoPickerProps) {
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
    if (file && onRemovePhoto) onRemovePhoto(false);
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

  const handleRemove = () => {
    showPreview(null);
    if (onRemovePhoto) onRemovePhoto(true);
  };

  const currentDisplayUrl = preview ?? (!removePhoto ? initialUrl : null);
  const hasPhoto = Boolean(photo || (!removePhoto && initialUrl));

  return (
    <div>
      <p className={FIELD_LABEL}>{text.photo}</p>
      <p id={hintId} className={FIELD_DESCRIPTION}>
        {text.photoHint}
      </p>
      {currentDisplayUrl && (
        <div className="relative mt-2 aspect-4/3 w-full max-w-xs overflow-clip rounded-lg border border-border bg-surface-muted motion-safe:animate-pop-in">
          <Image src={currentDisplayUrl} alt={text.photoPreview} fill unoptimized sizes="320px" className="object-cover" />
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
          {hasPhoto ? text.photoChange : text.photoPick}
        </label>
        {hasPhoto && (
          <button type="button" onClick={handleRemove} className={buttonClass("ghost", "small")}>
            <X className="size-4" aria-hidden="true" />
            {text.photoRemove}
          </button>
        )}
      </div>
      {problem && (
        <FieldError role="alert">{problem}</FieldError>
      )}
    </div>
  );
}
