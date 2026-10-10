import "server-only";
import { type Locale, LOCALES, localizedPath } from "./locale";
import { MESSAGES } from "./messages";
import { SITE_URL } from "./seo";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const LOGO_URL = `${SITE_URL}/images/logo/kancara_full_logo.png`;

/**
 * What Kancara is, for search engines and AI assistants: the organization, the
 * site, and the app. Every text comes from the same message files the pages
 * show, so the two cannot drift.
 */
export function siteGraph(locale: Locale) {
  const { seo } = MESSAGES[locale];
  const home = `${SITE_URL}${localizedPath("/", locale)}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: seo.siteName,
        url: SITE_URL,
        logo: LOGO_URL,
        description: seo.description,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: seo.siteName,
        url: SITE_URL,
        description: seo.description,
        inLanguage: [...LOCALES],
        publisher: { "@id": ORGANIZATION_ID },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: seo.siteName,
        url: home,
        description: seo.description,
        image: LOGO_URL,
        applicationCategory: "TravelApplication",
        operatingSystem: "Web",
        inLanguage: [...LOCALES],
        offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

/** The questions answered on the About page, as structured data. It belongs on the page that shows them. */
export function questionsGraph(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}${localizedPath("/about", locale)}#faq`,
    inLanguage: locale,
    mainEntity: MESSAGES[locale].about.faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
