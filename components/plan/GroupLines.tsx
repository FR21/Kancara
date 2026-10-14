"use client";

import { useEffect, useRef, useState } from "react";
import type { Messages } from "@/lib/messages";
import { type Member, getMemberName } from "@/lib/plan-draft";
import MemberAvatar, { memberTone } from "@/components/ui/MemberAvatar";

type GroupLinesProps = {
  members: Member[];
  text: Messages["plan"];
  /** What the joined line leads to, named at its end. */
  destination: string;
};

const ROW = 44;
/** Where each line leaves its face: the 32px avatar plus a little air. */
const START = 40;
/** The width the drawing assumes before it has been measured (the first paint on the server). */
const FALLBACK_WIDTH = 320;

// Every person in the group is a line of their own, in their character's colour, and the lines join into one before
// the trip goes on: different needs, one journey. A person added to the group draws their line in. The drawing is
// a picture of the group, so assistive technology reads the list of names instead.
//
// The drawing is measured and drawn at its real width. A stretched drawing (preserveAspectRatio="none") cannot
// keep its stroke and its draw-in dashes together, and the lines broke apart in the middle.
export default function GroupLines({ members, text, destination }: GroupLinesProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(Math.round(entry.contentRect.width), FALLBACK_WIDTH)));
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  if (members.length === 0) return null;
  const height = Math.max(members.length * ROW, ROW);
  const middle = height / 2;
  const names = members.map((member) => getMemberName(member, members, text.ageGroups));
  // The straight part runs under the names; the bend takes the next fifth; the joined line runs to the station.
  const bendFrom = Math.round(width * 0.42);
  const joinAt = Math.round(width * 0.62);
  const pull = Math.round((joinAt - bendFrom) / 2);

  return (
    <figure className="w-full">
      <div ref={frameRef} className="relative" style={{ height }}>
        <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
          {members.map((member, index) => {
            const y = index * ROW + ROW / 2;
            return (
              <path
                key={member.id}
                d={`M${START} ${y} H${bendFrom} C${bendFrom + pull} ${y} ${joinAt - pull} ${middle} ${joinAt} ${middle}`}
                pathLength={1}
                strokeDasharray="1 1"
                fill="none"
                strokeWidth={4}
                strokeLinecap="round"
                style={{ stroke: memberTone(index) }}
                className="motion-safe:animate-draw"
              />
            );
          })}
          <path d={`M${joinAt} ${middle} H${width - 16}`} fill="none" strokeWidth={6} strokeLinecap="round" className="stroke-primary" />
        </svg>
        {/* Faces and names sit over the start of each line; the joined line ends at its station. */}
        <ul className="absolute inset-y-0 left-0 flex flex-col">
          {members.map((member, index) => (
            <li key={member.id} className="flex items-center gap-2" style={{ height: ROW }}>
              <MemberAvatar ageGroup={member.ageGroup} variant={index} className="size-8 border-2 border-background" />
              <span className="max-w-24 truncate rounded-full bg-background px-2 text-caption font-bold text-text sm:max-w-40">{names[index]}</span>
            </li>
          ))}
        </ul>
        <span
          className="absolute right-0 flex -translate-y-1/2 items-center gap-2 rounded-full bg-primary px-3 py-1 text-caption font-bold text-on-primary"
          style={{ top: middle }}
        >
          {destination}
        </span>
      </div>
      <figcaption className="sr-only">{names.join(", ")}</figcaption>
    </figure>
  );
}
