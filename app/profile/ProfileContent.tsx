"use client";

import { signOut } from "firebase/auth";
import { ArrowRight, Camera, Check, CircleAlert, Globe, Loader2, Lock, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { GHOST_BUTTON, INPUT, OUTLINE_BUTTON, PRIMARY_BUTTON } from "@/components/plan/styles";
import GenderSelect from "@/components/profile/GenderSelect";
import ProfilePhoto from "@/components/profile/ProfilePhoto";
import { ProfileError, saveProfileDetails, uploadProfilePhoto } from "@/lib/api/profile";
import { removeSession } from "@/lib/auth/session";
import { auth } from "@/lib/firebase/client";
import type { Profile } from "@/lib/profile";
import { isAgeValid, isUsernameValid, MAX_AGE, MAX_PHOTO_BYTES } from "@/lib/profile-fields";
import { useMessages } from "@/lib/use-messages";

type ProfileContentProps = {
  email: string | null;
  profile: Profile;
};

const FIELDS = ["name", "username", "nationality", "age", "gender"] as const;
type FieldKey = (typeof FIELDS)[number];
type Details = Record<FieldKey, string>;

const FIELD =
  "group sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start sm:gap-x-6 motion-safe:animate-message-in";
const FIELD_LABEL =
  "mb-2 block text-label text-text transition-colors duration-150 ease-out group-focus-within:text-primary sm:mb-0 sm:leading-12";
const ENTER_STEP_MS = 40;
const LOGOUT_BUTTON =
  "group/out inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-border-strong px-6 text-label-lg text-error transition-[background-color,scale] duration-150 ease-out hover:bg-error-subtle active:scale-[0.97] motion-safe:animate-message-in";
const TAKEN = 409;
const TOO_LARGE = 413;
const WRONG_TYPE = 415;

export default function ProfileContent({ email, profile }: ProfileContentProps) {
  const t = useMessages("profile");
  const travel = useMessages("travel");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saved, setSaved] = useState<Details>({
    name: profile.name,
    username: profile.username,
    nationality: profile.nationality,
    age: profile.age,
    gender: profile.gender,
  });
  const [form, setForm] = useState<Details>(saved);
  const [photo, setPhoto] = useState(profile.photo ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [succeeded, setSucceeded] = useState(false);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const labels: Details = {
    name: t.nameLabel,
    username: t.usernameLabel,
    nationality: t.nationalityLabel,
    age: t.ageLabel,
    gender: t.genderLabel,
  };
  const placeholders: Details = {
    name: t.namePlaceholder,
    username: t.usernamePlaceholder,
    nationality: t.nationalityPlaceholder,
    age: t.agePlaceholder,
    gender: "",
  };

  const displayName = saved.name || email?.split("@")[0] || t.fallbackName;
  const displayPhoto = previewUrl || photo || null;
  const ageInvalid = !isAgeValid(form.age);
  const usernameInvalid = !isUsernameValid(form.username);
  const locked = saving;
  const dirty = selectedFile !== null || FIELDS.some((field) => form[field] !== saved[field]);
  const inputClass = `${INPUT} disabled:cursor-not-allowed`;

  const setField = (field: FieldKey, value: string) => {
    setSucceeded(false);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const discardChanges = () => {
    setForm(saved);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError("");
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t.photoErrors.type);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError(t.photoErrors.size);
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setSucceeded(false);
    setError("");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await removeSession();
      router.push("/login");
    } catch (caught) {
      console.error("Logout failed", caught);
    }
  };

  const failureMessage = (caught: unknown) => {
    const status = caught instanceof ProfileError ? caught.status : 0;
    if (status === TAKEN) return t.usernameTaken;
    if (status === TOO_LARGE) return t.photoErrors.size;
    if (status === WRONG_TYPE) return t.photoErrors.type;
    return t.error;
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (usernameInvalid) {
      document.getElementById("profile-username")?.focus();
      return;
    }
    if (ageInvalid) {
      document.getElementById("profile-age")?.focus();
      return;
    }

    setSaving(true);
    setError("");

    try {
      const next: Details = {
        name: form.name.trim(),
        // A leading @ is how people write a username, not part of it.
        username: form.username.trim().replace(/^@/, ""),
        nationality: form.nationality.trim(),
        age: form.age,
        gender: form.gender,
      };

      // The photo goes first: when it is refused, nothing else has changed and the form still shows what to fix.
      if (selectedFile) {
        setPhoto(await uploadProfilePhoto(selectedFile));
        setSelectedFile(null);
        setPreviewUrl(null);
      }
      await saveProfileDetails(next);

      setSaved(next);
      setForm(next);
      setSucceeded(true);
      // The navbar shows the photo too; it reads it again from the server.
      router.refresh();
    } catch (caught) {
      setError(failureMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 lg:max-w-5xl xl:px-0">
      <header className="motion-safe:animate-message-in">
        <h1 className="text-h2 text-text sm:text-h1">{t.title}</h1>
        <p className="mt-2 text-body text-text-muted">{t.subtitle}</p>
      </header>

      <div className="mt-10 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-x-16">
        <section
          aria-label={displayName}
          className="flex flex-col items-center text-center motion-safe:animate-message-in motion-safe:[animation-delay:80ms]"
        >
          <div className="relative">
            <span key={displayPhoto ?? "dummy"} className="block motion-safe:animate-pop-in">
              <ProfilePhoto src={displayPhoto} className="size-32" />
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={locked}
              aria-label={t.changePhoto}
              title={t.changePhoto}
              className="group/camera absolute right-0 bottom-0 inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-text shadow-md shadow-neutral-950/10 transition-[background-color,scale] duration-150 ease-out hover:scale-105 hover:bg-surface-muted active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Camera
                className="size-5 transition-[rotate] duration-200 ease-out group-hover/camera:-rotate-12"
                aria-hidden="true"
              />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/webp"
              className="sr-only"
            />
          </div>

          <p className="mt-6 max-w-full font-heading text-h2 wrap-break-word text-text">{displayName}</p>
          {saved.username && <p className="mt-1 max-w-full text-body break-all text-primary">@{saved.username}</p>}
          <p className="mt-4 text-body-sm text-text-muted">{t.photoHint}</p>
          <Link href="/profile/map" className={`group ${OUTLINE_BUTTON} mt-6 w-full max-w-xs`}>
            <Globe
              className="size-4 text-primary transition-[rotate] duration-500 ease-out group-hover:rotate-45"
              aria-hidden="true"
            />
            {travel.open}
            <ArrowRight
              className="size-4 transition-[translate] duration-200 ease-out group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </section>

        <form onSubmit={handleSave} noValidate className="mt-10 lg:mt-0">
          <div className="flex flex-col gap-6">
            {FIELDS.map((field, index) => (
              <div key={field} className={FIELD} style={{ animationDelay: `${(index + 3) * ENTER_STEP_MS}ms` }}>
                <label htmlFor={`profile-${field}`} className={FIELD_LABEL}>
                  {labels[field]}
                </label>
                {field === "gender" && (
                  <GenderSelect
                    id="profile-gender"
                    value={form.gender}
                    options={t.genderOptions}
                    disabled={locked}
                    onChange={(value) => setField("gender", value)}
                  />
                )}
                {field === "age" && (
                  <div>
                    <input
                      id="profile-age"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_AGE}
                      value={form.age}
                      onChange={(event) => setField("age", event.target.value)}
                      disabled={locked}
                      placeholder={placeholders.age}
                      aria-invalid={ageInvalid}
                      aria-describedby={ageInvalid ? "profile-age-error" : undefined}
                      className={`${inputClass} ${ageInvalid ? "border-error" : ""}`}
                    />
                    {ageInvalid && (
                      <p id="profile-age-error" className="mt-2 text-body-sm text-error motion-safe:animate-message-in">
                        {t.ageError}
                      </p>
                    )}
                  </div>
                )}
                {field !== "gender" && field !== "age" && (
                  <div>
                    <input
                      id={`profile-${field}`}
                      type="text"
                      value={form[field]}
                      onChange={(event) => setField(field, event.target.value)}
                      disabled={locked}
                      placeholder={placeholders[field]}
                      autoComplete={field === "name" ? "name" : "off"}
                      aria-invalid={field === "username" && usernameInvalid ? true : undefined}
                      aria-describedby={field === "username" && usernameInvalid ? "profile-username-error" : undefined}
                      className={`${inputClass} ${field === "username" && usernameInvalid ? "border-error" : ""}`}
                    />
                    {field === "username" && usernameInvalid && (
                      <p
                        id="profile-username-error"
                        className="mt-2 text-body-sm text-error motion-safe:animate-message-in"
                      >
                        {t.usernameError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div className={FIELD} style={{ animationDelay: `${(FIELDS.length + 3) * ENTER_STEP_MS}ms` }}>
              <label htmlFor="profile-email" className={FIELD_LABEL}>
                {t.emailLabel}
              </label>
              <div className="group/lock relative">
                <input
                  id="profile-email"
                  type="email"
                  value={email ?? ""}
                  disabled
                  readOnly
                  className={`${INPUT} cursor-not-allowed bg-surface-muted pr-12 text-text-muted`}
                />
                <Lock
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-text-muted motion-safe:group-hover/lock:animate-lock-nudge"
                />
              </div>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-center gap-3 rounded-2xl bg-error-subtle px-4 py-3 motion-safe:animate-message-in"
            >
              <CircleAlert className="size-5 shrink-0 text-error" aria-hidden="true" />
              <p className="text-body-sm text-on-error-subtle">{error}</p>
            </div>
          )}

          {succeeded && !dirty && (
            <p
              role="status"
              className="mt-6 flex items-center gap-2 text-label text-success motion-safe:animate-message-in sm:justify-end"
            >
              <Check className="size-4 motion-safe:animate-stamp-in" aria-hidden="true" />
              {t.success}
            </p>
          )}

          <div
            style={{ animationDelay: `${(FIELDS.length + 4) * ENTER_STEP_MS}ms` }}
            className={`mt-8 flex justify-end gap-3 motion-safe:animate-message-in sm:flex-row sm:items-center ${
              dirty
                ? "safe-bottom sticky bottom-0 -mx-4 items-center border-t border-border bg-background px-4 pt-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0"
                : "flex-col-reverse"
            }`}
          >
            {dirty ? (
              <button
                key="cancel"
                type="button"
                onClick={discardChanges}
                disabled={saving}
                className={`${GHOST_BUTTON} motion-safe:animate-message-in`}
              >
                {t.cancel}
              </button>
            ) : (
              <button key="logout" type="button" onClick={handleLogout} className={LOGOUT_BUTTON}>
                <LogOut
                  className="size-4 transition-[translate] duration-200 ease-out group-hover/out:translate-x-1"
                  aria-hidden="true"
                />
                {t.logoutButton}
              </button>
            )}
            <button
              type="submit"
              disabled={!dirty || locked}
              className={`${PRIMARY_BUTTON} whitespace-nowrap ${dirty ? "flex-1 sm:flex-none" : ""}`}
            >
              {saving ? (
                <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              {saving ? t.saving : t.saveButton}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
