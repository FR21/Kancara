import { ArrowRight, Pencil, Star, Trash2 } from "lucide-react";
import ActionMenu from "@/components/ui/ActionMenu";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { BADGE, TEXT_LINK } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import { type InterestKey, fillTemplate, INTEREST_KEYS } from "@/lib/plan-draft";
import type { SavedProfile } from "@/lib/saved-profiles/profile";
import ProfileTags from "./ProfileTags";

type SavedProfileCardProps = {
  profile: SavedProfile;
  /** The person's place in the list, which picks the look of their character. */
  variant: number;
  planText: Messages["plan"];
  text: Messages["savedProfiles"];
  onPlan: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const BLOCK_TITLE = "text-label text-text";

// One saved person in three groups, as a trip is drawn on My Trips: who they are (with editing and deleting in
// the "⋯" menu), what the plan should know about them, and the one thing to do with them.
export default function SavedProfileCard({ profile, variant, planText, text, onPlan, onEdit, onDelete }: SavedProfileCardProps) {
  const listedWishes = INTEREST_KEYS.filter((key): key is InterestKey => profile.interests[key] !== undefined);
  const wishes = [
    ...listedWishes.map((key) => ({ label: planText.interests[key], level: profile.interests[key] })),
    ...profile.customInterests,
  ];
  const notes = profile.notes.trim();
  const facts = [
    profile.relationship,
    planText.ageGroups[profile.ageGroup],
    profile.age === null ? "" : fillTemplate(text.card.age, { age: profile.age }),
  ].filter((part) => part !== "");

  return (
    <article className="flex w-full flex-col rounded-surface border border-border bg-surface p-surface">
      <header className="flex items-start gap-4">
        <MemberAvatar ageGroup={profile.ageGroup} variant={variant} className="size-14" />
        <div className="min-w-0 flex-1">
          <h2 className="text-label-lg text-pretty wrap-anywhere text-text">{profile.name}</h2>
          <p className="mt-1 text-body-sm text-pretty text-text-muted">{facts.join(" · ")}</p>
        </div>
        <div className="-mt-2 -mr-2">
          <ActionMenu
            label={fillTemplate(text.card.more, { name: profile.name })}
            items={[
              { key: "edit", label: text.card.edit, icon: Pencil, onSelect: onEdit },
              { key: "delete", label: text.card.delete, icon: Trash2, onSelect: onDelete, danger: true },
            ]}
          />
        </div>
      </header>

      <div className="mt-6 space-y-4">
        <ProfileTags profile={profile} planText={planText} text={text} />

        {wishes.length > 0 && (
          <section>
            <h3 className={BLOCK_TITLE}>{text.card.wishes}</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {wishes.map((wish) => (
                <li
                  key={wish.label}
                  title={wish.label}
                  className={`${BADGE} ${wish.level === "must" ? "bg-primary-subtle text-on-primary-subtle" : "bg-surface-muted text-text"}`}
                >
                  {wish.level === "must" && (
                    <>
                      <Star className="size-3 shrink-0 fill-current" aria-hidden="true" />
                      <span className="sr-only">{planText.wishLevels.must}:</span>
                    </>
                  )}
                  <span className="min-w-0 truncate">{wish.label}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {notes !== "" && (
          <section>
            <h3 className={BLOCK_TITLE}>{text.card.notes}</h3>
            <p className="mt-2 text-body-sm text-pretty whitespace-pre-line text-text-muted">{notes}</p>
          </section>
        )}
      </div>

      {/* Pushed to the foot, so the cards in a row end their actions on one line. The link's own 44px height
          already holds 12px above its words, so 4px more makes the 16px under the hairline. */}
      <div className="mt-auto pt-6">
        <div className="border-t border-border pt-1">
          <button type="button" onClick={onPlan} className={TEXT_LINK}>
            {text.card.plan}
            <ArrowRight className="size-4 transition-[translate] duration-200 ease-out group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
