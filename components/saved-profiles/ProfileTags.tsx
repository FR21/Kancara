import { CircleAlert } from "lucide-react";
import { NEED_CHIP, NeedChip } from "@/components/ui/NeedChips";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import type { SavedProfileDraft } from "@/lib/saved-profiles/profile";

type ProfileTagsProps = {
  profile: SavedProfileDraft;
  planText: Messages["plan"];
  text: Messages["savedProfiles"];
};

/** A person's needs and allergies as small tags, or a quiet line saying there are none. */
export default function ProfileTags({ profile, planText, text }: ProfileTagsProps) {
  const allergies = profile.allergies.trim();
  if (profile.needs.length === 0 && profile.customNeeds.length === 0 && allergies === "") {
    return <p className="text-caption text-text-muted">{text.card.noNeeds}</p>;
  }

  return (
    <ul aria-label={text.card.needs} className="flex flex-wrap gap-2">
      {profile.needs.map((need) => (
        <li key={need} className="max-w-full">
          <NeedChip need={need} text={planText} />
        </li>
      ))}
      {profile.customNeeds.map((need) => (
        <li key={need} className={NEED_CHIP}>
          <span className="min-w-0 wrap-anywhere">{need}</span>
        </li>
      ))}
      {allergies !== "" && (
        <li className="inline-flex max-w-full items-center gap-2 rounded-full bg-warning-subtle px-2 py-1 text-caption font-bold text-on-warning-subtle">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 wrap-anywhere">{fillTemplate(text.card.allergies, { allergies })}</span>
        </li>
      )}
    </ul>
  );
}
