import MemberAvatar from "@/components/ui/MemberAvatar";
import { fillTemplate } from "@/lib/plan-draft";
import type { TripCardMember } from "@/lib/trips/trip";

type MemberStackProps = {
  members: TripCardMember[];
  count: number;
  label: string;
  moreLabel: string;
};

const RING = "ring-2 ring-surface";

export default function MemberStack({ members, count, label, moreLabel }: MemberStackProps) {
  const hidden = count - members.length;

  return (
    <div className="flex items-center gap-3">
      {members.length > 0 && (
        <span aria-hidden="true" className="pointer-events-auto flex shrink-0">
          {members.map((member, index) => (
            <MemberAvatar
              key={member.id}
              ageGroup={member.ageGroup}
              variant={index}
              className={`size-8 transition-[translate] duration-300 ease-spring hover:-translate-y-1 ${RING} ${index > 0 ? "-ml-2" : ""}`}
            />
          ))}
          {hidden > 0 && (
            <span
              className={`-ml-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-surface-muted px-2 text-caption font-bold text-text tabular-nums ${RING}`}
            >
              {fillTemplate(moreLabel, { count: hidden })}
            </span>
          )}
        </span>
      )}
      <span className="text-body-sm text-text-muted">{label}</span>
    </div>
  );
}
