/** How a person's character is drawn when the app knows: a man's or a woman's hair. */
export type AvatarPresentation = "masculine" | "feminine";

// A relationship is kept as the words the person picked or typed, in whichever language they used then, so a
// profile saved as "Ayah" is still a father when the app is read in English. These are the words, in both
// languages, that say whether the person is a man or a woman; anything else leaves their character to chance.
const MASCULINE = [
  "ayah", "bapak", "papa", "papi", "abah", "kakek", "opa", "suami", "putra", "adik laki-laki", "kakak laki-laki",
  "om", "paman", "father", "dad", "daddy", "grandpa", "grandfather", "husband", "son", "brother", "uncle",
];
const FEMININE = [
  "ibu", "mama", "mami", "bunda", "umi", "nenek", "oma", "istri", "putri", "adik perempuan", "kakak perempuan",
  "tante", "bibi", "mother", "mom", "mum", "mommy", "grandma", "grandmother", "wife", "daughter", "sister", "aunt",
];

/** Whether a relationship names a man or a woman, so their character is drawn to match. */
export function relationshipPresentation(relationship: string): AvatarPresentation | undefined {
  const words = relationship.trim().toLowerCase();
  if (words === "") return undefined;
  // The whole phrase is compared, then its first word, so "Ayah mertua" and "Mother-in-law" still count.
  const first = words.split(/[\s-]/)[0];
  if (MASCULINE.includes(words) || MASCULINE.includes(first)) return "masculine";
  if (FEMININE.includes(words) || FEMININE.includes(first)) return "feminine";
  return undefined;
}
