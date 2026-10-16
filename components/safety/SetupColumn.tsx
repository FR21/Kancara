"use client";

import { BellRing, Check, Circle, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import IconButton from "@/components/ui/IconButton";
import SelectField from "@/components/ui/SelectField";
import Sheet from "@/components/ui/Sheet";
import { BADGE, FIELD_LABEL, INPUT, TEXT_LINK, buttonClass } from "@/components/ui/styles";
import CountryPicker from "@/components/profile/CountryPicker";
import { type PushState, enablePush, syncPush } from "@/lib/client/push";
import { fillTemplate } from "@/lib/plan-draft";
import { MAX_LABEL_CHARS } from "@/lib/safety/action";
import { formatPhone, MAX_PHONE_CHARS } from "@/lib/safety/contact";
import { type ContactLabel, CONTACT_LABELS } from "@/lib/safety/safety-pack";
import { countryNames } from "@/lib/travel/countries";
import { useLocale } from "@/lib/use-locale";
import ContactList from "./ContactList";
import { CANCEL_BUTTON, HELP_FRAME, HelpBlock, Problem, SAVE_BUTTON } from "./HelpBlock";
import { type HelpContext, nameIn } from "@/components/safety/help-context";

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

  const handleClose = () => {
    setAdding(false);
    setProblem("none");
  };

  return (
    <>
      <HelpBlock
        id="contacts-title"
        title={copy.title}
        action={
          pack.canManage && (
            <button type="button" aria-label={copy.add} title={copy.add} onClick={() => setAdding(true)} className={TEXT_LINK}>
              <Plus className="size-4" aria-hidden="true" />
              {copy.addShort}
            </button>
          )
        }
      >
        {pack.contacts.length === 0 && pack.canManage && <p className="text-body-sm text-pretty text-text-muted">{copy.empty}</p>}
        <div className="mt-4">
          <ContactList
            pack={pack}
            text={text}
            onRemove={pack.canManage ? (contactId) => context.act({ type: "removeContact", contactId }) : undefined}
          />
        </div>
      </HelpBlock>

      <Sheet
        open={adding}
        title={copy.add}
        closeLabel={text.close}
        onClose={handleClose}
        footer={
          <div className="flex w-full flex-wrap gap-2">
            <button
              type="button"
              disabled={placeName.trim() === "" || phone.trim() === ""}
              onClick={add}
              className={SAVE_BUTTON}
            >
              {text.save}
            </button>
            <button type="button" onClick={handleClose} className={CANCEL_BUTTON}>
              {text.cancel}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="contact-place" className={`${FIELD_LABEL} block`}>
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
            <label htmlFor="contact-kind" className={`${FIELD_LABEL} block`}>
              {copy.kind}
            </label>
            <SelectField
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
            </SelectField>
          </div>
          <div>
            <label htmlFor="contact-phone" className={`${FIELD_LABEL} block`}>
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
        </div>
      </Sheet>
    </>
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
    <HelpBlock
      id="second-title"
      title={copy.title}
      hint={copy.hint}
      action={
        !editing && (
          <button
            type="button"
            onClick={() => {
              setPhone(pack.secondaryPhone ?? "");
              setProblem("none");
              setEditing(true);
            }}
            className={TEXT_LINK}
          >
            {text.meeting.change}
          </button>
        )
      }
    >
      {!editing && (
        <p className={`mt-4 text-label-lg tabular-nums ${pack.secondaryPhone ? "text-text" : "text-text-muted"}`}>
          {pack.secondaryPhone ? formatPhone(pack.secondaryPhone) : copy.none}
        </p>
      )}
      {editing && (
        <div className="mt-4 motion-safe:animate-message-in">
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
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={save} className={SAVE_BUTTON}>
              {text.save}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={CANCEL_BUTTON}>
              {text.cancel}
            </button>
          </div>
        </div>
      )}
    </HelpBlock>
  );
}

function CountriesBlock({ context }: { context: HelpContext }) {
  const locale = useLocale();
  const { pack, text } = context;
  const copy = text.countries;
  const names = countryNames(locale);
  const change = (codes: string[]) => context.act({ type: "countries", codes });

  return (
    <HelpBlock id="countries-title" title={copy.title} hint={copy.hint}>
      <label htmlFor="country-add" className="sr-only">
        {copy.add}
      </label>
      <CountryPicker
        id="country-add"
        value=""
        placeholder={copy.add}
        emptyLabel={copy.noMatch}
        exclude={pack.countryCodes}
        className="mt-4"
        onChange={(code) => code && change([...pack.countryCodes, code])}
      />
      <ul className="mt-4 flex flex-wrap gap-2 empty:hidden">
        {pack.countryCodes.map((code) => {
          const name = names.get(code) ?? code;
          return (
            <li
              key={code}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary-subtle pl-4 text-label text-on-primary-subtle motion-safe:animate-pop-in"
            >
              <span className="min-w-0 truncate">{name}</span>
              <IconButton label={fillTemplate(copy.remove, { name })} onClick={() => change(pack.countryCodes.filter((entry) => entry !== code))}>
                <X className="size-4" aria-hidden="true" />
              </IconButton>
            </li>
          );
        })}
      </ul>
      {pack.countryCodes.length === 0 && <p className="mt-4 text-body-sm text-text-muted">{copy.none}</p>}
    </HelpBlock>
  );
}

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
  const unreachable = pack.members.filter((member) => member.hasPhone && !member.joined && member.phone === null);
  const cardless = pack.members.filter((member) => !member.hasPhone && member.cardSavedAt === null);
  const names = (members: typeof pack.members) => members.map((member) => nameIn(context, member)).join(", ");
  const items = [
    { key: "reach", done: unreachable.length === 0, label: copy.items.reach, still: names(unreachable) },
    { key: "cards", done: cardless.length === 0, label: copy.items.cards, still: names(cardless) },
    { key: "second", done: pack.secondaryPhone !== null, label: copy.items.second, still: "", optional: true },
    { key: "push", done: push === "on", label: copy.items.push, still: "" },
  ];
  const done = items.filter((item) => item.done).length;

  return (
    <HelpBlock
      id="ready-title"
      title={copy.title}
      action={
        <p className={`${BADGE} shrink-0 tabular-nums ${done === items.length ? "bg-success-subtle text-on-success-subtle" : "bg-surface-muted text-text"}`}>
          {fillTemplate(copy.count, { done, total: items.length })}
        </p>
      }
    >
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.key} className="flex gap-3">
            {item.done ? (
              <Check className="mt-1 size-4 shrink-0 text-success motion-safe:animate-pop-in" strokeWidth={3} aria-hidden="true" />
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
        <button type="button" onClick={async () => setPush(await enablePush(locale))} className={`${buttonClass("outline", "small")} mt-6 w-full`}>
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
    </HelpBlock>
  );
}

/** The numbers that matter while someone is separated: the desks and guards at the places visited, and the national emergency numbers. */
export function ImportantNumbers({ context }: { context: HelpContext }) {
  // Clipped, since its rows reach its edges and its corners round them off.
  return (
    <div className={`${HELP_FRAME} overflow-clip`}>
      <ContactsBlock context={context} />
    </div>
  );
}

/** What the group settles before leaving: the countries, the second number, what is still missing. */
export function PrepareBlocks({ context }: { context: HelpContext }) {
  // This frame does not clip what it holds: the list of countries opens over its lower edge.
  return (
    <div className={HELP_FRAME}>
      <CountriesBlock context={context} />
      <SecondNumberBlock context={context} />
      <ReadyBlock context={context} />
    </div>
  );
}
