import type { Messages } from "@/lib/messages";
import type { NeedKey } from "@/lib/plan-draft";
import type { SavedProfile } from "@/lib/saved-profiles/profile";

type ProfileStatsProps = {
  profiles: SavedProfile[];
  text: Messages["savedProfiles"]["stats"];
};

const MOBILITY_NEEDS: NeedKey[] = ["wheelchair", "noStairs", "shortWalks"];
const DIET_NEEDS: NeedKey[] = ["halal", "vegetarian", "vegan"];

const count = (profiles: SavedProfile[], test: (profile: SavedProfile) => boolean) => profiles.filter(test).length;

/** How the saved people add up: everyone, those who need a gentler pace, access, or care with food. One surface
 * split into cells by hairlines, so four numbers read as one summary and not as four cards. */
export default function ProfileStats({ profiles, text }: ProfileStatsProps) {
  const stats = [
    { label: text.total, value: profiles.length },
    { label: text.gentlePace, value: count(profiles, (profile) => profile.ageGroup !== "adult") },
    { label: text.mobility, value: count(profiles, (profile) => profile.needs.some((need) => MOBILITY_NEEDS.includes(need))) },
    {
      label: text.diet,
      value: count(
        profiles,
        (profile) => profile.allergies.trim() !== "" || profile.needs.some((need) => DIET_NEEDS.includes(need)),
      ),
    },
  ];

  return (
    <dl
      aria-label={text.label}
      className="mt-8 grid grid-cols-2 gap-px overflow-clip rounded-surface border border-border bg-border motion-safe:animate-message-in sm:grid-cols-4"
    >
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col-reverse justify-end gap-1 bg-surface p-surface">
          <dt className="text-caption text-pretty text-text-muted">{stat.label}</dt>
          <dd className="font-heading text-h2 text-text tabular-nums">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
