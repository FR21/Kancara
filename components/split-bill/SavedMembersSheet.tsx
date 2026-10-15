"use client";

import { Check, UserRound } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import Checkbox from "@/components/ui/Checkbox";
import EmptyState from "@/components/ui/EmptyState";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { relationshipPresentation } from "@/lib/saved-profiles/relationship";
import Sheet from "@/components/ui/Sheet";
import { TEXT_LINK, buttonClass } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import type { AgeGroup } from "@/lib/plan-draft";
import { plural } from "@/lib/trips/format";

export type SavedProfileChoice = { id: string; name: string; relationship: string; ageGroup: AgeGroup; added: boolean };

type SavedMembersSheetProps = {
  open: boolean;
  profiles: SavedProfileChoice[];
  selected: string[];
  text: Messages["splitBill"]["picker"];
  locale: string;
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: () => void;
  onConfirm: () => void;
  onClose: () => void;
};

// The saved member profiles of the account, to add to the bill several at once. Profiles already on the bill
// are shown as such and cannot be picked again.
export default function SavedMembersSheet({
  open,
  profiles,
  selected,
  text,
  locale,
  onToggle,
  onToggleAll,
  onConfirm,
  onClose,
}: SavedMembersSheetProps) {
  const pickable = profiles.filter((profile) => !profile.added);
  const allSelected = pickable.length > 0 && pickable.every((profile) => selected.includes(profile.id));

  return (
    <Sheet
      open={open}
      title={text.title}
      closeLabel={text.close}
      onClose={onClose}
      footer={
        profiles.length > 0 && (
          <>
            <button type="button" onClick={onClose} className={`${buttonClass("ghost")} flex-1 sm:flex-none`}>
              {text.cancel}
            </button>
            <button type="button" disabled={selected.length === 0} onClick={onConfirm} className={`${buttonClass("primary")} flex-1`}>
              {selected.length > 0 ? plural(text.confirm, selected.length, locale) : text.confirmNone}
            </button>
          </>
        )
      }
    >
      {profiles.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title={text.empty}
          body={text.emptyHint}
          framed={false}
          action={
            <Link href="/profile/saved-members" className={buttonClass("primary")}>
              {text.manage}
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4">
            <p className="text-body-sm text-text-muted">{text.intro}</p>
            {pickable.length > 0 && (
              <button type="button" onClick={onToggleAll} className={TEXT_LINK}>
                {allSelected ? text.clearAll : text.selectAll}
              </button>
            )}
          </div>
          <ul className="divide-y divide-border">
            {profiles.map((profile, index) => (
              <li key={profile.id} style={{ "--item-index": index } as CSSProperties} className="motion-safe:animate-list-in">
                {profile.added ? (
                  <div className="flex min-h-16 items-center gap-3 py-2 opacity-60">
                    <span className="flex size-6 shrink-0 items-center justify-center text-success">
                      <Check className="size-5" strokeWidth={3} aria-hidden="true" />
                    </span>
                    <MemberAvatar
                      ageGroup={profile.ageGroup}
                      variant={index}
                      presentation={relationshipPresentation(profile.relationship)}
                      className="size-10"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label-lg text-text">{profile.name}</span>
                      <span className="block text-caption text-text-muted">{text.alreadyAdded}</span>
                    </span>
                  </div>
                ) : (
                  <label className="flex min-h-16 cursor-pointer items-center gap-3 py-2">
                    <Checkbox checked={selected.includes(profile.id)} onChange={(checked) => onToggle(profile.id, checked)} />
                    <MemberAvatar
                      ageGroup={profile.ageGroup}
                      variant={index}
                      presentation={relationshipPresentation(profile.relationship)}
                      className="size-10"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label-lg text-text">{profile.name}</span>
                      {profile.relationship && <span className="block truncate text-caption text-text-muted">{profile.relationship}</span>}
                    </span>
                  </label>
                )}
              </li>
            ))}
          </ul>
          <Link href="/profile/saved-members" className={TEXT_LINK}>
            {text.manage}
          </Link>
        </div>
      )}
    </Sheet>
  );
}
