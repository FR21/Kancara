"use client";

import Image from "next/image";
import { useState } from "react";
import MemberAvatar from "@/components/ui/MemberAvatar";

type ProfilePhotoProps = {
  src: string | null;
  className?: string;
};

export default function ProfilePhoto({ src, className = "" }: ProfilePhotoProps) {
  // A photo that cannot be loaded (the sign-in provider's link expired, the file is gone) shows the character
  // instead of the browser's broken-image mark. A new address gets its own try.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return <MemberAvatar ageGroup="adult" variant={0} className={className} />;

  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-full bg-surface-muted ${className}`}>
      <Image src={src} alt="" fill unoptimized sizes="128px" onError={() => setFailedSrc(src)} className="object-cover" />
    </span>
  );
}
