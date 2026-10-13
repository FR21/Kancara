import type { Messages } from "./messages";

export type NavLink = { href: string; key: keyof Messages["navbar"]["links"] };

export const NAV_LINKS: NavLink[] = [
  { href: "/", key: "home" },
  { href: "/plan", key: "plan" },
  { href: "/trips", key: "trips" },
  { href: "/split-bill", key: "splitBill" },
  { href: "/about", key: "about" },
];

export type LegalLink = { href: string; key: keyof Messages["footer"]["legal"] };

// Footer legal pages. Labels live in messages/<locale>/footer.json under "legal".
export const LEGAL_LINKS: LegalLink[] = [
  { href: "/privacy", key: "privacy" },
  { href: "/terms", key: "terms" },
];
