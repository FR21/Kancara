"use client";

import { Accessibility, Plus, Search, SearchX, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { type CSSProperties, useState } from "react";
import Notice, { type NoticeMessage } from "@/components/layout/Notice";
import PageBackdrop from "@/components/layout/PageBackdrop";
import PageHeader from "@/components/layout/PageHeader";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { choiceClass, INPUT, OUTLINE_BUTTON, PRIMARY_BUTTON } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import { type AgeGroup, AGE_GROUPS, EMPTY_DRAFT, fillTemplate, MAX_MEMBERS, sameText } from "@/lib/plan-draft";
import {
  type SavedProfile,
  type SavedProfileDraft,
  type SavedProfileList,
  EMPTY_PROFILE_DRAFT,
  hasNeeds,
  savedProfileToMember,
} from "@/lib/saved-profiles/profile";
import { saveDraft, useSavedDraft } from "@/lib/use-plan-draft";
import { useMessages } from "@/lib/use-messages";
import { useSavedProfiles } from "@/lib/use-saved-profiles";
import ProfileStats from "./ProfileStats";
import EmptyState from "@/components/ui/EmptyState";
import MemberAvatar from "@/components/ui/MemberAvatar";
import SavedProfileCard from "./SavedProfileCard";
import SavedProfileEditor, { type EditorTarget } from "./SavedProfileEditor";
import TripSuggestions from "./TripSuggestions";

type Filter = "all" | AgeGroup | "withNeeds";

// Each filter shows who it finds: the age groups by the same characters the profiles are drawn as, everyone as a
// group, and people with needs by the accessibility sign.
function FilterMark({ filter }: { filter: Filter }) {
  if (filter === "all") return <Users className="size-4 shrink-0" aria-hidden="true" />;
  if (filter === "withNeeds") return <Accessibility className="size-4 shrink-0" aria-hidden="true" />;
  return <MemberAvatar ageGroup={filter} variant={0} className="-ml-2 size-7" />;
}

function matchesFilter(profile: SavedProfile, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "withNeeds") return hasNeeds(profile);
  return profile.ageGroup === filter;
}

function matchesSearch(profile: SavedProfile, query: string, planText: Messages["plan"]): boolean {
  const wanted = query.trim().toLowerCase();
  if (wanted === "") return true;
  return [
    profile.name,
    profile.relationship,
    profile.allergies,
    profile.notes,
    ...profile.customNeeds,
    ...profile.needs.map((need) => planText.needs[need]),
  ].some((field) => field.toLowerCase().includes(wanted));
}

