"use client";

import { AlertTriangle, Check, Plus, UserCheck, Users, X } from "lucide-react";
import Link from "next/link";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import MemberAvatar from "@/components/plan/MemberAvatar";
import { NeedChip } from "@/components/plan/NeedChips";
import { GHOST_BUTTON, PRIMARY_BUTTON } from "@/components/plan/styles";
import type { Member } from "@/lib/plan-draft";
import {
  type SavedMemberProfile,
  savedProfileToMember,
  useSavedProfiles,
} from "@/lib/saved-members-store";
import { useLocale } from "@/lib/use-locale";
import { useMessages } from "@/lib/use-messages";

type SavedProfilesPickerModalProps = {
  open: boolean;
  currentMembers: Member[];
  onClose: () => void;
  onAddMember: (member: Member) => void;
};

function formatRelationship(rel: string | undefined, isId: boolean): string {
  if (!rel) return isId ? "Keluarga" : "Family";
  const lower = rel.toLowerCase();
  if (isId) {
    if (lower === "family") return "Keluarga";
    if (lower === "father") return "Ayah";
    if (lower === "mother") return "Ibu";
    if (lower === "child") return "Anak";
    if (lower === "grandpa" || lower === "grandfather") return "Kakek";
    if (lower === "grandma" || lower === "grandmother") return "Nenek";
    if (lower === "friend") return "Teman";
    return rel;
  } else {
    if (lower === "keluarga") return "Family";
    if (lower === "ayah") return "Father";
    if (lower === "ibu") return "Mother";
    if (lower === "anak") return "Child";
    if (lower === "kakek") return "Grandfather";
    if (lower === "nenek") return "Grandmother";
    if (lower === "teman") return "Friend";
    return rel;
  }
}

