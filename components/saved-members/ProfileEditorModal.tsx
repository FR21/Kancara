"use client";

import { Check, Plus, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import MemberAvatar from "@/components/plan/MemberAvatar";
import {
  choiceClass,
  FIELD_LABEL,
  GHOST_BUTTON,
  INPUT,
  PRIMARY_BUTTON,
} from "@/components/plan/styles";
import {
  type AgeGroup,
  type CustomInterest,
  type InterestKey,
  type NeedKey,
  type WishLevel,
  AGE_GROUPS,
  INTEREST_KEYS,
  MAX_AGE,
  NEED_CATEGORIES,
  NEED_CATEGORY_KEYS,
} from "@/lib/plan-draft";
import type { SavedMemberProfile } from "@/lib/saved-members-store";
import { useLocale } from "@/lib/use-locale";
import { useMessages } from "@/lib/use-messages";

type ProfileEditorModalProps = {
  profile: SavedMemberProfile | null; // null if creating fresh profile
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<SavedMemberProfile, "createdAt" | "updatedAt">) => void;
};

const RELATIONSHIP_SUGGESTIONS_ID = [
  "Ayah",
  "Ibu",
  "Kakek",
  "Nenek",
  "Anak",
  "Kakak",
  "Adik",
  "Pasangan",
  "Teman",
  "Keluarga",
];

const RELATIONSHIP_SUGGESTIONS_EN = [
  "Father",
  "Mother",
  "Grandpa",
  "Grandma",
  "Child",
  "Brother",
  "Sister",
  "Partner",
  "Friend",
  "Family",
];

