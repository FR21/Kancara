"use client";

import { Moon, Sun } from "lucide-react";
import { toggleTheme } from "@/lib/theme";

// Shared by both icons: a blurred crossfade reads as one icon morphing.
const ICON =
  "absolute inset-0 size-5 transition-[color,opacity,scale,rotate,filter] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity";

export default function ThemeToggle({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="group inline-flex size-11 cursor-pointer items-center justify-center rounded-md border border-border transition-[border-color,background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97] group-data-over-hero/nav:border-neutral-50/25 group-data-over-hero/nav:hover:bg-neutral-50/10 md:size-9"
    >
      {/* Icons swap with CSS, so the server render always matches. */}
      <span className="relative size-5">
        <Sun
          aria-hidden="true"
          className={`${ICON} text-accent-700 group-hover:rotate-45 group-data-over-hero/nav:text-accent-300 dark:scale-75 dark:-rotate-90 dark:opacity-0 dark:blur-[2px]`}
        />
        <Moon
          aria-hidden="true"
          className={`${ICON} scale-75 rotate-90 text-accent-300 opacity-0 blur-[2px] dark:scale-100 dark:rotate-0 dark:opacity-100 dark:blur-none dark:group-hover:-rotate-12`}
        />
      </span>
    </button>
  );
}
