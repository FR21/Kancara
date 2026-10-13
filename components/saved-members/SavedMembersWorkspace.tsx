"use client";

import {
  AlertTriangle,
  ArrowRight,
  Edit2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Notice, { type NoticeMessage } from "@/components/layout/Notice";
import PageBackdrop from "@/components/layout/PageBackdrop";
import MemberAvatar from "@/components/plan/MemberAvatar";
import { NeedChip } from "@/components/plan/NeedChips";
import {
  choiceClass,
  INPUT,
  OUTLINE_BUTTON,
  PRIMARY_BUTTON,
} from "@/components/plan/styles";
import { type AgeGroup, type Member, fillTemplate } from "@/lib/plan-draft";
import {
  saveDraft,
  useSavedDraft,
} from "@/lib/plan-draft-store";
import {
  type SavedMemberProfile,
  savedProfileToMember,
  useSavedProfiles,
} from "@/lib/saved-members-store";
import { useMessages } from "@/lib/use-messages";
import DeleteProfileDialog from "./DeleteProfileDialog";
import ProfileEditorModal from "./ProfileEditorModal";

export default function SavedMembersWorkspace() {
  const router = useRouter();
  const planText = useMessages("plan");
  const t = useMessages("savedProfiles");
  const tripsText = useMessages("trips");

  const { profiles, save, remove } = useSavedProfiles();
  const existingDraft = useSavedDraft();

  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<"all" | AgeGroup | "hasNeeds">("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SavedMemberProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedMemberProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<NoticeMessage | null>(null);

  const showToast = (message: string) => setToast({ id: Date.now(), tone: "success", message });

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // Group filter
      if (filterGroup === "hasNeeds") {
        const has = (p.needs && p.needs.length > 0) || (p.customNeeds && p.customNeeds.length > 0);
        if (!has) return false;
      } else if (filterGroup !== "all" && p.ageGroup !== filterGroup) {
        return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchRel = (p.relationship || "").toLowerCase().includes(q);
        const matchAllergy = (p.allergies || "").toLowerCase().includes(q);
        const matchNotes = (p.notes || "").toLowerCase().includes(q);
        const matchNeed = p.needs?.some((n) => (planText.needs[n] || "").toLowerCase().includes(q));
        const matchCustomNeed = p.customNeeds?.some((n) => n.toLowerCase().includes(q));
        if (!matchName && !matchRel && !matchAllergy && !matchNotes && !matchNeed && !matchCustomNeed) {
          return false;
        }
      }

      return true;
    });
  }, [profiles, filterGroup, search, planText.needs]);

  // Statistics
  const stats = useMemo(() => {
    const total = profiles.length;
    const seniorsAndKids = profiles.filter(
      (p) => p.ageGroup === "elderly" || p.ageGroup === "child" || p.ageGroup === "toddler",
    ).length;
    const mobility = profiles.filter((p) =>
      p.needs?.some((n) => n === "wheelchair" || n === "noStairs" || n === "shortWalks"),
    ).length;
    const dietaryOrAllergy = profiles.filter(
      (p) => (p.allergies && p.allergies.trim()) || p.needs?.some((n) => n === "halal" || n === "vegetarian" || n === "vegan"),
    ).length;
    return { total, seniorsAndKids, mobility, dietaryOrAllergy };
  }, [profiles]);

  const handleOpenAdd = () => {
    setEditingProfile(null);
    setEditorOpen(true);
  };

  const handleOpenEdit = (profile: SavedMemberProfile) => {
    setEditingProfile(profile);
    setEditorOpen(true);
  };

  const handleSaveProfile = (data: Omit<SavedMemberProfile, "createdAt" | "updatedAt">) => {
    save(data);
    showToast(fillTemplate(t.toastSaved, { name: data.name }));
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setTimeout(() => {
      remove(deleteTarget.id);
      setIsDeleting(false);
      showToast(fillTemplate(t.toastDeleted, { name: deleteTarget.name }));
      setDeleteTarget(null);
    }, 200);
  };

  const handlePlanWithMember = (profile: SavedMemberProfile) => {
    const newMember: Member = savedProfileToMember(profile);
    const draft = existingDraft || {
      origin: "",
      destinations: [],
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      members: [],
      budget: null,
      budgetCurrency: "IDR",
      budgetUsd: null,
      pace: null,
      extras: {
        flexibleDates: false,
        arrivalTime: "",
        departureTime: "",
        lodging: "",
        mustVisit: "",
        avoid: "",
        occasion: "",
        dayStart: "",
        dayEnd: "",
        transport: [],
        customTransport: [],
      },
      notes: "",
      agreements: {},
      packing: { checked: [], removed: [], own: [], captain: null, laundry: null },
    };

    const alreadyExists = draft.members.some((m) => m.name.toLowerCase() === newMember.name.toLowerCase());
    const updatedDraft = {
      ...draft,
      members: alreadyExists ? draft.members : [...draft.members, newMember],
    };

    saveDraft(updatedDraft);
    router.push("/plan");
  };

  const handlePlanWithAll = () => {
    const freshMembers: Member[] = profiles.map(savedProfileToMember);
    const draft = existingDraft || {
      origin: "",
      destinations: [],
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      members: [],
      budget: null,
      budgetCurrency: "IDR",
      budgetUsd: null,
      pace: null,
      extras: {
        flexibleDates: false,
        arrivalTime: "",
        departureTime: "",
        lodging: "",
        mustVisit: "",
        avoid: "",
        occasion: "",
        dayStart: "",
        dayEnd: "",
        transport: [],
        customTransport: [],
      },
      notes: "",
      agreements: {},
      packing: { checked: [], removed: [], own: [], captain: null, laundry: null },
    };

    const updatedDraft = {
      ...draft,
      members: freshMembers,
    };

    saveDraft(updatedDraft);
    router.push("/plan");
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 xl:px-0">
      <PageBackdrop />

      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 motion-safe:animate-message-in">
        <div>
          <h1 className="text-h2 text-text sm:text-h1">{t.title}</h1>
          <p className="mt-2 max-w-2xl text-body text-text-muted">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAdd}
            className={`${PRIMARY_BUTTON} shadow-lg shadow-primary/20`}
          >
            <Plus className="size-4" strokeWidth={3} aria-hidden="true" />
            {t.addMember}
          </button>
          {profiles.length > 0 && (
            <button
              type="button"
              onClick={handlePlanWithAll}
              className={`${OUTLINE_BUTTON} gap-1.5`}
              title={t.planWithAllTitle}
            >
              <Users className="size-4 text-primary" aria-hidden="true" />
              {t.planWithAll}
            </button>
          )}
        </div>
      </header>

      <Notice notice={toast} dismissLabel={tripsText.notice.dismiss} onDismiss={() => setToast(null)} />

      {/* Stats Summary Bar */}
      <section
        aria-label="Statistik Profil"
        className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 motion-safe:animate-message-in motion-safe:[animation-delay:40ms]"
      >
        <div className="rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/40">
          <p className="text-caption font-bold text-text-muted uppercase tracking-wider">
            {t.stats.total}
          </p>
          <p className="mt-1 text-h2 font-heading text-text tabular-nums">{stats.total}</p>
          <p className="mt-1 text-caption text-text-muted">{t.stats.totalSub}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/40">
          <p className="text-caption font-bold text-text-muted uppercase tracking-wider">
            {t.stats.vulnerable}
          </p>
          <p className="mt-1 text-h2 font-heading text-primary tabular-nums">{stats.seniorsAndKids}</p>
          <p className="mt-1 text-caption text-text-muted">{t.stats.vulnerableSub}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/40">
          <p className="text-caption font-bold text-text-muted uppercase tracking-wider">
            {t.stats.mobility}
          </p>
          <p className="mt-1 text-h2 font-heading text-accent tabular-nums">{stats.mobility}</p>
          <p className="mt-1 text-caption text-text-muted">{t.stats.mobilitySub}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/40">
          <p className="text-caption font-bold text-text-muted uppercase tracking-wider">
            {t.stats.diet}
          </p>
          <p className="mt-1 text-h2 font-heading text-text tabular-nums">{stats.dietaryOrAllergy}</p>
          <p className="mt-1 text-caption text-text-muted">{t.stats.dietSub}</p>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between motion-safe:animate-message-in motion-safe:[animation-delay:80ms]">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={`${INPUT} pl-11`}
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            aria-pressed={filterGroup === "all"}
            onClick={() => setFilterGroup("all")}
            className={choiceClass(filterGroup === "all")}
          >
            {t.filterAll} ({profiles.length})
          </button>
          <button
            type="button"
            aria-pressed={filterGroup === "elderly"}
            onClick={() => setFilterGroup("elderly")}
            className={choiceClass(filterGroup === "elderly")}
          >
            {planText.ageGroups.elderly}
          </button>
          <button
            type="button"
            aria-pressed={filterGroup === "adult"}
            onClick={() => setFilterGroup("adult")}
            className={choiceClass(filterGroup === "adult")}
          >
            {planText.ageGroups.adult}
          </button>
          <button
            type="button"
            aria-pressed={filterGroup === "child"}
            onClick={() => setFilterGroup("child")}
            className={choiceClass(filterGroup === "child")}
          >
            {planText.ageGroups.child}
          </button>
          <button
            type="button"
            aria-pressed={filterGroup === "toddler"}
            onClick={() => setFilterGroup("toddler")}
            className={choiceClass(filterGroup === "toddler")}
          >
            {planText.ageGroups.toddler}
          </button>
          <button
            type="button"
            aria-pressed={filterGroup === "hasNeeds"}
            onClick={() => setFilterGroup("hasNeeds")}
            className={choiceClass(filterGroup === "hasNeeds")}
          >
            {t.filterNeeds}
          </button>
        </div>
      </section>

      {/* Profile Cards Grid */}
      <section className="mt-6 motion-safe:animate-message-in motion-safe:[animation-delay:120ms]">
        {filteredProfiles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border-strong bg-surface/50 px-6 py-16 text-center">
            <Users className="mx-auto size-12 text-text-muted/60" aria-hidden="true" />
            <h3 className="mt-4 text-h3 text-text">{t.emptyTitle}</h3>
            <p className="mt-1 text-body text-text-muted">{t.emptySubtitle}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterGroup("all");
                }}
                className={OUTLINE_BUTTON}
              >
                {t.clearFilters}
              </button>
              <button type="button" onClick={handleOpenAdd} className={PRIMARY_BUTTON}>
                <Plus className="size-4" aria-hidden="true" />
                {t.addMember}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredProfiles.map((p, idx) => {
              const needCount = (p.needs?.length || 0) + (p.customNeeds?.length || 0);
              const interestKeys = Object.keys(p.interests || {}) as (keyof typeof p.interests)[];

              return (
                <article
                  key={`${p.id}-${idx}`}
                  className="group relative flex flex-col justify-between rounded-3xl border border-border bg-surface p-5 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md hover:shadow-neutral-950/5"
                >
                  <div>
                    {/* Header with Avatar & Details */}
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        <MemberAvatar ageGroup={p.ageGroup} variant={idx} className="size-16" />
                        <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-surface bg-primary text-caption font-bold text-on-primary">
                          <UserCheck className="size-3" aria-hidden="true" />
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-sans text-label-lg font-bold text-text">
                            {p.name}
                          </h3>
                          {p.relationship && (
                            <span className="inline-flex rounded-full bg-primary-subtle px-2.5 py-0.5 text-caption font-semibold text-primary">
                              {p.relationship}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-text-muted">
                          <span className="font-medium text-text">
                            {planText.ageGroups[p.ageGroup]}
                          </span>
                          {p.age !== null && <span>· {p.age} thn</span>}
                          {needCount > 0 && (
                            <span className="rounded-md bg-accent-subtle px-1.5 py-0.5 font-bold text-accent">
                              {fillTemplate(t.card.needsCount, { count: needCount })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Needs summary chips */}
                    {needCount > 0 && (
                      <div className="mt-4">
                        <p className="text-caption font-bold text-text-muted uppercase tracking-wider">
                          {t.card.preservedNeeds}
                        </p>
                        <ul className="mt-1.5 flex flex-wrap gap-1.5">
                          {p.needs?.map((need) => (
                            <li key={need}>
                              <NeedChip need={need} text={planText} />
                            </li>
                          ))}
                          {p.customNeeds?.map((cNeed) => (
                            <li
                              key={cNeed}
                              className="inline-flex max-w-full items-center gap-1.5 rounded-2xl border border-primary/40 bg-primary-subtle px-2.5 py-1 text-caption font-bold text-text"
                            >
                              <span className="truncate">{cNeed}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Allergies Notice */}
                    {p.allergies && p.allergies.trim() && (
                      <div className="mt-3 flex items-start gap-2 rounded-2xl bg-error-subtle px-3 py-2 text-body-sm text-error">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span className="font-medium">
                          {t.card.allergies}: {p.allergies}
                        </span>
                      </div>
                    )}

                    {/* Wishes & Interests */}
                    {(interestKeys.length > 0 || (p.customInterests && p.customInterests.length > 0)) && (
                      <div className="mt-3">
                        <p className="text-caption font-bold text-text-muted uppercase tracking-wider">
                          {t.card.wishes}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {interestKeys.map((key) => {
                            const level = p.interests[key];
                            return (
                              <span
                                key={key}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption ${
                                  level === "must"
                                    ? "bg-accent text-on-accent font-bold"
                                    : "bg-surface-muted text-text-muted"
                                }`}
                              >
                                {level === "must" && "⭐ "}
                                {planText.interests[key]}
                              </span>
                            );
                          })}
                          {p.customInterests?.map((w) => (
                            <span
                              key={w.label}
                              className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-0.5 text-caption text-text-muted"
                            >
                              {w.level === "must" && "⭐ "}
                              {w.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {p.notes && p.notes.trim() && (
                      <p className="mt-3 rounded-xl bg-surface-muted px-3 py-2 text-caption text-text-muted italic">
                        &quot;{p.notes}&quot;
                      </p>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <button
                      type="button"
                      onClick={() => handlePlanWithMember(p)}
                      className="group inline-flex items-center gap-1.5 text-label font-bold text-primary transition-colors hover:text-primary-hover hover:underline"
                    >
                      {t.card.planTrip}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        aria-label={`${t.card.editProfile} ${p.name}`}
                        title={t.card.editProfile}
                        className="inline-flex size-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text active:scale-95"
                      >
                        <Edit2 className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        aria-label={`${t.card.deleteProfile} ${p.name}`}
                        title={t.card.deleteProfile}
                        className="inline-flex size-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-error-subtle hover:text-error active:scale-95"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Editor Modal */}
      <ProfileEditorModal
        profile={editingProfile}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveProfile}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteProfileDialog
        name={deleteTarget ? deleteTarget.name : null}
        pending={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
