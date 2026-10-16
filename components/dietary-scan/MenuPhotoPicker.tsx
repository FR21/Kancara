"use client";

import { Camera, ImageUp, Loader2, ScanSearch } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import EmptyState from "@/components/ui/EmptyState";
import { buttonClass } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import { useMediaQuery } from "@/lib/use-media-query";

type MenuPhotoPickerProps = {
  text: Messages["dietaryScan"]["picker"];
  /** The chosen photo's address on the phone, or null before one is chosen. */
  previewUrl: string | null;
  busy: "idle" | "preparing" | "scanning";
  /** True once this photo was read: the result below then holds the page's filled button, so scanning again steps back. */
  scanned: boolean;
  onPick: (file: File) => void;
  onScan: () => void;
  /** False while there is no connection: a photo can still be picked, and is scanned once the phone is back online. */
  canScan?: boolean;
};

// The file input sits inside its label, visually hidden but still focusable, so a keyboard opens it with Enter and
// Space and iOS Safari opens it from a tap without the script calling click() on a hidden input. The focus ring
// is drawn on the label.
const PICK_FOCUS = "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary";

function PickButton({ label, icon, primary, camera, onChange }: { label: string; icon: ReactNode; primary: boolean; camera: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className={`${buttonClass(primary ? "primary" : "outline")} ${PICK_FOCUS}`}>
      {icon}
      {label}
      {/* `capture` opens the back camera straight away on Android Chrome and iOS Safari; desktops ignore it. */}
      <input type="file" accept="image/*" capture={camera ? "environment" : undefined} onChange={onChange} className="sr-only" />
    </label>
  );
}

export default function MenuPhotoPicker({ text, previewUrl, busy, scanned, onPick, onScan, canScan = true }: MenuPhotoPickerProps) {
  // A phone has a camera to point at a menu; on a computer both buttons would open the same file picker.
  const touch = useMediaQuery("(pointer: coarse)");

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // The same photo picked twice in a row still reaches onChange.
    event.target.value = "";
    if (file) onPick(file);
  };

  if (!previewUrl) {
    return (
      <EmptyState
        icon={Camera}
        title={text.title}
        body={text.hint}
        headingLevel={2}
        action={
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              {touch && <PickButton label={text.camera} icon={<Camera className="size-4" aria-hidden="true" />} primary camera onChange={pick} />}
              <PickButton
                label={touch ? text.gallery : text.choose}
                icon={<ImageUp className="size-4" aria-hidden="true" />}
                primary={!touch}
                camera={false}
                onChange={pick}
              />
            </div>
            {busy === "preparing" && (
              <p role="status" className="flex items-center gap-2 text-body-sm text-text-muted">
                <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                {text.preparing}
              </p>
            )}
          </div>
        }
      />
    );
  }

  return (
    <div className="grid gap-6 rounded-surface border border-border bg-surface p-surface motion-safe:animate-message-in sm:grid-cols-2">
      {/* A photo on the phone itself, shown through an object URL, which next/image cannot load. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={previewUrl} alt={text.previewAlt} className="max-h-96 w-full rounded-lg bg-surface-muted object-contain motion-safe:animate-pop-in" />
      <div className="flex flex-col justify-center">
        <h2 className="text-h3 text-text">{text.ready}</h2>
        <p className="mt-2 text-body-sm text-pretty text-text-muted">{text.readyHint}</p>
        <div className="mt-6 flex flex-col gap-3">
          <button type="button" onClick={onScan} disabled={busy !== "idle" || !canScan} className={buttonClass(scanned ? "outline" : "primary")}>
            {busy === "scanning" ? (
              <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              <ScanSearch className="size-4" aria-hidden="true" />
            )}
            {busy === "scanning" ? text.scanning : text.scan}
          </button>
          {busy === "idle" && (
            <PickButton label={text.change} icon={<ImageUp className="size-4" aria-hidden="true" />} primary={false} camera={false} onChange={pick} />
          )}
        </div>
      </div>
    </div>
  );
}
