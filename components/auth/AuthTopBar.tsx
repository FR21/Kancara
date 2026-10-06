"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import LanguageToggle from "@/components/navbar/LanguageToggle";
import ThemeToggle from "@/components/navbar/ThemeToggle";
import { followSystemTheme } from "@/lib/theme";
import { useMessages } from "@/lib/use-messages";

export default function AuthTopBar() {
  const text = useMessages("navbar");

  useEffect(() => followSystemTheme(), []);

  return (
    <header className="flex h-20 items-center justify-between gap-4 px-4 sm:px-8 lg:col-start-2 lg:row-start-1 lg:px-12">
      <Link href="/" aria-label={text.homeLabel} className="flex min-h-11 items-center rounded-sm">
        <Image
          src="/images/logo/kancara_wordmark_logo.webp"
          alt=""
          width={866}
          height={288}
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
