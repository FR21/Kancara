import { BedDouble, Languages, Phone, Utensils } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { CALL_ROW } from "@/components/safety/ContactList";
import CopyButton from "@/components/ui/CopyButton";
import SpeakButton from "@/components/ui/SpeakButton";
import { BADGE } from "@/components/ui/styles";
import type { FieldPass } from "@/lib/field-pass/pass";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";

type FieldPassDetailsProps = {
  pass: FieldPass;
  text: Messages["fieldPass"];
  speakingId: string | null;
  onSpeak: (text: string, id: string) => void;
};

/**
 * One part of the pass. The sheet is the surface, so the parts stand straight in it, split by hairlines with the
 * same room on either side (the list holding them draws the lines): grouped by space, never a box per part.
 */
export const PASS_PART = "py-6 first:pt-0 last:pb-0";

function SectionHead({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <h3 className="flex items-center gap-2 text-label text-text">
        {icon}
        {title}
      </h3>
      <p className="text-caption text-text-muted">{hint}</p>
    </div>
  );
}

/** Dialling needs only the digits and a leading plus; the model writes numbers with dashes and spaces. */
const dialable = (number: string) => number.replace(/[^\d+]/g, "");

// What the pass says, in the order it is reached for on the road: where we sleep, what we cannot eat, the four
// sentences, and who to call. Text in the destination's language carries its language tag, so the phone picks a
// font that has the script.
export default function FieldPassDetails({ pass, text, speakingId, onSpeak }: FieldPassDetailsProps) {
  const speakButton = (id: string, words: string, label = text.speak) => (
    <SpeakButton label={label} speakingLabel={text.speaking} speaking={speakingId === id} onSpeak={() => onSpeak(words, id)} />
  );

  return (
    <>
      {pass.lodging && (
        <section className={PASS_PART}>
          <SectionHead icon={<BedDouble className="size-4 text-primary" aria-hidden="true" />} title={text.lodging.title} hint={text.lodging.hint} />
          {pass.lodging.localName && (
            <p lang={pass.languageTag} className="mt-3 text-h3 text-pretty text-text">
              {pass.lodging.localName}
              {pass.lodging.localAddress && <span className="mt-1 block text-body">{pass.lodging.localAddress}</span>}
            </p>
          )}
          <p className="mt-2 text-body-sm text-pretty text-text-muted">
            {pass.lodging.name}
            {pass.lodging.address && `, ${pass.lodging.address}`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {pass.lodging.localName &&
              speakButton("lodging", [pass.lodging.localName, pass.lodging.localAddress].filter(Boolean).join(", "))}
            <CopyButton
              text={[pass.lodging.localName || pass.lodging.name, pass.lodging.localAddress || pass.lodging.address].filter(Boolean).join("\n")}
              label={text.copy}
              copiedLabel={text.copied}
            />
          </div>
        </section>
      )}

      {pass.dietary && (
        <section className={PASS_PART}>
          <SectionHead icon={<Utensils className="size-4 text-primary" aria-hidden="true" />} title={text.dietary.title} hint={text.dietary.hint} />
          <ul className="mt-3 flex flex-wrap gap-2">
            {pass.dietary.badges.map((badge) => (
              <li key={badge} className={`${BADGE} bg-primary-subtle text-on-primary-subtle`}>
                {badge}
              </li>
            ))}
            <li className={`${BADGE} bg-surface-muted text-text tabular-nums`}>
              {fillTemplate(text.dietary.people, { count: pass.memberCount })}
            </li>
          </ul>
          <p lang={pass.languageTag} className="mt-4 rounded-lg bg-primary-subtle px-4 py-3 text-h3 text-pretty text-on-primary-subtle">
            {pass.dietary.localText}
          </p>
          {pass.dietary.romanized && pass.dietary.romanized !== pass.dietary.localText && (
            <p className="mt-2 text-body-sm text-pretty text-primary">{pass.dietary.romanized}</p>
          )}
          {pass.dietary.explanation && <p className="mt-2 text-body-sm text-pretty text-text-muted">{pass.dietary.explanation}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {speakButton("dietary", pass.dietary.localText, text.dietary.speak)}
            <CopyButton text={pass.dietary.localText} label={text.copy} copiedLabel={text.copied} />
          </div>
        </section>
      )}

      <section className={PASS_PART}>
        <SectionHead icon={<Languages className="size-4 text-primary" aria-hidden="true" />} title={text.phrases.title} hint={text.phrases.hint} />
        {/* No box per sentence: each is its label, its words, and its two buttons, held together by being close. */}
        <ul className="mt-3 grid gap-6 sm:grid-cols-2">
          {pass.phrases.map((phrase, index) => (
            <li key={phrase.id} style={{ "--item-index": index } as CSSProperties} className="flex flex-col motion-safe:animate-list-in">
              <p className="text-caption text-text-muted">{phrase.label}</p>
              <p lang={pass.languageTag} className="mt-1 text-label-lg text-pretty text-text">
                {phrase.localText}
              </p>
              {phrase.romanized && phrase.romanized !== phrase.localText && (
                <p className="mt-1 text-body-sm text-pretty text-primary">{phrase.romanized}</p>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                {speakButton(phrase.id, phrase.localText)}
                <CopyButton text={phrase.localText} label={text.copy} copiedLabel={text.copied} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={PASS_PART}>
        <SectionHead icon={<Phone className="size-4 text-error" aria-hidden="true" />} title={text.emergency.title} hint={pass.countryName} />
        {/* The rows reach the sheet's edges, as the help page's numbers do, so the whole width is the target. */}
        <ul className="-mx-surface mt-2">
          {[
            { id: "police", name: text.emergency.police, number: pass.emergency.police, detail: "" },
            { id: "ambulance", name: text.emergency.ambulance, number: pass.emergency.ambulance, detail: "" },
            { id: "mission", name: pass.emergency.missionName || text.emergency.mission, number: pass.emergency.missionPhone, detail: pass.emergency.missionAddress },
          ]
            .filter((row) => dialable(row.number))
            .map((row) => (
              <li key={row.id}>
                <a href={`tel:${dialable(row.number)}`} className={`${CALL_ROW} -outline-offset-2`}>
                  <Phone className={`size-5 shrink-0 ${row.id === "mission" ? "text-primary" : "text-error"}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-label text-text">{row.name}</span>
                    {row.detail && <span className="block text-caption text-pretty text-text-muted">{row.detail}</span>}
                  </span>
                  <span className="shrink-0 text-label text-text tabular-nums">{row.number}</span>
                </a>
              </li>
            ))}
        </ul>
        <p className="mt-2 text-body-sm text-pretty text-text-muted">{text.emergency.checkNote}</p>
      </section>
    </>
  );
}
