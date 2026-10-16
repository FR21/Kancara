"use client";

import { Phone, Trash2 } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { formatPhone } from "@/lib/safety/contact";
import { emergencyNumbers } from "@/lib/safety/emergency-numbers";
import type { SafetyPack } from "@/lib/safety/safety-pack";
import { countryNames } from "@/lib/travel/countries";
import { useLocale } from "@/lib/use-locale";
import { CallLink } from "./CallLink";

type ContactListProps = {
  pack: SafetyPack;
  text: Messages["safety"];
  /** Removes a local contact. Absent where the list is only read. */
  onRemove?: (contactId: string) => void;
};

/**
 * A row that calls a number, reaching the edges of the surface it stands in (a list frame, a block, a sheet), so
 * the whole width is the target. It is square: the surface's own corner clips it.
 */
export const CALL_ROW =
  "flex min-h-14 items-center gap-3 px-surface py-2 transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.99]";
const GROUP_TITLE = "text-label text-text-muted";

// Everyone the group can call for help: the desks and guards at the places it visits, then the national
// emergency numbers of each country on the trip. Each line is one tap to a call, and all of it is on the phone
// before the trip starts. It reaches out to the edges of the surface it stands in, which keeps the side padding.
export default function ContactList({ pack, text, onRemove }: ContactListProps) {
  const locale = useLocale();
  const copy = text.contacts;
  const names = countryNames(locale);

  return (
    <div className="space-y-4">
      {pack.contacts.length > 0 && (
        <div>
          <p className={GROUP_TITLE}>{copy.local}</p>
          <ul className="-mx-surface mt-1">
            {pack.contacts.map((contact) => (
              <li key={contact.id} className={`flex items-center ${onRemove ? "pr-1 sm:pr-3" : ""}`}>
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
                  <IconButton label={fillTemplate(copy.remove, { name: contact.placeName })} onClick={() => onRemove(contact.id)}>
                    <Trash2 className="size-5" aria-hidden="true" />
                  </IconButton>
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
          <ul className="-mx-surface mt-1">
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