export default function SavedProfilesPickerModal({
  open,
  currentMembers,
  onClose,
  onAddMember,
}: SavedProfilesPickerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const planText = useMessages("plan");
  const locale = useLocale();
  const isId = locale === "id";
  const { profiles } = useSavedProfiles();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [justAddedIds, setJustAddedIds] = useState<string[]>([]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const currentMemberNames = useMemo(
    () => new Set(currentMembers.map((m) => m.name.trim().toLowerCase())),
    [currentMembers],
  );

  const isAlreadyInTrip = (profile: SavedMemberProfile) => {
    return currentMemberNames.has(profile.name.trim().toLowerCase()) || justAddedIds.includes(profile.id);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((curr) =>
      curr.includes(id) ? curr.filter((item) => item !== id) : [...curr, id],
    );
  };

  const handleAddSingle = (profile: SavedMemberProfile) => {
    const member = savedProfileToMember(profile);
    onAddMember(member);
    setJustAddedIds((curr) => [...curr, profile.id]);
    setSelectedIds((curr) => curr.filter((id) => id !== profile.id));
  };

  const handleAddSelected = () => {
    const toAdd = profiles.filter((p) => selectedIds.includes(p.id) && !isAlreadyInTrip(p));
    for (const p of toAdd) {
      const member = savedProfileToMember(p);
      onAddMember(member);
    }
    setJustAddedIds((curr) => [...curr, ...toAdd.map((p) => p.id)]);
    setSelectedIds([]);
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="saved-picker-title"
      onClose={onClose}
      onClick={closeOnBackdrop}
      className="m-auto my-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-3xl overflow-hidden rounded-3xl border border-border bg-surface p-0 text-text shadow-2xl shadow-neutral-950/40 backdrop:bg-neutral-950/70 backdrop:backdrop-blur-sm open:motion-safe:animate-message-in"
    >
      <div className="flex max-h-[85vh] flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm shadow-primary/20">
              <Users className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="saved-picker-title" className="font-heading text-h3 text-text">
                {isId ? "Pilih dari Profil Tersimpan" : "Select from Saved Profiles"}
              </h2>
              <p className="mt-0.5 text-body-sm text-text-muted">
                {isId
                  ? "Bawa kebutuhan dan preferensi anggota langsung ke trip ini."
                  : "Add member needs directly into this trip without re-interviewing."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isId ? "Tutup dialog" : "Close dialog"}
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text active:scale-95"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        {/* Content list with custom smooth scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
          {profiles.length === 0 ? (
            <div className="py-16 text-center text-text-muted">
              <Users className="mx-auto size-12 opacity-40" aria-hidden="true" />
              <p className="mt-4 text-body font-medium">
                {isId ? "Belum ada profil tersimpan di database." : "No saved profiles found in database."}
              </p>
              <Link
                href="/profile/saved-members"
                className="mt-2 inline-block text-label text-primary underline underline-offset-4"
              >
                {isId ? "Kelola profil di sini" : "Manage profiles here"}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((p, idx) => {
                const added = isAlreadyInTrip(p);
                const selected = selectedIds.includes(p.id);
                const needCount = (p.needs?.length || 0) + (p.customNeeds?.length || 0);
                const relLabel = formatRelationship(p.relationship, isId);

                return (
                  <article
                    key={`${p.id}-${idx}`}
                    onClick={() => {
                      if (!added) handleToggleSelect(p.id);
                    }}
                    className={`group relative flex cursor-pointer items-start justify-between gap-4 rounded-2xl border p-4 transition-all duration-150 ${
                      added
                        ? "cursor-default border-border/80 bg-surface-muted/50 opacity-60"
                        : selected
                          ? "border-primary bg-primary-subtle/40 ring-1 ring-primary/40 shadow-sm"
                          : "border-border bg-surface hover:border-primary/50 hover:bg-surface-muted/40 hover:shadow-sm"
                    }`}
                  >
                    {/* Checkbox & Avatar */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={selected || added}
                          disabled={added}
                          onChange={() => handleToggleSelect(p.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Pilih ${p.name}`}
                          className="size-4.5 cursor-pointer rounded border-border-strong accent-primary disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="relative shrink-0">
                        <MemberAvatar ageGroup={p.ageGroup} variant={idx} className="size-12" />
                      </div>

                      {/* Info & Tags */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-heading text-label-lg font-bold text-text truncate">
                            {p.name}
                          </h3>
                          <span className="inline-flex rounded-full bg-primary-subtle px-2 py-0.5 text-caption font-semibold text-primary">
                            {relLabel}
                          </span>
                          <span className="text-caption text-text-muted">
                            {planText.ageGroups[p.ageGroup]}
                            {p.age !== null ? ` · ${p.age} ${isId ? "thn" : "yrs"}` : ""}
                          </span>
                        </div>

                        {/* Needs Chips & Alerts */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {p.needs?.map((need) => (
                            <NeedChip key={need} need={need} text={planText} />
                          ))}
                          {p.customNeeds?.map((cNeed) => (
                            <span
                              key={cNeed}
                              className="inline-flex items-center rounded-2xl border border-primary/30 bg-primary-subtle px-2.5 py-1 text-caption font-semibold text-text"
                            >
                              {cNeed}
                            </span>
                          ))}
                          {p.allergies && p.allergies.trim() && (
                            <span className="inline-flex items-center gap-1 rounded-2xl bg-error-subtle px-2.5 py-1 text-caption font-bold text-error">
                              <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
                              {isId ? `Alergi: ${p.allergies}` : `Allergy: ${p.allergies}`}
                            </span>
                          )}
                          {needCount === 0 && (!p.allergies || !p.allergies.trim()) && (
                            <span className="text-caption text-text-muted italic">
                              {isId ? "Tanpa kebutuhan khusus" : "No special needs"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Action */}
                    <div className="flex shrink-0 items-center pt-1" onClick={(e) => e.stopPropagation()}>
                      {added ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1.5 text-caption font-bold text-text-muted">
                          <Check className="size-3.5 text-success" strokeWidth={3} aria-hidden="true" />
                          {isId ? "Sudah Ada" : "Added"}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddSingle(p)}
                          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 text-label font-bold text-on-primary shadow-sm shadow-primary/20 transition-all hover:bg-primary-hover active:scale-95"
                        >
                          <Plus className="size-3.5" strokeWidth={3} aria-hidden="true" />
                          {isId ? "Tambah" : "Add"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-6 py-4">
          <Link
            href="/profile/saved-members"
            target="_blank"
            rel="noopener noreferrer"
            className="text-caption font-semibold text-primary underline-offset-4 hover:underline"
          >
            {isId ? "Kelola profil di pengaturan akun →" : "Manage saved profiles in settings →"}
          </Link>

          <div className="flex items-center gap-2.5">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleAddSelected}
                className={PRIMARY_BUTTON}
              >
                <Plus className="size-4" strokeWidth={3} aria-hidden="true" />
                {isId
                  ? `Tambahkan (${selectedIds.length}) Anggota`
                  : `Add (${selectedIds.length}) Members`}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={GHOST_BUTTON}
            >
              {isId ? "Selesai" : "Done"}
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
