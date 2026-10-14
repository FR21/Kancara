import { Plus } from "lucide-react";
import type { CSSProperties } from "react";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { buttonClass } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import type { SavedProfileDraft, SavedProfileSuggestion } from "@/lib/saved-profiles/profile";
import ProfileTags from "./ProfileTags";

type TripSuggestionsProps = {
  suggestions: SavedProfileSuggestion[];
  planText: Messages["plan"];
  text: Messages["savedProfiles"];
  onSave: (profile: SavedProfileDraft) => void;
};

/** People who were in the group of a past trip and are not saved yet, each one tap from being kept. */
export default function TripSuggestions({ suggestions, planText, text, onSave }: TripSuggestionsProps) {
  return (
    <section aria-labelledby="trip-suggestions-title" className="mt-8">
      <h2 id="trip-suggestions-title" className="text-h3 text-text">
        {text.suggestions.title}
      </h2>
      <p className="mt-1 max-w-2xl text-body-sm text-pretty text-text-muted">{text.suggestions.body}</p>
      <ul className="mt-4 divide-y divide-border rounded-surface border border-border bg-surface px-surface">
        {suggestions.map(({ tripName, profile }, index) => (
          <li
            key={profile.name}
            style={{ "--item-index": index } as CSSProperties}
            className="flex flex-col gap-3 py-4 motion-safe:animate-list-in sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <MemberAvatar ageGroup={profile.ageGroup} variant={index} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="text-label wrap-anywhere text-text">{profile.name}</p>
                <p className="text-caption wrap-anywhere text-text-muted">
                  {fillTemplate(text.suggestions.from, { trip: tripName || text.suggestions.untitledTrip })}
                </p>
                <div className="mt-2">
                  <ProfileTags profile={profile} planText={planText} text={text} />
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label={fillTemplate(text.suggestions.saveLabel, { name: profile.name })}
              onClick={() => onSave(profile)}
              className={`${buttonClass("outline", "small")} self-end sm:self-center`}
            >
              <Plus className="size-4" aria-hidden="true" />
              {text.suggestions.save}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
