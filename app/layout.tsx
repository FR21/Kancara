import type { Metadata, Viewport } from "next";
import Footer from "@/components/footer/Footer";
import LocaleProvider from "@/components/layout/LocaleProvider";
import OfflineReady from "@/components/layout/OfflineReady";
import SiteChrome from "@/components/layout/SiteChrome";
import Navbar from "@/components/navbar/Navbar";
import { currentViewer } from "@/lib/account";
import { localeInitScript } from "@/lib/locale";
import { requestLocale } from "@/lib/locale-server";
import { MESSAGES } from "@/lib/messages";
import { SITE_URL } from "@/lib/seo";
import { themeInitScript } from "@/lib/theme";
import { FONT_CLASSES } from "./fonts";
import "./globals.css";

// Defaults for every page. Each page adds its own title, description, canonical address, and preview tags.
export async function generateMetadata(): Promise<Metadata> {
  const text = MESSAGES[await requestLocale()].seo;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: text.pages.home.title, template: `%s | ${text.siteName}` },
    description: text.description,
    applicationName: text.siteName,
    verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#081415" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [viewer, locale] = await Promise.all([currentViewer(), requestLocale()]);

  return (
    // The inline script sets data-theme and lang before hydration, so React
    // must not warn about those attributes differing from the server render.
    <html lang={locale} suppressHydrationWarning className={FONT_CLASSES}>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: `${themeInitScript};${localeInitScript}` }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans overflow-x-clip">
        <OfflineReady />
        <LocaleProvider locale={locale}>
          <SiteChrome>
            <Navbar isLoggedIn={viewer !== null} picture={viewer?.picture ?? null} />
          </SiteChrome>
          {children}
          <SiteChrome>
            <Footer />
          </SiteChrome>
        </LocaleProvider>
      </body>
    </html>
  );
}
