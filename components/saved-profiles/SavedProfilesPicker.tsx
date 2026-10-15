"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useState } from "react";
import Checkbox from "@/components/ui/Checkbox";
import ErrorAlert from "@/components/ui/ErrorAlert";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { relationshipPresentation } from "@/lib/saved-profiles/relationship";
import Sheet from "@/components/ui/Sheet";
import { PRIMARY_BUTTON, TEXT_LINK } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import { type Member, fillTemplate, sameText } from "@/lib/plan-draft";
import { type SavedProfileDraft, savedProfileToMember } from "@/lib/saved-profiles/profile";
import { useMessages } from "@/lib/use-messages";
import { useSavedProfiles } from "@/lib/use-saved-profiles";
import ProfileTags from "./ProfileTags";

type SavedProfilesPickerProps = {
  open: boolean;
  currentMembers: Member[];
  onClose: () => void;
  onAddMember: (member: Member) => void;
};

/** One person who can be added: a saved one, or one from a past trip's group. */
type Choice = { key: string; profile: SavedProfileDraft; detail: string };

const MANAGE_HREF = "/profile/saved-members";

// Lists are read only while the sheet is open, so a plan that never opens it never asks for them.
export default function SavedProfilesPicker({ open, ...rest }: SavedProfilesPickerProps) {
  return open ? <PickerSheet {...rest} /> : null;
}

function PickerSheet({ currentMembers, onClose, onAddMember }: Omit<SavedProfilesPickerProps, "open">) {
  const planText = useMessages("plan");
  const text = useMessages("savedProfiles");
  const { status, profiles, suggestions, reload } = useSavedProfiles();
  const [selected, setSelected] = useState<string[]>([]);

  const describe = (profile: SavedProfileDraft) =>
    [profile.relationship, planText.ageGroups[profile.ageGroup]].filter((part) => part !== "").join(" · ");
  const saved: Choice[] = profiles.map((profile) => ({ key: `saved-${profile.id}`, profile, detail: describe(profile) }));
  const fromTrips: Choice[] = suggestions.map(({ tripName, profile }) => ({
    key: `trip-${profile.name}`,
    profile,
    detail: fillTemplate(text.suggestions.from, { trip: tripName || text.suggestions.untitledTrip }),
  }));
  const inPlan = (choice: Choice) => currentMembers.some((member) => sameText(member.name, choice.profile.name));

  const toggle = (key: string, checked: boolean) =>
    setSelected((current) => (checked ? [...current, key] : current.filter((entry) => entry !== key)));

  const addSelected = () => {
    [...saved, ...fromTrips]
      .filter((choice) => selected.includes(choice.key) && !inPlan(choice))
      .forEach((choice) => onAddMember(savedProfileToMember(choice.profile)));
    onClose();
  };

  const renderGroup = (title: string, choices: Choice[]) => (
    <section aria-label={title}>
      <h3 className="text-label text-text-muted">{title}</h3>
      <ul className="mt-2 space-y-1">
        {choices.map((choice, index) => (
          <PickerRow
            key={choice.key}
            choice={choice}
            variant={index}
            added={inPlan(choice)}
            checked={selected.includes(choice.key)}
            planText={planText}
            text={text}
            onToggle={(checked) => toggle(choice.key, checked)}
          />
        ))}
      </ul>
    </section>
  );

  const nothingYet = status === "ready" && saved.length === 0 && fromTrips.length === 0;

  return (
    <Sheet
      open
      title={text.picker.title}
      closeLabel={text.editor.close}
      onClose={onClose}
      footer={
        <>
          <Link href={MANAGE_HREF} className={TEXT_LINK}>
            {text.picker.manage}
          </Link>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={addSelected}
            className={`${PRIMARY_BUTTON} flex-1 sm:ml-auto sm:flex-none`}
          >
            <Plus className="size-4" aria-hidden="true" />
            {selected.length === 0 ? text.picker.addNone : fillTemplate(text.picker.add, { count: selected.length })}
          </button>
        </>
      }
    >
      {status === "loading" && (
        <div role="status" aria-label={text.picker.loading} className="space-y-2 motion-safe:animate-pulse">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-start gap-3 p-3">
              <div className="size-6 shrink-0 rounded-lg bg-surface-muted" />
              <div className="size-10 shrink-0 rounded-full bg-surface-muted" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-1/2 rounded-full bg-surface-muted" />
                <div className="h-3 w-1/3 rounded-full bg-surface-muted" />
                <div className="h-7 w-2/3 rounded-full bg-surface-muted" />
              </div>
            </div>
          ))}
        </div>
      )}
      {status === "failed" && <ErrorAlert message={text.errors.loadFailed} retryLabel={text.errors.retry} onRetry={reload} />}
      {nothingYet && <p className="text-body text-pretty text-text-muted">{text.picker.empty}</p>}
      {saved.length > 0 && renderGroup(text.picker.saved, saved)}
      {fromTrips.length > 0 && renderGroup(text.suggestions.title, fromTrips)}
    </Sheet>
  );
}

type PickerRowProps = {
  choice: Choice;
  variant: number;
  added: boolean;
  checked: boolean;
  planText: Messages["plan"];
  text: Messages["savedProfiles"];
  onToggle: (checked: boolean) => void;
};

function PickerRow({ choice, variant, added, checked, planText, text, onToggle }: PickerRowProps) {
  const order = { "--item-index": variant } as CSSProperties;
  const body = (
    <>
      <MemberAvatar
        ageGroup={choice.profile.ageGroup}
        variant={variant}
        presentation={relationshipPresentation(choice.profile.relationship)}
        className="size-10"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-label wrap-anywhere text-text">{choice.profile.name}</span>
        <span className="block text-caption wrap-anywhere text-text-muted">{choice.detail}</span>
        <span className="mt-2 block">
          <ProfileTags profile={choice.profile} planText={planText} text={text} />
        </span>
      </span>
    </>
  );

  if (added) {
    return (
      <li style={order} className="flex items-start gap-3 rounded-lg p-3 opacity-60 motion-safe:animate-list-in">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-success text-on-success">
          <Check className="size-4" strokeWidth={3} aria-hidden="true" />
        </span>
        {body}
        <span className="sr-only">{text.picker.inPlan}</span>
      </li>
    );
  }

  return (
    <li style={order} className="motion-safe:animate-list-in">
      <label
        className={`flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-[background-color,scale] duration-150 ease-out active:scale-[0.99] ${
          checked ? "bg-primary-subtle" : "hover:bg-surface-muted"
        }`}
      >
        <Checkbox checked={checked} onChange={onToggle} />
        {body}
      </label>
    </li>
  );
}
