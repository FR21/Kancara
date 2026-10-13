"use client";

import { BellRing, Check, ChevronDown, Circle, Plus, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { INPUT, OUTLINE_BUTTON } from "@/components/plan/styles";
import CountryPicker from "@/components/profile/CountryPicker";
import { type PushState, enablePush, syncPush } from "@/lib/api/push";
import { fillTemplate } from "@/lib/plan-draft";
import { MAX_LABEL_CHARS } from "@/lib/safety/action";
import { formatPhone, MAX_PHONE_CHARS } from "@/lib/safety/contact";
import { type ContactLabel, CONTACT_LABELS } from "@/lib/safety/pack";
import { countryNames } from "@/lib/travel/countries";
import { useLocale } from "@/lib/use-locale";
import ContactList from "./ContactList";
import { type HelpContext, nameIn } from "./help";

export const BLOCK = "px-4 py-4 sm:px-5";
const BLOCK_TITLE = "text-label text-text";
export const FIELD_LABEL = "block text-caption font-bold text-text-muted";
export const TEXT_ACTION =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-label text-primary transition-[background-color,scale] duration-150 ease-out hover:bg-primary-subtle active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40";
export const SMALL_BUTTON = `${OUTLINE_BUTTON} h-11 px-4 text-label`;

function Block({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={BLOCK}>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 className={BLOCK_TITLE}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A select drawn like the other fields. Its own arrow sits against the edge, so one is drawn at the field's inset. */
function Select({ className = "", children, ...props }: ComponentProps<"select">) {
  return (
    <div className={`relative ${className}`}>
      <select {...props} className={`${INPUT} cursor-pointer appearance-none pr-12`}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-text-muted" />
    </div>
  );
}

export function Problem({ context, show }: { context: HelpContext; show: boolean }) {
  if (!show) return null;
  return (
    <p role="alert" className="mt-2 text-caption text-pretty text-error">
      {context.online ? context.text.failed : context.text.offlineOnly}
    </p>
  );
}

function ContactsBlock({ context }: { context: HelpContext }) {
  const { pack, text } = context;
  const copy = text.contacts;
  const [adding, setAdding] = useState(false);
  const [placeName, setPlaceName] = useState("");
  const [labelKey, setLabelKey] = useState<ContactLabel>("INFO_DESK");
  const [phone, setPhone] = useState("");
  const [problem, setProblem] = useState<"none" | "invalid" | "failed">("none");

  const add = async () => {
    const outcome = await context.act({ type: "addContact", placeName, labelKey, phone });
    setProblem(outcome === "done" ? "none" : outcome === "invalid" ? "invalid" : "failed");
    if (outcome !== "done") return;
    setPlaceName("");
    setPhone("");
    setAdding(false);
  };

  return (
    <Block
      title={copy.title}
      action={
        !adding &&
        pack.canManage && (
          <button type="button" aria-label={copy.add} title={copy.add} onClick={() => setAdding(true)} className={TEXT_ACTION}>
            <Plus className="size-4" aria-hidden="true" />
            {copy.addShort}
          </button>
        )
      }
    >
      {pack.contacts.length === 0 && !adding && pack.canManage && <p className="mb-3 text-body-sm text-pretty text-text-muted">{copy.empty}</p>}
      <div className="-mx-3">
        <ContactList
          pack={pack}
          text={text}
          onRemove={pack.canManage ? (contactId) => context.act({ type: "removeContact", contactId }) : undefined}
        />
      </div>
      {adding && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div>
            <label htmlFor="contact-place" className={FIELD_LABEL}>
              {copy.place}
            </label>
            <input
              id="contact-place"
              type="text"
              autoComplete="off"
              maxLength={MAX_LABEL_CHARS}
              value={placeName}
              placeholder={copy.placePlaceholder}
              onChange={(event) => setPlaceName(event.target.value)}
              className={`${INPUT} mt-2`}
            />
          </div>
          <div>
            <label htmlFor="contact-kind" className={FIELD_LABEL}>
              {copy.kind}
            </label>
            <Select
              id="contact-kind"
              value={labelKey}
              onChange={(event) => setLabelKey(CONTACT_LABELS.find((label) => label === event.target.value) ?? "OTHER")}
              className="mt-2"
            >
              {CONTACT_LABELS.map((label) => (
                <option key={label} value={label}>
                  {copy.labels[label]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="contact-phone" className={FIELD_LABEL}>
              {copy.phone}
            </label>
            <input
              id="contact-phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              maxLength={MAX_PHONE_CHARS}
              value={phone}
              aria-invalid={problem === "invalid"}
              onChange={(event) => {
                setPhone(event.target.value);
                setProblem("none");
              }}
              className={`${INPUT} mt-2 tabular-nums`}
            />
            {problem === "invalid" && (
              <p role="alert" className="mt-2 text-caption text-error">
                {copy.phoneInvalid}
              </p>
            )}
          </div>
          <Problem context={context} show={problem === "failed"} />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={placeName.trim() === "" || phone.trim() === ""} onClick={add} className={SMALL_BUTTON}>
              {text.save}
            </button>
            <button type="button" onClick={() => setAdding(false)} className={TEXT_ACTION}>
              {text.cancel}
            </button>
          </div>
        </div>
      )}
    </Block>
  );
}

function SecondNumberBlock({ context }: { context: HelpContext }) {
  const { pack, text } = context;
  const copy = text.second;
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [problem, setProblem] = useState<"none" | "invalid" | "failed">("none");

  const save = async () => {
    const outcome = await context.act({ type: "secondaryPhone", phone: phone.trim() === "" ? null : phone });
    setProblem(outcome === "done" ? "none" : outcome === "invalid" ? "invalid" : "failed");
    if (outcome === "done") setEditing(false);
  };

  return (
    <Block
      title={copy.title}
      action={
        !editing && (
          <button
            type="button"
            onClick={() => {
              setPhone(pack.secondaryPhone ?? "");
              setProblem("none");
              setEditing(true);
            }}
            className={TEXT_ACTION}
          >
            {text.meeting.change}
          </button>
        )
      }
    >
      {!editing && (
        <p className={`text-label-lg tabular-nums ${pack.secondaryPhone ? "text-text" : "text-text-muted"}`}>
          {pack.secondaryPhone ? formatPhone(pack.secondaryPhone) : copy.none}
        </p>
      )}
      <p className="mt-1 text-caption text-pretty text-text-muted">{copy.hint}</p>
      {editing && (
        <div className="mt-3">
          <label htmlFor="second-phone" className="sr-only">
            {copy.title}
          </label>
          <input
            id="second-phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            maxLength={MAX_PHONE_CHARS}
            value={phone}
            placeholder="+62 812 3456 7890"
            aria-invalid={problem === "invalid"}
            onChange={(event) => {
              setPhone(event.target.value);
              setProblem("none");
            }}
            className={`${INPUT} tabular-nums`}
          />
          {problem === "invalid" && (
            <p role="alert" className="mt-2 text-caption text-pretty text-error">
              {text.member.phoneInvalid}
            </p>
          )}
          <Problem context={context} show={problem === "failed"} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={save} className={SMALL_BUTTON}>
              {text.save}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={TEXT_ACTION}>
              {text.cancel}
            </button>
          </div>
        </div>
      )}
    </Block>
  );
}

function CountriesBlock({ context }: { context: HelpContext }) {
  const locale = useLocale();
  const { pack, text } = context;
  const copy = text.countries;
  const names = countryNames(locale);
  const change = (codes: string[]) => context.act({ type: "countries", codes });

  return (
    <Block title={copy.title}>
      <p className="text-caption text-pretty text-text-muted">{copy.hint}</p>
      <ul className="mt-3 flex flex-wrap gap-2 empty:hidden">
        {pack.countryCodes.map((code) => {
          const name = names.get(code) ?? code;
          return (
            <li key={code} className="inline-flex items-center rounded-full bg-primary-subtle pl-4 text-label text-on-primary-subtle">
              {name}
              <button
                type="button"
                aria-label={fillTemplate(copy.remove, { name })}
                title={fillTemplate(copy.remove, { name })}
                onClick={() => change(pack.countryCodes.filter((entry) => entry !== code))}
                className="ml-1 inline-flex size-11 cursor-pointer items-center justify-center rounded-full transition-[background-color,scale] duration-150 ease-out hover:bg-background active:scale-[0.97]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {pack.countryCodes.length === 0 && <p className="mt-3 text-body-sm text-text-muted">{copy.none}</p>}
      <label htmlFor="country-add" className="sr-only">
        {copy.add}
      </label>
      <CountryPicker
        id="country-add"
        value=""
        placeholder={copy.add}
        emptyLabel={copy.noMatch}
        exclude={pack.countryCodes}
        className="mt-3"
        onChange={(code) => code && change([...pack.countryCodes, code])}
      />
    </Block>
  );
}

const subscribeToWorker = (notify: () => void) => {
  navigator.serviceWorker?.addEventListener("controllerchange", notify);
  return () => navigator.serviceWorker?.removeEventListener("controllerchange", notify);
};

function ReadyBlock({ context }: { context: HelpContext }) {
  const locale = useLocale();
  const { pack, text } = context;
  const copy = text.ready;
  // Where this device stands with push notifications; null until that is known.
  const [push, setPush] = useState<PushState | "failed" | null>(null);
  useEffect(() => {
    let current = true;
    syncPush(locale).then((state) => {
      if (current) setPush(state);
    });
    return () => {
      current = false;
    };
  }, [locale]);
  // The page is kept for offline use once the service worker that keeps pages has taken it over.
  const kept = useSyncExternalStore(
    subscribeToWorker,
    () => Boolean(navigator.serviceWorker?.controller),
    () => false,
  );
  const unreachable = pack.members.filter((member) => member.hasPhone && !member.joined && member.phone === null);
  const cardless = pack.members.filter((member) => !member.hasPhone && member.cardSavedAt === null);
  const names = (members: typeof pack.members) => members.map((member) => nameIn(context, member)).join(", ");
  const items = [
    { key: "reach", done: unreachable.length === 0, label: copy.items.reach, still: names(unreachable) },
    { key: "cards", done: cardless.length === 0, label: copy.items.cards, still: names(cardless) },
    { key: "second", done: pack.secondaryPhone !== null, label: copy.items.second, still: "", optional: true },
    { key: "offline", done: kept, label: copy.items.offline, still: "" },
    { key: "push", done: push === "on", label: copy.items.push, still: "" },
  ];
  const done = items.filter((item) => item.done).length;

  return (
    <Block
      title={copy.title}
      action={<p className="text-caption font-bold text-text-muted tabular-nums">{fillTemplate(copy.count, { done, total: items.length })}</p>}
    >
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.key} className="flex gap-3">
            {item.done ? (
              <Check className="mt-1 size-4 shrink-0 text-success" strokeWidth={3} aria-hidden="true" />
            ) : (
              <Circle className="mt-1 size-4 shrink-0 text-border-strong" aria-hidden="true" />
            )}
            <span className="min-w-0">
              <span className={`block text-body-sm text-pretty ${item.done ? "text-text-muted" : "text-text"}`}>
                {item.label}
                {item.optional && !item.done && <span className="text-text-muted"> ({copy.optional})</span>}
              </span>
              {!item.done && item.still && (
                <span className="mt-1 block text-caption text-pretty text-text-muted">{fillTemplate(copy.still, { names: item.still })}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {/* Asking for permission has to come from a press, so it is a button here and never a prompt on arrival. */}
      {(push === "off" || push === "failed") && (
        <button type="button" onClick={async () => setPush(await enablePush(locale))} className={`${SMALL_BUTTON} mt-4 w-full`}>
          <BellRing className="size-4 text-primary" aria-hidden="true" />
          {copy.pushEnable}
        </button>
      )}
      <p role="status" className="mt-2 text-caption text-pretty text-text-muted empty:hidden">
        {push === "failed" && copy.pushFailed}
        {push === "blocked" && copy.pushBlocked}
        {push === "unsupported" && copy.pushUnsupported}
        {push === "off" && copy.pushHint}
      </p>
    </Block>
  );
}

const CARD = "divide-y divide-border overflow-clip rounded-2xl border border-border bg-surface";

/** The numbers that matter while someone is separated: the desks and guards at the places visited, and the national emergency numbers. */
export function ImportantNumbers({ context }: { context: HelpContext }) {
  return (
    <div className={CARD}>
      <ContactsBlock context={context} />
    </div>
  );
}

/** What the group settles before leaving: what is still missing, the second number, the countries. */
export function PrepareBlocks({ context }: { context: HelpContext }) {
  // This card does not clip what it holds: the list of countries opens over its lower edge.
  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
      <ReadyBlock context={context} />
      <SecondNumberBlock context={context} />
      <CountriesBlock context={context} />
    </div>
  );
}
