"use client";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import AuthHeading from "@/components/auth/AuthHeading";
import { FormAlert, GoogleButton, OrDivider, PasswordRules, SubmitButton } from "@/components/auth/AuthParts";
import LegalSheet, { type LegalKind } from "@/components/auth/LegalSheet";
import TextField, { FOCUS_FIELD_LABEL, OptionalMark } from "@/components/auth/TextField";
import Stepper, { type StepperStep } from "@/components/ui/Stepper";
import { GHOST_BUTTON, TEXT_LINK } from "@/components/ui/styles";
import CountryPicker from "@/components/profile/CountryPicker";
import GenderSelect from "@/components/profile/GenderSelect";
import PhoneField from "@/components/profile/PhoneField";
import { saveProfileDetails } from "@/lib/client/profile";
import { signInWithGoogle, startSession } from "@/lib/auth/client";
import { useAuthFlow } from "@/lib/auth/use-auth-flow";
import { emailIssue, isPasswordStrong } from "@/lib/auth/validation";
import { auth } from "@/lib/firebase/client";
import { isAgeValid, isNameValid, isUsernameValid, MAX_AGE } from "@/lib/profile-fields";
import { normalizePhone } from "@/lib/safety/contact";
import { callingCode, joinPhone } from "@/lib/travel/calling-codes";
import { useMessages } from "@/lib/use-messages";

const HOME = "/trips";
const PROFILE = "/profile";
// A link inside a sentence keeps the sentence's line height, so it is underlined to read as a link.
const INLINE_LINK =
  "cursor-pointer rounded-sm text-primary underline underline-offset-4 transition-colors duration-150 ease-out hover:text-primary-hover";

const STEPS = ["account", "about"] as const;
type Step = (typeof STEPS)[number];

const STEP_FIELDS = {
  account: ["email", "password", "confirm"],
  about: ["name", "username", "phone", "age"],
} as const;
type CheckedField = (typeof STEP_FIELDS)[Step][number];

const FIRST_FIELD: Record<Step, string> = { account: "register-email", about: "register-name" };