export default function SavedProfilesWorkspace({ initial }: { initial: SavedProfileList }) {
  const router = useRouter();
  const planText = useMessages("plan");
  const navText = useMessages("navbar");
  const text = useMessages("savedProfiles");
  const { profiles, suggestions, save, remove } = useSavedProfiles(initial);
  const savedDraft = useSavedDraft();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<(EditorTarget & { key: number }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);

  const shown = profiles.filter((profile) => matchesFilter(profile, filter) && matchesSearch(profile, query, planText));
  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: text.filters.all },
    ...AGE_GROUPS.map((ageGroup) => ({ value: ageGroup, label: planText.ageGroups[ageGroup] })),
    { value: "withNeeds", label: text.filters.withNeeds },
  ];

  const openEditor = (draft: SavedProfileDraft, id: string | null) => setEditing({ id, draft, key: Date.now() });

  const saveProfile = async (draft: SavedProfileDraft, id: string | null) => {
    const saved = await save(draft, id);
    setEditing(null);
    setNotice({ id: Date.now(), tone: "success", message: fillTemplate(text.notice.saved, { name: saved.name }) });
  };

  const openDelete = (profile: SavedProfile) => {
    setDeleteFailed(false);
    setDeleteTarget(profile);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteFailed(false);
    try {
      await remove(deleteTarget.id);
      setNotice({ id: Date.now(), tone: "success", message: fillTemplate(text.notice.deleted, { name: deleteTarget.name }) });
      setDeleteTarget(null);
    } catch {
      setDeleteFailed(true);
    } finally {
      setDeleting(false);
    }
  };

  // The chosen people join the plan on this device, after anyone already in it; someone it has by name is not
  // added twice.
  const planWith = (chosen: SavedProfile[]) => {
    const draft = savedDraft ?? EMPTY_DRAFT;
    const newcomers = chosen
      .filter((profile) => !draft.members.some((member) => sameText(member.name, profile.name)))
      .map(savedProfileToMember);
    saveDraft({ ...draft, members: [...draft.members, ...newcomers].slice(0, MAX_MEMBERS) });
    router.push("/plan");
  };

  const clearFilters = () => {
    setQuery("");
    setFilter("all");
  };

  return (
    <>
      <PageBackdrop />
      <PageHeader
        crumbs={{ label: navText.breadcrumb, items: [{ label: navText.profile, href: "/profile" }, { label: text.title }] }}
        title={text.title}
        lead={text.subtitle}
        // With nobody saved yet the empty state carries the one "Add" button. Otherwise "Add" sits beside the title
        // on a wide screen and waits at the bottom of a phone, in thumb reach.
        actions={
          profiles.length > 0 && (
            <>
              <button type="button" onClick={() => planWith(profiles)} className={OUTLINE_BUTTON}>
                <Users className="size-4" aria-hidden="true" />
                {text.planWithAll}
              </button>
              <div className="hidden sm:block">
                <button type="button" onClick={() => openEditor(EMPTY_PROFILE_DRAFT, null)} className={PRIMARY_BUTTON}>
                  <Plus className="size-4" aria-hidden="true" />
                  {text.add}
                </button>
              </div>
            </>
          )
        }
        mobileAction={
          profiles.length > 0 && (
            <button type="button" onClick={() => openEditor(EMPTY_PROFILE_DRAFT, null)} className={PRIMARY_BUTTON}>
              <Plus className="size-4" aria-hidden="true" />
              {text.add}
            </button>
          )
        }
      />

      <Notice notice={notice} dismissLabel={text.notice.dismiss} onDismiss={() => setNotice(null)} />

      {profiles.length === 0 && (
        <div className="mt-8">
          <EmptyState
            headingLevel={2}
            icon={Users}
            title={text.empty.title}
            body={text.empty.body}
            action={
              <button type="button" onClick={() => openEditor(EMPTY_PROFILE_DRAFT, null)} className={PRIMARY_BUTTON}>
                <Plus className="size-4" aria-hidden="true" />
                {text.add}
              </button>
            }
          />
        </div>
      )}

      {profiles.length > 0 && (
        <>
          <ProfileStats profiles={profiles} text={text.stats} />

          <div className="mt-8 flex flex-col gap-4">
            <div className="group relative w-full lg:max-w-sm">
              <label htmlFor="saved-profiles-search" className="sr-only">
                {text.search.label}
              </label>
              <Search
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-text-muted transition-colors duration-150 ease-out group-focus-within:text-primary"
                aria-hidden="true"
              />
              <input
                id="saved-profiles-search"
                type="search"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={text.search.placeholder}
                className={`${INPUT} pl-12`}
              />
            </div>
            <div role="group" aria-label={text.filters.label} className="flex flex-wrap gap-2">
              {filters.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={filter === option.value}
                  onClick={() => setFilter(option.value)}
                  className={choiceClass(filter === option.value)}
                >
                  <FilterMark filter={option.value} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {shown.length === 0 && (
            <div className="mt-6">
              <EmptyState
                headingLevel={2}
                icon={SearchX}
                title={text.noMatch.title}
                body={text.noMatch.body}
                action={
                  <button type="button" onClick={clearFilters} className={OUTLINE_BUTTON}>
                    {text.noMatch.clear}
                  </button>
                }
              />
            </div>
          )}

          {shown.length > 0 && (
            <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {shown.map((profile, index) => (
                <li
                  key={profile.id}
                  style={{ "--item-index": index } as CSSProperties}
                  className="flex motion-safe:animate-list-in"
                >
                  <SavedProfileCard
                    profile={profile}
                    variant={profiles.indexOf(profile)}
                    planText={planText}
                    text={text}
                    onPlan={() => planWith([profile])}
                    onEdit={() => openEditor(profile, profile.id)}
                    onDelete={() => openDelete(profile)}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {suggestions.length > 0 && (
        <TripSuggestions
          suggestions={suggestions}
          planText={planText}
          text={text}
          onSave={(draft) => openEditor(draft, null)}
        />
      )}

      {editing && (
        <SavedProfileEditor
          key={editing.key}
          target={editing}
          planText={planText}
          text={text}
          onClose={() => setEditing(null)}
          onSave={saveProfile}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={fillTemplate(text.deleteDialog.title, { name: deleteTarget?.name ?? "" })}
        body={text.deleteDialog.body}
        cancelLabel={text.deleteDialog.cancel}
        confirmLabel={text.deleteDialog.confirm}
        pendingLabel={text.deleteDialog.pending}
        pending={deleting}
        error={deleteFailed ? text.errors.deleteFailed : null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
