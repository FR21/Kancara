// UI text, one JSON file per feature and locale: messages/<locale>/<feature>.json.
// Safe to import from server code. Client components read it through
// useMessages in ./use-messages.
//
// To add a feature: create messages/id/<feature>.json and
// messages/en/<feature>.json, then register both below.

import enNavbar from "@/messages/en/navbar.json";
import idNavbar from "@/messages/id/navbar.json";
import type { Locale } from "./locale";

// Indonesian is the default locale, so its files define the expected keys.
const id = {
  navbar: idNavbar,
};

export type Messages = typeof id;
export type Namespace = keyof Messages;

// `satisfies` makes a missing or misspelled key in an English file a type error.
const en = {
  navbar: enNavbar,
} satisfies Messages;

export const MESSAGES: Record<Locale, Messages> = { id, en };
