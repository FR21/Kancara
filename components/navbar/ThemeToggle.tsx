"use client";

import { Moon, Sun } from "lucide-react";
import { toggleTheme } from "@/lib/theme";

// Shared by both icons: a blurred crossfade reads as one icon morphing.
const ICON =
  "absolute inset-0 size-5 transition-[color,opacity,scale,rotate,filter] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity";

// Sized by its content box, so with its border it stands exactly as tall as the language switch beside it.
export default function ThemeToggle({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={(event) => toggleTheme(event.currentTarget)}
      aria-label={label}
      title={label}
      className="group box-content inline-flex size-13 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-strong transition-[border-color,background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97] group-data-over-hero/nav:border-neutral-50/40 group-data-over-hero/nav:hover:bg-neutral-50/10 lg:size-10"
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
