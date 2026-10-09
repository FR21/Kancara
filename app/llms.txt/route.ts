import { DEFAULT_LOCALE, localizedPath } from "@/lib/locale";
import { MESSAGES } from "@/lib/messages";
import { rateLimit } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/seo";

// A plain-text summary of Kancara for AI assistants, following the llms.txt proposal (a young convention, not a
// standard). It is built from the same message files as the pages, so it says what the site says.
function summary(): string {
  const english = MESSAGES.en;
  const local = MESSAGES[DEFAULT_LOCALE];
  const answers = english.landing.faq.items.map((item) => `- **${item.question}** ${item.answer}`);

  return [
    `# ${english.seo.siteName}`,
    "",
    `> ${english.seo.description}`,
    "",
    `In Indonesian: ${local.seo.description}`,
    "",
    "## Questions and answers",
    "",
    ...answers,
    "",
    "## Pages",
    "",
    `- [Home](${SITE_URL}/): ${english.seo.pages.home.description}`,
    `- [About Kancara](${SITE_URL}/about): ${english.seo.pages.about.description}`,
    "",
    "## Languages",
    "",
    `- Indonesian is the default: ${SITE_URL}/`,
    `- English: ${SITE_URL}${localizedPath("/", "en")}`,
    "",
  ].join("\n");
}

export async function GET(request: Request) {
  const limited = rateLimit(request, "llms");
  if (limited) return limited;

  return new Response(summary(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
