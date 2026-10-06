import type { Metadata } from "next";
import Footer from "@/components/footer/Footer";
import SiteChrome from "@/components/layout/SiteChrome";
import Navbar from "@/components/navbar/Navbar";
import { DEFAULT_LOCALE, localeInitScript } from "@/lib/locale";
import { themeInitScript } from "@/lib/theme";
import { verifySession } from "@/lib/auth/session";
import { FONT_CLASSES } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kancara",
  description: "Your inclusive group travel planner",
  icons: {
    icon: { url: "/images/logo/kancara_mascot_logo.webp", type: "image/webp" },
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await verifySession();
  const isLoggedIn = !!session;

  return (
    // The inline script sets data-theme and lang before hydration, so React
    // must not warn about those attributes differing from the server render.
    <html
      lang={DEFAULT_LOCALE}
      suppressHydrationWarning
      className={FONT_CLASSES}
    >
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: `${themeInitScript};${localeInitScript}` }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans overflow-x-clip">
        <SiteChrome>
          <Navbar isLoggedIn={isLoggedIn} picture={session?.picture ?? null} />
        </SiteChrome>
        {children}
        <SiteChrome>
          <Footer />
        </SiteChrome>
      </body>
    </html>
  );
}

