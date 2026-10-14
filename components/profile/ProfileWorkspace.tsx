"use client";

import { signOut } from "firebase/auth";
import { Check, Loader2, Lock, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type CSSProperties, type FormEvent, useEffect, useRef, useState } from "react";
import { FOCUS_FIELD_LABEL } from "@/components/auth/TextField";
import Notice, { type NoticeMessage } from "@/components/layout/Notice";
import PageHeader from "@/components/layout/PageHeader";
import CountryPicker from "@/components/profile/CountryPicker";
import GenderSelect from "@/components/profile/GenderSelect";
import PhoneField from "@/components/profile/PhoneField";
import ProfileIdentity from "@/components/profile/ProfileIdentity";
import { buttonClass, GHOST_BUTTON, INPUT, PRIMARY_BUTTON } from "@/components/ui/styles";
import { ProfileError, saveProfileDetails, uploadProfilePhoto } from "@/lib/client/profile";
import { forgetPush } from "@/lib/client/push";
import { removeSession } from "@/lib/auth/session";
import { clearOfflineCaches } from "@/lib/offline";
import { auth } from "@/lib/firebase/client";
import type { Profile } from "@/lib/profile";
import { isAgeValid, isUsernameValid, MAX_AGE, MAX_PHOTO_BYTES } from "@/lib/profile-fields";
import { normalizePhone } from "@/lib/safety/contact";
import { callingCode, joinPhone, splitPhone } from "@/lib/travel/calling-codes";
import { countryOf } from "@/lib/travel/country-search";
import { useMessages } from "@/lib/use-messages";

type ProfileWorkspaceProps = {
  email: string | null;
  profile: Profile;
};

const FIELDS = ["name", "username", "nationality", "phone", "age", "gender"] as const;
type FieldKey = (typeof FIELDS)[number];
type Details = Record<FieldKey, string>;

const FIELD =
  "group sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start sm:gap-x-6 motion-safe:animate-list-in";
const FIELD_LABEL = `mb-2 block sm:mb-0 sm:leading-12 ${FOCUS_FIELD_LABEL}`;
// The fields arrive after the page header and the photo column, which take the first places in the sequence.
const FIRST_FIELD_PLACE = 3;

function arrival(place: number) {
  return { "--item-index": place } as CSSProperties;
}
const LOGOUT_BUTTON = `group/out ${buttonClass("outline")} motion-safe:animate-message-in`;
const TAKEN = 409;
const TOO_LARGE = 413;
const WRONG_TYPE = 415;

