import type { CSSProperties } from "react";
import type { AgeGroup } from "@/lib/plan-draft";

type MemberAvatarProps = {
  ageGroup: AgeGroup;
  variant: number;
  className?: string;
};

const TONES = ["var(--primary)", "var(--accent)", "var(--secondary)", "var(--success)"];

/** The colour a member is drawn in, by their place in the group: their character's and their line's. */
export function memberTone(variant: number): string {
  return TONES[variant % TONES.length];
}
const LOOKS = 3;

const BODY: Record<AgeGroup, string> = {
  adult: "M10 64c0-13 9.5-20 22-20s22 7 22 20z",
  elderly: "M11 64c0-12 9-19 21-19s21 7 21 19z",
  child: "M14 64c0-11 8-17 18-17s18 6 18 17z",
  toddler: "M17 64c0-9 6.5-14 15-14s15 5 15 14z",
};

const HEAD: Record<AgeGroup, { cy: number; r: number }> = {
  adult: { cy: 27, r: 13 },
  elderly: { cy: 27, r: 13 },
  child: { cy: 30, r: 12.5 },
  toddler: { cy: 32, r: 13 },
};

const SHORT_HAIR = "M19 27c0-9.5 5.5-14.5 13-14.5S45 17.5 45 27c-2.5-5-6.5-7.5-13-7.5S21.5 22 19 27z";
const LONG_HAIR =
  "M17 42V27c0-10 6.5-15 15-15s15 5 15 15v15h-5V27.5c-2.500-5-6-7.500-10-7.500s-7.500 2.500-10 7.500V42z";

function AdultHair({ look, className }: { look: number; className: string }) {
  if (look === 1) return <path d={LONG_HAIR} className={className} />;
  return (
    <>
      <path d={SHORT_HAIR} className={className} />
      {look === 2 && <circle cx="32" cy="11.5" r="4.5" className={className} />}
    </>
  );
}

function ChildHair({ look }: { look: number }) {
  if (look === 1) {
    return (
      <>
        <path d="M19.5 29c0-9 5.5-13.5 12.5-13.5S44.500 20 44.500 29c-3-4.500-7-6.500-12.500-6.500S22.500 24.500 19.500 29z" className="avatar-hair" />
        <circle cx="17.5" cy="29" r="4.2" className="avatar-hair" />
        <circle cx="46.5" cy="29" r="4.2" className="avatar-hair" />
      </>
    );
  }
  return (
    <>
      <path d="M19.5 27c.5-8 5.5-12 12.5-12s12 4 12.5 12z" className="avatar-hair" />
      {look === 0 && <rect x="30" y="25" width="19" height="3.5" rx="1.75" className="avatar-hair" />}
      {look === 2 && <circle cx="32" cy="14" r="2.6" className="avatar-hair" />}
    </>
  );
}

export default function MemberAvatar({ ageGroup, variant, className = "" }: MemberAvatarProps) {
  const head = HEAD[ageGroup];
  const eyeY = head.cy + 1;
  const look = variant % LOOKS;
  const style = { "--avatar-tone": memberTone(variant) } as CSSProperties;

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" style={style} className={`shrink-0 rounded-full ${className}`}>
      <rect width="64" height="64" className="avatar-ground" />
      {ageGroup === "adult" && look === 1 && <path d={LONG_HAIR} className="avatar-hair" />}
      <path d={BODY[ageGroup]} className="avatar-body" />
      <circle cx="32" cy={head.cy} r={head.r} className="avatar-skin" />

      {ageGroup === "adult" && look !== 1 && <AdultHair look={look} className="avatar-hair" />}
      {ageGroup === "adult" && look === 1 && (
        <path d="M19 27c0-9.5 5.5-14.500 13-14.500S45 17.500 45 27c-4-3-8-4.500-13-4.500S23 24 19 27z" className="avatar-hair" />
      )}
      {ageGroup === "elderly" && (
        <>
          <AdultHair look={look === 1 ? 0 : look} className="avatar-hair-silver" />
          {look !== 2 && (
            <g className="avatar-line" strokeWidth="1.4">
              <circle cx="26.5" cy={eyeY} r="4" />
              <circle cx="37.5" cy={eyeY} r="4" />
              <path d={`M30.5 ${eyeY}h3`} />
            </g>
          )}
          {look === 1 && <path d={`M27 ${eyeY + 4.5}q5 -2.5 10 0`} className="avatar-hair-silver-line" strokeWidth="2.4" strokeLinecap="round" />}
        </>
      )}
      {ageGroup === "child" && <ChildHair look={look} />}
      {ageGroup === "toddler" && (
        <>
          <path d="M32 19.5c-3.5-4.5 2.5-8 4.5-4" className="avatar-hair-line" strokeWidth="2.4" strokeLinecap="round" />
          {look === 1 && (
            <path d="M28 20c-3-3 0-6.500 2-4" className="avatar-hair-line" strokeWidth="2.4" strokeLinecap="round" />
          )}
          {look === 2 && <circle cx="41" cy="22" r="3" className="avatar-body" />}
          <circle cx="23.5" cy={eyeY + 4} r="2.2" className="avatar-blush" />
          <circle cx="40.5" cy={eyeY + 4} r="2.2" className="avatar-blush" />
        </>
      )}

      <circle cx="26.5" cy={eyeY} r="1.6" className="avatar-ink" />
      <circle cx="37.5" cy={eyeY} r="1.6" className="avatar-ink" />
      <path
        d={`M27.5 ${eyeY + (ageGroup === "elderly" && look === 1 ? 7 : 5)}q4.5 3.5 9 0`}
        className="avatar-line"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
