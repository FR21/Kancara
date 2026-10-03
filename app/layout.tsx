import type { Metadata } from "next";
import { Montserrat, Plus_Jakarta_Sans } from "next/font/google";
import Footer from "@/components/footer/Footer";
import Navbar from "@/components/navbar/Navbar";
import { DEFAULT_LOCALE, localeInitScript } from "@/lib/locale";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

// Headings. Font tokens live in globals.css.
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

// Body text, labels, and buttons.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kancara",
  description: "Your inclusive group travel planner",
  icons: {
    icon: { url: "/images/logo/kancara_mascot_logo.webp", type: "image/webp" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script sets data-theme and lang before hydration, so React
    // must not warn about those attributes differing from the server render.
    <html
      lang={DEFAULT_LOCALE}
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${montserrat.variable} antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: `${themeInitScript};${localeInitScript}` }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans overflow-x-clip">
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
