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
import enError from "@/messages/en/error.json";
import idError from "@/messages/id/error.json";
import enAuth from "@/messages/en/auth.json";
import idAuth from "@/messages/id/auth.json";
import enProfile from "@/messages/en/profile.json";
import idProfile from "@/messages/id/profile.json";
import enTravel from "@/messages/en/travel.json";
import idTravel from "@/messages/id/travel.json";
import enAbout from "@/messages/en/about.json";
import idAbout from "@/messages/id/about.json";
import enTrips from "@/messages/en/trips.json";
import idTrips from "@/messages/id/trips.json";
import enSeo from "@/messages/en/seo.json";
import idSeo from "@/messages/id/seo.json";
import enLegal from "@/messages/en/legal.json";
import idLegal from "@/messages/id/legal.json";
import type { Locale } from "./locale";

// Indonesian is the default locale, so its files define the expected keys.
const id = {
  footer: idFooter,
  navbar: idNavbar,
  landing: idLanding,
  plan: idPlan,
  error: idError,
  auth: idAuth,
  profile: idProfile,
  travel: idTravel,
  about: idAbout,
  trips: idTrips,
  seo: idSeo,
  legal: idLegal,
};

export type Messages = typeof id;
export type Namespace = keyof Messages;

// `satisfies` makes a missing or misspelled key in an English file a type error.
const en = {
  footer: enFooter,
  navbar: enNavbar,
  landing: enLanding,
  plan: enPlan,
  error: enError,
  auth: enAuth,
  profile: enProfile,
  travel: enTravel,
  about: enAbout,
  trips: enTrips,
  seo: enSeo,
  legal: enLegal,
} satisfies Messages;

export const MESSAGES: Record<Locale, Messages> = { id, en };
