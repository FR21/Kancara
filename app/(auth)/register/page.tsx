"use client";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import AuthHeading from "@/components/auth/AuthHeading";
import { FormAlert, GoogleButton, OrDivider, PasswordRules, SubmitButton } from "@/components/auth/AuthParts";
import TextField, { FIELD_LABEL, OptionalMark } from "@/components/auth/TextField";
import { GHOST_BUTTON } from "@/components/plan/styles";
import GenderSelect from "@/components/profile/GenderSelect";
import { saveProfileDetails, signInWithGoogle, startSession } from "@/lib/auth/client";
import { useAuthFlow } from "@/lib/auth/use-auth-flow";
import { emailIssue, isPasswordStrong } from "@/lib/auth/validation";
import { auth } from "@/lib/firebase/client";
import { fillTemplate } from "@/lib/plan-draft";
import { isAgeValid, isNameValid, isUsernameValid, MAX_AGE } from "@/lib/profile-fields";
import { useMessages } from "@/lib/use-messages";

const HOME = "/trips";
const PROFILE = "/profile";
const TEXT_LINK =
  "inline-flex min-h-11 items-center rounded-sm text-label text-primary underline-offset-4 hover:underline";

const STEPS = ["account", "about"] as const;
type Step = (typeof STEPS)[number];

const STEP_FIELDS = {
  account: ["email", "password", "confirm"],
  about: ["name", "username", "age"],
} as const;
type CheckedField = (typeof STEP_FIELDS)[Step][number];

const FIRST_FIELD: Record<Step, string> = { account: "register-email", about: "register-name" };

export default function RegisterPage() {
  const t = useMessages("auth");
  const profile = useMessages("profile");
  const { pending, error, run } = useAuthFlow();

  const [step, setStep] = useState<Step>("account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [nationality, setNationality] = useState("");
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
    age: isAgeValid(age) ? "" : profile.ageError,
  };

  const stepOf = (field: CheckedField): Step =>
    STEP_FIELDS.account.some((accountField) => accountField === field) ? "account" : "about";
  const shown = (field: CheckedField) => (touched.has(field) || attempted.has(stepOf(field)) ? errors[field] : "");
  const touch = (field: CheckedField) => setTouched((current) => new Set(current).add(field));

  const firstInvalid = (target: Step) => STEP_FIELDS[target].find((field) => errors[field] !== "");

  const createAccount = () =>
    run(async () => {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      let destination = HOME;
      try {
        await saveProfileDetails(credential.user, {
          name: name.trim(),
          username: username.trim(),
          nationality: nationality.trim(),
          age,
          gender,
        });
      } catch {
        console.error("Profile details were not saved at sign-up");
        destination = PROFILE;
      }
      return (await startSession(credential.user)) ? destination : null;
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
  const stepNumber = STEPS.indexOf(step) + 1;

  return (
    <div className="motion-safe:animate-message-in">
      <AuthHeading
        title={t.register.title}
        subtitle={step === "account" ? t.register.subtitle : t.register.aboutSubtitle}
      />

      <div className="mt-6">
        <p className="text-label text-text-muted">
          {fillTemplate(t.register.stepLabel, { step: stepNumber, total: STEPS.length })}
          <span className="text-text"> · {t.register.steps[step]}</span>
        </p>
        <div aria-hidden="true" className="mt-2 flex gap-2">
          {STEPS.map((item, index) => (
            <span
              key={item}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ease-out ${
                index < stepNumber ? "bg-primary" : "bg-surface-muted"
              }`}
            />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-6">
        <FormAlert message={error} />

        {step === "account" ? (
          <div key="account" className="flex flex-col gap-6 motion-safe:animate-message-in">
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
            <SubmitButton pending={pending}>
              {t.register.next}
              <ArrowRight className="size-4" aria-hidden="true" />
            </SubmitButton>
          </div>
        ) : (
          <div key="about" className="flex flex-col gap-6 motion-safe:animate-message-in">
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
            <TextField
              id="register-nationality"
              label={profile.nationalityLabel}
              optionalLabel={t.common.optional}
              placeholder={profile.nationalityPlaceholder}
              autoComplete="off"
              value={nationality}
              disabled={pending}
              onChange={setNationality}
            />
            <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
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
                <label htmlFor="register-gender" className={`mb-2 block ${FIELD_LABEL}`}>
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
        <div className="mt-6 flex flex-col gap-6">
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
    </div>
  );
}
