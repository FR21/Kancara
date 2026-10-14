"use client";

import { ArrowRight, Camera, Globe, Users } from "lucide-react";
import Link from "next/link";
import { type ChangeEvent, useRef } from "react";
import ProfilePhoto from "@/components/profile/ProfilePhoto";
import IconButton from "@/components/ui/IconButton";
import { OUTLINE_BUTTON } from "@/components/ui/styles";
import { useMessages } from "@/lib/use-messages";

type ProfileIdentityProps = {
  displayName: string;
  /** The saved username without the @, or an empty string for none. */
  username: string;
  photo: string | null;
  disabled: boolean;
  onPhotoChosen: (event: ChangeEvent<HTMLInputElement>) => void;
};

const PAGE_LINK = `group ${OUTLINE_BUTTON} w-full max-w-xs`;
const LINK_ARROW = "size-4 transition-[translate] duration-200 ease-out group-hover:translate-x-1";

// The column beside the profile form, in three groups: the photo with the button that changes it and what it may
// be, who this is, and the two pages that hang off the profile.
export default function ProfileIdentity({ displayName, username, photo, disabled, onPhotoChosen }: ProfileIdentityProps) {
  const text = useMessages("profile");
  const travel = useMessages("travel");
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section
      aria-label={displayName}
      className="flex flex-col items-center text-center motion-safe:animate-message-in motion-safe:[animation-delay:80ms]"
    >
      <div className="relative">
        <span key={photo ?? "placeholder"} className="block motion-safe:animate-pop-in">
          <ProfilePhoto src={photo} className="size-32" />
        </span>
        <IconButton
          label={text.changePhoto}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="group/camera absolute right-0 bottom-0 border border-border bg-surface shadow-md shadow-neutral-950/10"
        >
          <Camera
            className="size-5 transition-[rotate] duration-200 ease-out group-hover/camera:-rotate-12"
            aria-hidden="true"
          />
        </IconButton>
        <input
          ref={fileInputRef}
          type="file"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onPhotoChosen}
          accept="image/png, image/jpeg, image/webp"
          className="sr-only"
        />
      </div>

      <p className="mt-3 text-caption text-pretty text-text-muted">{text.photoHint}</p>

      <p className="mt-6 max-w-full font-heading text-h2 text-balance wrap-break-word text-text">{displayName}</p>
      {username && <p className="mt-1 max-w-full text-body break-all text-primary">@{username}</p>}

      <Link href="/profile/map" className={`${PAGE_LINK} mt-8`}>
        <Globe
          className="size-4 text-primary transition-[rotate] duration-500 ease-out group-hover:rotate-45"
          aria-hidden="true"
        />
        {travel.open}
        <ArrowRight className={LINK_ARROW} aria-hidden="true" />
      </Link>
      <Link href="/profile/saved-members" className={`${PAGE_LINK} mt-2`}>
        <Users
          className="size-4 text-primary transition-[scale] duration-200 ease-out group-hover:scale-110"
          aria-hidden="true"
        />
        {text.savedMembersLink}
        <ArrowRight className={LINK_ARROW} aria-hidden="true" />
      </Link>
    </section>
  );
}
