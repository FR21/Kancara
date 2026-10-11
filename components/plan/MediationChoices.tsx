import { Check, Scale, Split, Users } from "lucide-react";
import Image from "next/image";
import type { Conflict, MediationOption, Share } from "@/lib/mediation";
import type { Messages } from "@/lib/messages";
import { type OptionKey, type PlanDraft, fillTemplate } from "@/lib/plan-draft";
import { useLocale } from "@/lib/use-locale";
import { listNames, optionCopy } from "./mediation-text";
import { FIELD_LABEL } from "./styles";

type MediationChoicesProps = {
  conflict: Conflict;
  draft: PlanDraft;
  text: Messages["plan"];
  picked: OptionKey | null;
  suggested: OptionKey | null;
  onPick: (option: OptionKey) => void;
};

const CHOICE =
  "flex w-full cursor-pointer items-start gap-3 rounded-2xl border px-5 py-4 text-left transition-[background-color,border-color,color,scale] duration-150 ease-out has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary active:scale-[0.98]";
const FACT = "inline-flex max-w-full items-center gap-2 rounded-2xl px-2 py-1 text-caption font-bold";

function givers(option: MediationOption, share: Share): string[] {
  return Object.keys(option.gives).filter((memberId) => option.gives[memberId] === share);
}

// The ways to settle one clash. Each says what happens, what it costs, who gives something up, and whether the
// group stays together, so the pick is made knowing the trade.
export default function MediationChoices({ conflict, draft, text, picked, suggested, onPick }: MediationChoicesProps) {
  const locale = useLocale();
  const copy = text.mediation;

  return (
    <fieldset className="min-w-0">
      <legend className={FIELD_LABEL}>{copy.optionsLegend}</legend>
      <div className="mt-2 grid gap-2">
        {conflict.options.map((option) => {
          const selected = option.key === picked;
          const words = optionCopy(conflict, option.key, text);
          const part = givers(option, "part");
          const all = givers(option, "all");
          const fact = `${FACT} ${selected ? "bg-on-primary/15 text-on-primary" : "bg-surface-muted text-text"}`;
          return (
            <label
              key={option.key}
              className={`${CHOICE} ${
                selected
                  ? "border-primary bg-primary text-on-primary"
                  : "border-border-strong bg-surface text-text hover:border-primary hover:bg-primary-subtle"
              }`}
            >
              <input
                type="radio"
                name={`clash-${conflict.id}`}
                value={option.key}
                checked={selected}
                onChange={() => onPick(option.key)}
                className="sr-only"
              />
              <span className="min-w-0 flex-1">
                {option.key === suggested && (
                  <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-accent py-1 pr-2 pl-1 text-caption font-bold text-on-accent">
                    <Image
                      src="/images/logo/kancara_mascot_captain_logo.webp"
                      alt=""
                      width={20}
                      height={20}
                      className="size-5 rounded-full bg-surface object-cover"
                    />
                    {copy.suggested}
                  </span>
                )}
                <span className="block font-heading text-h3 font-extrabold text-balance">{words.title}</span>
                <span className={`mt-1 block text-body-sm ${selected ? "text-on-primary" : "text-text-muted"}`}>
                  {words.body}
                </span>
                <span
                  className={`mt-3 block border-t pt-3 text-body-sm ${
                    selected ? "border-on-primary/25 text-on-primary" : "border-border text-text"
                  }`}
                >
                  {words.cost}
                </span>
                <span className="mt-3 flex flex-wrap gap-1">
                  {part.length === 0 && all.length === 0 && (
                    <span className={fact}>
                      <Scale className="size-4 shrink-0" aria-hidden="true" />
                      {copy.gives.none}
                    </span>
                  )}
                  {all.length > 0 && (
                    <span className={fact}>
                      <Scale className="size-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 wrap-anywhere">
                        {fillTemplate(copy.gives.all, { names: listNames(all, draft, text, locale) })}
                      </span>
                    </span>
                  )}
                  {part.length > 0 && (
                    <span className={fact}>
                      <Scale className="size-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 wrap-anywhere">
                        {fillTemplate(copy.gives.part, { names: listNames(part, draft, text, locale) })}
                      </span>
                    </span>
                  )}
                  <span className={fact}>
                    {option.apart ? (
                      <Split className="size-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <Users className="size-4 shrink-0" aria-hidden="true" />
                    )}
                    {option.apart ? copy.apart : copy.together}
                  </span>
                </span>
              </span>
              {selected && <Check className="mt-1 size-5 shrink-0" strokeWidth={3} aria-hidden="true" />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
