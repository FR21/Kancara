import Image from "next/image";
import MemberAvatar from "@/components/plan/MemberAvatar";

type ProfilePhotoProps = {
  src: string | null;
  className?: string;
};

export default function ProfilePhoto({ src, className = "" }: ProfilePhotoProps) {
  if (!src) return <MemberAvatar ageGroup="adult" variant={0} className={className} />;

  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-full bg-surface-muted ${className}`}>
      <Image src={src} alt="" fill unoptimized sizes="128px" className="object-cover" />
    </span>
  );
}
