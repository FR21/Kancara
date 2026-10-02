import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import Navbar from "@/components/navbar/Navbar";
import { DEFAULT_LOCALE, localeInitScript } from "@/lib/locale";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

// Headings. Font tokens live in globals.css.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

// Body text, labels, and buttons.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kancara",
  description: "Your inclusive group travel planner",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script sets data-theme and lang before hydration, so React
    // must not warn about those attributes differing from the server render.
    <html
      lang={DEFAULT_LOCALE}
      suppressHydrationWarning
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: `${themeInitScript};${localeInitScript}` }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