export default function RegisterPage() {
  const t = useMessages("auth");
  const profile = useMessages("profile");
  const legal = useMessages("legal");
  const { pending, error, run } = useAuthFlow();

  const [step, setStep] = useState<Step>("account");
  const [legalShown, setLegalShown] = useState<LegalKind | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [nationality, setNationality] = useState("");
  // The calling code follows the country until someone types their own.
  const [dial, setDial] = useState("");
  const [dialTyped, setDialTyped] = useState(false);
  const [national, setNational] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [takenEmail, setTakenEmail] = useState("");
  const [touched, setTouched] = useState<ReadonlySet<CheckedField>>(new Set());
  const [attempted, setAttempted] = useState<ReadonlySet<Step>>(new Set());
  const focusedStep = useRef<Step>(step);

  useEffect(() => {
    if (focusedStep.current === step) return;
    focusedStep.current = step;
    document.getElementById(FIRST_FIELD[step])?.focus();
  }, [step]);

  const emailError = () => {
    const issue = emailIssue(email);
    if (issue) return t.errors[issue];
    if (email.trim() === takenEmail) return t.errors.emailInUse;
    return "";
  };
  const confirmError = () => {
    if (confirm === "") return t.errors.required;
    if (confirm !== password) return t.errors.passwordMismatch;
    return "";
  };
  const nameError = () => {
    if (name.trim() === "") return t.errors.required;
    if (!isNameValid(name)) return profile.nameError;
    return "";
  };

  const errors: Record<CheckedField, string> = {
    email: emailError(),
    password: isPasswordStrong(password) ? "" : t.errors.passwordRules,
    confirm: confirmError(),
    name: nameError(),
    username: isUsernameValid(username) ? "" : profile.usernameError,
    phone: national.trim() === "" || normalizePhone(joinPhone(dial, national)) !== null ? "" : profile.phoneError,
    age: isAgeValid(age) ? "" : profile.ageError,
  };

  const chooseCountry = (code: string) => {
    setNationality(code);
    if (!dialTyped) setDial(callingCode(code));
  };

  const stepOf = (field: CheckedField): Step =>
    STEP_FIELDS.account.some((accountField) => accountField === field) ? "account" : "about";
  const shown = (field: CheckedField) => (touched.has(field) || attempted.has(stepOf(field)) ? errors[field] : "");
  const touch = (field: CheckedField) => setTouched((current) => new Set(current).add(field));

  const firstInvalid = (target: Step) => STEP_FIELDS[target].find((field) => errors[field] !== "");

  const createAccount = () =>
    run(async () => {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (!(await startSession(credential.user))) return null;
      // The details are saved through the API, which needs the session that was just started. When that fails
      // the account still exists, so the newcomer lands on their profile to fill them in again.
      try {
        await saveProfileDetails({
          name: name.trim(),
          username: username.trim().replace(/^@/, ""),
          nationality,
          phone: joinPhone(dial, national),
          age,
          gender,
        });
        return HOME;
      } catch {
        return PROFILE;
      }
    });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAttempted((current) => new Set(current).add(step));
    const invalid = firstInvalid(step);
    if (invalid) {
      document.getElementById(`register-${invalid}`)?.focus();
      return;
    }
    if (step === "account") {
      setStep("about");
      return;
    }
    const failure = await createAccount();
    if (failure === "emailInUse") {
      setTakenEmail(email.trim());
      setStep("account");
    }
  };

  const handleGoogle = () => run(async () => ((await signInWithGoogle()) ? HOME : null));

  const reveal = { show: t.common.showPassword, hide: t.common.hidePassword };
  const currentIndex = STEPS.indexOf(step);
  // A step already passed can be opened again; the one ahead opens only through the form's own button, which
  // checks the fields first.
  const stations: StepperStep[] = STEPS.map((item, index) => ({
    key: item,
    label: t.register.steps[item],
    done: index < currentIndex,
    current: index === currentIndex,
    onSelect: index < currentIndex && !pending ? () => setStep(item) : null,
  }));

  return (
    <div className="motion-safe:animate-message-in">
      <AuthHeading
        title={t.register.title}
        subtitle={step === "account" ? t.register.subtitle : t.register.aboutSubtitle}
      />

      <div className="mt-8">
        <Stepper steps={stations} text={t.register.stepper} />
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <FormAlert message={error} />

        {step === "account" ? (
          <div key="account" className="flex flex-col gap-4 motion-safe:animate-message-in">
            <TextField
              id="register-email"
              type="email"
              label={t.register.emailLabel}
              placeholder={t.register.emailPlaceholder}
              autoComplete="email"
              inputMode="email"
              value={email}
              error={shown("email")}
              disabled={pending}
              onChange={setEmail}
              onBlur={() => touch("email")}
            />
            <div>
              <TextField
                id="register-password"
                type="password"
                label={t.register.passwordLabel}
                placeholder={t.register.passwordPlaceholder}
                autoComplete="new-password"
                value={password}
                error={shown("password")}
                disabled={pending}
                reveal={reveal}
                describedBy="register-password-rules"
                onChange={setPassword}
                onBlur={() => touch("password")}
              />
              <PasswordRules
                id="register-password-rules"
                password={password}
                legend={t.register.rulesLegend}
                labels={t.register.rules}
              />
            </div>
            <TextField
              id="register-confirm"
              type="password"
              label={t.register.confirmLabel}
              placeholder={t.register.confirmPlaceholder}
              autoComplete="new-password"
              value={confirm}
              error={shown("confirm")}
              disabled={pending}
              reveal={reveal}
              onChange={setConfirm}
              onBlur={() => touch("confirm")}
            />
            <SubmitButton pending={pending} className="mt-2 w-full">
              {t.register.next}
              <ArrowRight className="size-4" aria-hidden="true" />
            </SubmitButton>
          </div>
        ) : (
          <div key="about" className="flex flex-col gap-4 motion-safe:animate-message-in">
            <TextField
              id="register-name"
              label={profile.nameLabel}
              placeholder={profile.namePlaceholder}
              autoComplete="name"
              value={name}
              error={shown("name")}
              disabled={pending}
              onChange={setName}
              onBlur={() => touch("name")}
            />
            <TextField
              id="register-username"
              label={profile.usernameLabel}
              optionalLabel={t.common.optional}
              placeholder={profile.usernamePlaceholder}
              autoComplete="off"
              value={username}
              error={shown("username")}
              disabled={pending}
              onChange={setUsername}
              onBlur={() => touch("username")}
            />
            <div className="group">
              <label htmlFor="register-nationality" className={`mb-2 block ${FOCUS_FIELD_LABEL}`}>
                {profile.nationalityLabel}
                <OptionalMark label={t.common.optional} />
              </label>
              <CountryPicker
                id="register-nationality"
                value={nationality}
                placeholder={profile.nationalityPlaceholder}
                emptyLabel={profile.countryNoMatch}
                disabled={pending}
                onChange={chooseCountry}
              />
            </div>
            <div className="group">
              <label htmlFor="register-phone" className={`mb-2 block ${FOCUS_FIELD_LABEL}`}>
                {profile.phoneLabel}
                <OptionalMark label={t.common.optional} />
              </label>
              <PhoneField
                id="register-phone"
                dial={dial}
                national={national}
                dialLabel={profile.dialLabel}
                placeholder={profile.phonePlaceholder}
                disabled={pending}
                invalid={shown("phone") !== ""}
                describedBy="register-phone-hint"
                onDialChange={(value) => {
                  setDial(value);
                  setDialTyped(true);
                }}
                onNationalChange={setNational}
                onBlur={() => touch("phone")}
              />
              <p id="register-phone-hint" className={`mt-2 text-body-sm text-pretty ${shown("phone") ? "text-error" : "text-text-muted"}`}>
                {shown("phone") || profile.phoneHint}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="register-age"
                type="number"
                label={profile.ageLabel}
                optionalLabel={t.common.optional}
                placeholder={profile.agePlaceholder}
                inputMode="numeric"
                min={1}
                max={MAX_AGE}
                value={age}
                error={shown("age")}
                disabled={pending}
                onChange={setAge}
                onBlur={() => touch("age")}
              />
              <div className="group">
                <label htmlFor="register-gender" className={`mb-2 block ${FOCUS_FIELD_LABEL}`}>
                  {profile.genderLabel}
                  <OptionalMark label={t.common.optional} />
                </label>
                <GenderSelect
                  id="register-gender"
                  value={gender}
                  options={profile.genderOptions}
                  disabled={pending}
                  onChange={setGender}
                />
              </div>
            </div>
            <p className="mt-2 text-body-sm text-pretty text-text-muted">
              {t.register.agreement1}
              <button type="button" onClick={() => setLegalShown("terms")} className={INLINE_LINK}>
                {t.register.termsLink}
              </button>
              {t.register.agreement2}
              <button type="button" onClick={() => setLegalShown("privacy")} className={INLINE_LINK}>
                {t.register.privacyLink}
              </button>
              {t.register.agreement3}
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep("account")} disabled={pending} className={GHOST_BUTTON}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                {t.register.back}
              </button>
              <SubmitButton pending={pending} className="flex-1">
                {t.register.submit}
              </SubmitButton>
            </div>
          </div>
        )}
      </form>

      {step === "account" && (
        <div className="mt-4 flex flex-col gap-4">
          <OrDivider label={t.common.or} />
          <GoogleButton label={t.register.google} disabled={pending} onClick={handleGoogle} />
        </div>
      )}

      <p className="mt-8 text-center text-body-sm text-text-muted">
        {t.register.hasAccount}{" "}
        <Link href="/login" className={TEXT_LINK}>
          {t.register.loginLink}
        </Link>
      </p>

      <LegalSheet kind={legalShown} legal={legal} onClose={() => setLegalShown(null)} />
    </div>
  );
}
