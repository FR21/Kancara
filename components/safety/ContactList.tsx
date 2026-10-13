"use client";

import { Phone, Trash2 } from "lucide-react";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { formatPhone } from "@/lib/safety/contact";
import { emergencyNumbers } from "@/lib/safety/emergency-numbers";
import type { SafetyPack } from "@/lib/safety/pack";
import { countryNames } from "@/lib/travel/countries";
import { useLocale } from "@/lib/use-locale";
import { CallLink } from "./CallLink";

type ContactListProps = {
  pack: SafetyPack;
  text: Messages["safety"];
  /** Removes a local contact. Absent where the list is only read. */
  onRemove?: (contactId: string) => void;
};

export const CALL_ROW =
  "group/call flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.99]";
const GROUP_TITLE = "px-3 text-caption font-bold text-text-muted";

// Everyone the group can call for help: the desks and guards at the places it visits, then the national
// emergency numbers of each country on the trip. Each line is one tap to a call, and all of it is on the phone
// before the trip starts.
export default function ContactList({ pack, text, onRemove }: ContactListProps) {
  const locale = useLocale();
  const copy = text.contacts;
  const names = countryNames(locale);

  return (
    <div className="space-y-4">
      {pack.contacts.length > 0 && (
        <div>
          <p className={GROUP_TITLE}>{copy.local}</p>
          <ul className="mt-1">
            {pack.contacts.map((contact) => (
              <li key={contact.id} className="flex items-center gap-1">
                <CallLink
                  phone={contact.phone}
                  name={contact.placeName}
                  aria-label={fillTemplate(copy.callNumber, { name: contact.placeName, number: contact.phone })}
                  className={`${CALL_ROW} min-w-0 flex-1`}
                >
                  <Phone className="size-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-label text-pretty text-text">{contact.placeName}</span>
                    <span className="block text-caption text-text-muted tabular-nums">
                      {copy.labels[contact.labelKey]} · {formatPhone(contact.phone)}
                    </span>
                  </span>
                </CallLink>
                {onRemove && (
                  <button
                    type="button"
                    aria-label={fillTemplate(copy.remove, { name: contact.placeName })}
                    title={fillTemplate(copy.remove, { name: contact.placeName })}
                    onClick={() => onRemove(contact.id)}
                    className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-muted transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-muted hover:text-text active:scale-[0.97]"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {emergencyNumbers(pack.countryCodes).map(({ countryCode, numbers }) => (
        <div key={countryCode ?? "worldwide"}>
          <p className={GROUP_TITLE}>
            {countryCode ? fillTemplate(copy.national, { country: names.get(countryCode) ?? countryCode }) : copy.worldwide}
          </p>
          <ul className="mt-1">
            {numbers.map((number) => (
              <li key={`${number.service}-${number.phone}`}>
                <CallLink
                  phone={number.phone}
                  name={copy.services[number.service]}
                  aria-label={fillTemplate(copy.callNumber, { name: copy.services[number.service], number: number.phone })}
                  className={CALL_ROW}
                >
                  <Phone className="size-5 shrink-0 text-error" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-label text-text">{copy.services[number.service]}</span>
                  <span className="shrink-0 text-label-lg text-text tabular-nums">{number.phone}</span>
                </CallLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