export default function ProfileEditorModal({
  profile,
  open,
  onClose,
  onSave,
}: ProfileEditorModalProps) {
  const planText = useMessages("plan");
  const t = useMessages("savedProfiles");
  const locale = useLocale();
  const isId = locale === "id";
  const relSuggestions = isId ? RELATIONSHIP_SUGGESTIONS_ID : RELATIONSHIP_SUGGESTIONS_EN;

  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("adult");
  const [age, setAge] = useState<string>("");
  const [needs, setNeeds] = useState<NeedKey[]>([]);
  const [customNeeds, setCustomNeeds] = useState<string[]>([]);
  const [newCustomNeed, setNewCustomNeed] = useState("");
  const [allergies, setAllergies] = useState("");
  const [interests, setInterests] = useState<Partial<Record<InterestKey, WishLevel>>>({});
  const [customInterests, setCustomInterests] = useState<CustomInterest[]>([]);
  const [newCustomInterest, setNewCustomInterest] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setRelationship(profile.relationship || "");
      setAgeGroup(profile.ageGroup);
      setAge(profile.age !== null ? String(profile.age) : "");
      setNeeds(profile.needs || []);
      setCustomNeeds(profile.customNeeds || []);
      setAllergies(profile.allergies || "");
      setInterests(profile.interests || {});
      setCustomInterests(profile.customInterests || []);
      setNotes(profile.notes || "");
    } else {
      setName("");
      setRelationship("");
      setAgeGroup("adult");
      setAge("");
      setNeeds([]);
      setCustomNeeds([]);
      setAllergies("");
      setInterests({});
      setCustomInterests([]);
      setNotes("");
    }
  }, [profile, open]);

  if (!open) return null;

  const toggleNeed = (need: NeedKey) => {
    setNeeds((curr) =>
      curr.includes(need) ? curr.filter((item) => item !== need) : [...curr, need],
    );
  };

  const addCustomNeed = () => {
    const val = newCustomNeed.trim();
    if (val && !customNeeds.includes(val)) {
      setCustomNeeds((curr) => [...curr, val]);
      setNewCustomNeed("");
    }
  };

  const removeCustomNeed = (val: string) => {
    setCustomNeeds((curr) => curr.filter((item) => item !== val));
  };

  const toggleInterest = (key: InterestKey) => {
    setInterests((curr) => {
      const next = { ...curr };
      if (!next[key]) {
        next[key] = "nice";
      } else if (next[key] === "nice") {
        next[key] = "must";
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const addCustomWish = () => {
    const val = newCustomInterest.trim();
    if (val && !customInterests.some((w) => w.label.toLowerCase() === val.toLowerCase())) {
      setCustomInterests((curr) => [...curr, { label: val, level: "nice" }]);
      setNewCustomInterest("");
    }
  };

  const removeCustomWish = (label: string) => {
    setCustomInterests((curr) => curr.filter((w) => w.label !== label));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: profile ? profile.id : crypto.randomUUID(),
      name: name.trim(),
      relationship: relationship.trim() || (isId ? "Keluarga" : "Family"),
      ageGroup,
      age: age ? Math.min(Math.max(1, Number(age)), MAX_AGE) : null,
      needs,
      customNeeds,
      allergies: allergies.trim(),
      interests,
      customInterests,
      notes: notes.trim(),
    });
    onClose();
  };

  const modalTitle = profile ? t.modal.titleEdit : t.modal.titleAdd;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm transition-opacity"
      />

      {/* Dialog box */}
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-surface p-6 shadow-2xl shadow-neutral-950/40 motion-safe:animate-message-in sm:p-8">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <MemberAvatar ageGroup={ageGroup} variant={0} className="size-11" />
            <div>
              <h2 id="profile-modal-title" className="text-h3 text-text">
                {modalTitle}
              </h2>
              <p className="text-caption text-text-muted">{t.modal.hint}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.modal.cancel}
            className="inline-flex size-10 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="field-name" className={FIELD_LABEL}>
                {t.modal.nameLabel}
              </label>
              <input
                id="field-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.modal.namePlaceholder}
                className={`${INPUT} mt-1`}
              />
            </div>
            <div>
              <label htmlFor="field-relationship" className={FIELD_LABEL}>
                {t.modal.relLabel}
              </label>
              <input
                id="field-relationship"
                type="text"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder={t.modal.relPlaceholder}
                className={`${INPUT} mt-1`}
              />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {relSuggestions.slice(0, 5).map((sugg) => (
                  <button
                    key={sugg}
                    type="button"
                    onClick={() => setRelationship(sugg)}
                    className="rounded-full bg-surface-muted px-2 py-0.5 text-caption text-text-muted transition-colors hover:bg-primary-subtle hover:text-primary"
                  >
                    {sugg}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Age Group and Exact Age */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <span className={FIELD_LABEL}>{planText.pass.ageGroup}</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {AGE_GROUPS.map((grp) => {
                  const selected = ageGroup === grp;
                  return (
                    <button
                      key={grp}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setAgeGroup(grp)}
                      className={choiceClass(selected)}
                    >
                      {selected && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
                      {planText.ageGroups[grp]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label htmlFor="field-age" className={FIELD_LABEL}>
                {t.modal.ageLabel}
              </label>
              <input
                id="field-age"
                type="number"
                min={1}
                max={MAX_AGE}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={t.modal.agePlaceholder}
                className={`${INPUT} mt-1`}
              />
            </div>
          </div>

          {/* Needs Checklist */}
          <div>
            <div className="flex items-center justify-between">
              <span className={FIELD_LABEL}>{planText.pass.needsLegend}</span>
              <span className="text-caption text-text-muted">{t.modal.selectNeeds}</span>
            </div>
            <p className="mt-1 text-body-sm text-text-muted">{planText.pass.needsHint}</p>

            <div className="mt-3 space-y-3 rounded-2xl border border-border bg-surface-muted/50 p-4">
              {NEED_CATEGORY_KEYS.map((cat) => (
                <div key={cat} className="sm:grid sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-2">
                  <span className="pt-2 text-caption font-bold text-text-muted">
                    {planText.needCategories[cat]}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-2 sm:mt-0">
                    {NEED_CATEGORIES[cat].map((need) => {
                      const selected = needs.includes(need);
                      return (
                        <button
                          key={need}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleNeed(need)}
                          className={choiceClass(selected)}
                        >
                          {selected && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                          {planText.needs[need]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Custom Needs */}
              <div className="border-t border-border pt-3">
                <span className="text-caption font-bold text-text-muted">
                  {t.modal.customNeeds}
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {customNeeds.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary-subtle px-3 py-1 text-caption font-medium text-text"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeCustomNeed(item)}
                        className="rounded-full text-text-muted hover:text-error"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newCustomNeed}
                    onChange={(e) => setNewCustomNeed(e.target.value)}
                    placeholder={t.modal.customNeedPlaceholder}
                    className={`${INPUT} flex-1`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomNeed();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustomNeed}
                    className="inline-flex items-center gap-1 rounded-full border border-border-strong px-4 text-label text-text transition-colors hover:bg-surface-muted"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    {t.modal.addBtn}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Allergies */}
          <div>
            <label htmlFor="field-allergies" className={FIELD_LABEL}>
              {planText.pass.allergies}
            </label>
            <input
              id="field-allergies"
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder={t.modal.allergiesPlaceholder}
              className={`${INPUT} mt-1`}
            />
          </div>

          {/* Travel Interests / Preferences */}
          <div>
            <span className={FIELD_LABEL}>{planText.pass.interestsLegend}</span>
            <p className="mt-1 text-caption text-text-muted">{t.modal.interestsHint}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTEREST_KEYS.map((key) => {
                const level = interests[key];
                const active = Boolean(level);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleInterest(key)}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-label transition-colors ${
                      level === "must"
                        ? "border-accent bg-accent text-on-accent font-bold"
                        : active
                          ? "border-primary bg-primary-subtle text-text"
                          : "border-border bg-surface text-text-muted hover:border-border-strong"
                    }`}
                  >
                    {level === "must" && <span>⭐</span>}
                    {planText.interests[key]}
                    {level && (
                      <span className="text-caption opacity-80">
                        ({level === "must" ? t.modal.mustLevel : t.modal.niceLevel})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Interests */}
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {customInterests.map((wish) => (
                  <span
                    key={wish.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1 text-caption text-text"
                  >
                    {wish.label}
                    <button
                      type="button"
                      onClick={() => removeCustomWish(wish.label)}
                      className="rounded-full text-text-muted hover:text-error"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newCustomInterest}
                  onChange={(e) => setNewCustomInterest(e.target.value)}
                  placeholder={t.modal.customWishPlaceholder}
                  className={`${INPUT} flex-1`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomWish();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addCustomWish}
                  className="inline-flex items-center gap-1 rounded-full border border-border-strong px-4 text-label text-text transition-colors hover:bg-surface-muted"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  {t.modal.addBtn}
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="field-notes" className={FIELD_LABEL}>
              {t.modal.notesLabel}
            </label>
            <textarea
              id="field-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.modal.notesPlaceholder}
              className={`${INPUT} mt-1`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse justify-end gap-3 border-t border-border pt-4 sm:flex-row">
            <button type="button" onClick={onClose} className={GHOST_BUTTON}>
              {t.modal.cancel}
            </button>
            <button type="submit" className={PRIMARY_BUTTON}>
              <Check className="size-4" aria-hidden="true" />
              {profile ? t.modal.saveChanges : t.modal.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
