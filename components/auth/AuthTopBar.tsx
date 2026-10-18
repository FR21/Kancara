"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import LanguageToggle from "@/components/navbar/LanguageToggle";
import ThemeToggle from "@/components/navbar/ThemeToggle";
import { followSystemTheme } from "@/lib/theme";
import { useMessages } from "@/lib/use-messages";

// On a laptop the bar runs across both halves of the page, on top of the photo: the logo sits at the far left
// over the picture and the toggles at the far right, each as far from its edge as the photo's caption is.
export default function AuthTopBar() {
  const text = useMessages("navbar");

  useEffect(() => followSystemTheme(), []);

  return (
    <header className="relative z-10 flex h-[calc(env(safe-area-inset-top)+5rem)] items-center justify-between gap-4 px-4 pt-[env(safe-area-inset-top)] sm:px-8 lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:px-12">
      <Link href="/" aria-label={text.homeLabel} className="flex min-h-11 items-center rounded-lg">
        <Image
          src="/images/logo/kancara_wordmark_logo.webp"
          alt=""
          width={232}
          height={77}
          sizes="160px"
          loading="eager"
          className="h-10 w-auto"
        />
      </Link>
      <div className="flex items-center gap-2">
        <LanguageToggle label={text.languageToggle} />
        <ThemeToggle label={text.themeToggle} />
      </div>
    </header>
  );
}
