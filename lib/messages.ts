// UI text, one JSON file per feature and locale: messages/<locale>/<feature>.json.
// Safe to import from server code. Client components read it through
// useMessages in ./use-messages.
//
// To add a feature: create messages/id/<feature>.json and
// messages/en/<feature>.json, then register both below.

import enFooter from "@/messages/en/footer.json";
import enNavbar from "@/messages/en/navbar.json";
import idFooter from "@/messages/id/footer.json";
import idNavbar from "@/messages/id/navbar.json";
import enLanding from "@/messages/en/landing.json";
import idLanding from "@/messages/id/landing.json";
import enPlan from "@/messages/en/plan.json";
import idPlan from "@/messages/id/plan.json";
import type { Locale } from "./locale";

// Indonesian is the default locale, so its files define the expected keys.
const id = {
  footer: idFooter,
  navbar: idNavbar,
  landing: idLanding,
  plan: idPlan,
};

export type Messages = typeof id;
export type Namespace = keyof Messages;

// `satisfies` makes a missing or misspelled key in an English file a type error.
const en = {
  footer: enFooter,
  navbar: enNavbar,
  landing: enLanding,
  plan: enPlan,
} satisfies Messages;

export const MESSAGES: Record<Locale, Messages> = { id, en };