export default function ProfileWorkspace({ email, profile }: ProfileWorkspaceProps) {
  const t = useMessages("profile");
  const router = useRouter();

  const [saved, setSaved] = useState<Details>({
    name: profile.name,
    username: profile.username,
    nationality: countryOf(profile.nationality),
    phone: profile.phone,
    age: profile.age,
    gender: profile.gender,
  });
  const [form, setForm] = useState<Details>(saved);
  // The number is typed as a calling code and the rest; the form holds the two joined.
  const [dial, setDial] = useState(() => splitPhone(profile.phone).dial || callingCode(countryOf(profile.nationality)));
  const [national, setNational] = useState(() => splitPhone(profile.phone).national);
  const [photo, setPhoto] = useState(profile.photo ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  const noticeCount = useRef(0);

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
    phone: t.phoneLabel,
    age: t.ageLabel,
    gender: t.genderLabel,
  };
  const placeholders: Details = {
    name: t.namePlaceholder,
    username: t.usernamePlaceholder,
    nationality: t.nationalityPlaceholder,
    phone: t.phonePlaceholder,
    age: t.agePlaceholder,
    gender: "",
  };

  const displayName = saved.name || email?.split("@")[0] || t.fallbackName;
  const displayPhoto = previewUrl || photo || null;
  const ageInvalid = !isAgeValid(form.age);
  const usernameInvalid = !isUsernameValid(form.username);
  const phoneInvalid = form.phone !== "" && normalizePhone(form.phone) === null;
  const dirty = selectedFile !== null || FIELDS.some((field) => form[field] !== saved[field]);
  const inputClass = `${INPUT} disabled:cursor-not-allowed aria-invalid:border-error`;

  const announce = (tone: NoticeMessage["tone"], message: string) => {
    noticeCount.current += 1;
    setNotice({ id: noticeCount.current, tone, message });
  };
  // A new edit makes "saved" untrue, so that notice goes; an error stays until it is read and dismissed.
  const dropSuccess = () => setNotice((current) => (current?.tone === "success" ? null : current));

  const setField = (field: FieldKey, value: string) => {
    dropSuccess();
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setPhone = (nextDial: string, nextNational: string) => {
    setDial(nextDial);
    setNational(nextNational);
    setField("phone", joinPhone(nextDial, nextNational));
  };
  // A new country brings its calling code, unless a number is already typed under another one.
  const chooseCountry = (code: string) => {
    setField("nationality", code);
    if (national.trim() === "") setDial(callingCode(code));
  };

  const discardChanges = () => {
    setForm(saved);
    setDial(splitPhone(saved.phone).dial || callingCode(saved.nationality));
    setNational(splitPhone(saved.phone).national);
    setSelectedFile(null);
    setPreviewUrl(null);
    setNotice(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      announce("error", t.photoErrors.type);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      announce("error", t.photoErrors.size);
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setNotice(null);
  };

  const handleLogout = async () => {
    try {
      // While the session still stands: the next person on this device must not get this account's notifications.
      await forgetPush();
      await signOut(auth);
      // What was kept for offline use belongs to this person, so it goes before the session does.
      await clearOfflineCaches();
      await removeSession();
      router.push("/login");
    } catch (caught) {
      console.error("Logout failed", caught);
      announce("error", t.logoutError);
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
    if (phoneInvalid) {
      document.getElementById("profile-phone")?.focus();
      return;
    }
    if (ageInvalid) {
      document.getElementById("profile-age")?.focus();
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const next: Details = {
        name: form.name.trim(),
        // A leading @ is how people write a username, not part of it.
        username: form.username.trim().replace(/^@/, ""),
        nationality: form.nationality,
        phone: normalizePhone(form.phone) ?? "",
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
      announce("success", t.success);
      // The navbar shows the photo too; it reads it again from the server.
      router.refresh();
    } catch (caught) {
      announce("error", failureMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title={t.title} lead={t.subtitle} />

      <div className="mt-8 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-x-16">
        <ProfileIdentity
          displayName={displayName}
          username={saved.username}
          photo={displayPhoto}
          disabled={saving}
          onPhotoChosen={handleFileChange}
        />

        <form onSubmit={handleSave} noValidate className="mt-8 lg:mt-0">
          <div className="flex flex-col gap-4">
            {FIELDS.map((field, index) => (
              <div key={field} className={FIELD} style={arrival(FIRST_FIELD_PLACE + index)}>
                <label htmlFor={`profile-${field}`} className={FIELD_LABEL}>
                  {labels[field]}
                </label>
                {field === "gender" && (
                  <GenderSelect
                    id="profile-gender"
                    value={form.gender}
                    options={t.genderOptions}
                    disabled={saving}
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
                      disabled={saving}
                      placeholder={placeholders.age}
                      aria-invalid={ageInvalid}
                      aria-describedby={ageInvalid ? "profile-age-error" : undefined}
                      className={inputClass}
                    />
                    {ageInvalid && (
                      <p id="profile-age-error" className="mt-2 text-body-sm text-error motion-safe:animate-message-in">
                        {t.ageError}
                      </p>
                    )}
                  </div>
                )}
                {field === "nationality" && (
                  <CountryPicker
                    id="profile-nationality"
                    value={form.nationality}
                    placeholder={placeholders.nationality}
                    emptyLabel={t.countryNoMatch}
                    disabled={saving}
                    onChange={chooseCountry}
                  />
                )}
                {field === "phone" && (
                  <div>
                    <PhoneField
                      id="profile-phone"
                      dial={dial}
                      national={national}
                      dialLabel={t.dialLabel}
                      placeholder={placeholders.phone}
                      disabled={saving}
                      invalid={phoneInvalid}
                      describedBy="profile-phone-hint"
                      onDialChange={(value) => setPhone(value, national)}
                      onNationalChange={(value) => setPhone(dial, value)}
                    />
                    <p id="profile-phone-hint" className={`mt-2 text-body-sm text-pretty ${phoneInvalid ? "text-error" : "text-text-muted"}`}>
                      {phoneInvalid ? t.phoneError : t.phoneHint}
                    </p>
                  </div>
                )}
                {(field === "name" || field === "username") && (
                  <div>
                    <input
                      id={`profile-${field}`}
                      type="text"
                      value={form[field]}
                      onChange={(event) => setField(field, event.target.value)}
                      disabled={saving}
                      placeholder={placeholders[field]}
                      autoComplete={field === "name" ? "name" : "off"}
                      aria-invalid={field === "username" && usernameInvalid ? true : undefined}
                      aria-describedby={field === "username" && usernameInvalid ? "profile-username-error" : undefined}
                      className={inputClass}
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

            <div className={FIELD} style={arrival(FIRST_FIELD_PLACE + FIELDS.length)}>
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
                  className={`${INPUT} pr-12 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted`}
                />
                <Lock
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-text-muted motion-safe:group-hover/lock:animate-lock-nudge"
                />
              </div>
            </div>
          </div>

          <Notice notice={notice} dismissLabel={t.dismiss} onDismiss={() => setNotice(null)} />

          <div
            style={arrival(FIRST_FIELD_PLACE + FIELDS.length + 1)}
            className={`mt-6 flex justify-end gap-3 motion-safe:animate-list-in sm:flex-row sm:items-center ${
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
                  className="size-4 text-error transition-[translate] duration-200 ease-out group-hover/out:translate-x-1"
                  aria-hidden="true"
                />
                {t.logoutButton}
              </button>
            )}
            <button
              type="submit"
              disabled={!dirty || saving}
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
    </>
  );
}
