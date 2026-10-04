"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { NAV_LINKS } from "@/lib/nav-links";
import { useLocale } from "@/lib/use-locale";
import { useMessages } from "@/lib/use-messages";
import { followSystemTheme } from "@/lib/theme";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";

/** The gold smile from the Kancara logo, used as the active-page mark. */
function Smile({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 8" aria-hidden="true" className={`overflow-visible ${className}`}>
      <path
        d="M2.5 2.5Q10 9 17.5 2.5"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-accent"
      />
    </svg>
  );
}

// Scroll distance (px) over which the navbar moves into its compact state.
const SCROLL_RANGE = 160;

const DARK_HERO_ROUTES = new Set(["/"]);

// Matches duration-500 on the smile, so the stretch ends as the glide settles.
const SMILE_MS = 500;

/**
 * Puts the smile under `target`. The slide itself is a CSS transition on
 * --smile-x; on top of it the smile stretches with the distance travelled,
 * so a long move reads as one glide instead of a jump.
 */
function moveSmile(smile: HTMLElement, target: HTMLElement | null) {
  if (!target || target.offsetWidth === 0) {
    smile.dataset.state = "hidden";
    return;
  }

  const x = target.offsetLeft + target.offsetWidth / 2;
  const distance = Math.abs(x - Number(smile.dataset.x ?? x));
  smile.dataset.x = String(x);
  smile.style.setProperty("--smile-x", `${x}px`);

  // Appear in place first, then enable the slide, so it never flies in from the edge.
  if (smile.dataset.state !== "ready") {
    smile.dataset.state = "placed";
    requestAnimationFrame(() => {
      if (smile.dataset.state === "placed") smile.dataset.state = "ready";
    });
    return;
  }

  if (distance < 1 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // Peaks at 20%, where the spring moves fastest, and eases back as it settles.
  const stretch = 1 + Math.min(distance / 250, 0.6);
  smile.animate(
    [
      { scale: "1 1", easing: "ease-out" },
      { scale: `${stretch} ${1 / Math.sqrt(stretch)}`, offset: 0.2, easing: "ease-in-out" },
      { scale: "1 1" },
    ],
    SMILE_MS,
  );
}

/** True for a plain left click, the only kind that navigates in this tab. */
function isPlainClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export default function Navbar() {
  const pathname = usePathname();
  const locale = useLocale();
  const text = useMessages("navbar");

  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navListRef = useRef<HTMLUListElement>(null);
  const smileRef = useRef<HTMLSpanElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => followSystemTheme(), []);

  // Parallax: while the page scrolls, the navbar drifts up and narrows at a
  // fraction of the scroll speed. Progress goes to a CSS variable, so scrolling
  // doesn't re-render React.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const progress = Math.min(Math.max(window.scrollY / SCROLL_RANGE, 0), 1);
      headerRef.current?.style.setProperty("--nav-progress", progress.toFixed(3));
      setScrolled(progress > 0.1);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const closeMenu = () => setMenuOpen(false);
  const solid = scrolled || menuOpen;
  const overHero = !solid && DARK_HERO_ROUTES.has(pathname);

  // Move the smile on click instead of waiting for the next page to load.
  const previewSmile = (event: MouseEvent, href: string) => {
    const list = navListRef.current;
    const smile = smileRef.current;
    if (!list || !smile || !isPlainClick(event)) return;
    moveSmile(smile, list.querySelector<HTMLElement>(`a[href="${href}"]`));
  };

  // The gold smile from the logo marks the active link. This keeps it in sync
  // with the route, including back/forward navigation.
  useEffect(() => {
    const list = navListRef.current;
    const smile = smileRef.current;
    if (!list || !smile) return;

    const place = () => moveSmile(smile, list.querySelector<HTMLElement>('[aria-current="page"]'));
    place();
    // Link widths change when fonts load or the locale switches.
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  }, [pathname, locale]);

  return (
    <header
      ref={headerRef}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-4 [--nav-progress:0] sm:px-6 sm:pt-6"
    >
      {/* Tap outside the open mobile menu to close it */}
      {menuOpen && (
        <div
          aria-hidden="true"
          onClick={closeMenu}
          className="pointer-events-auto fixed inset-0 -z-10 bg-neutral-950/30 md:hidden"
        />
      )}

      <div
        data-over-hero={overHero || undefined}
        className={`group/nav pointer-events-auto mx-auto flex w-full max-w-5xl items-center justify-between gap-4 rounded-lg border py-2 pr-2 pl-4 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out motion-safe:max-w-[calc(64rem-8rem*var(--nav-progress))] motion-safe:translate-y-[calc(var(--nav-progress)*-0.5rem)] ${
          solid
            ? "border-border bg-surface/95 shadow-lg shadow-neutral-950/10 backdrop-blur-md"
            : "border-transparent bg-transparent"
        }`}
      >
        <Link
          href="/"
          aria-label={text.homeLabel}
          onClick={(event) => {
            closeMenu();
            previewSmile(event, "/");
          }}
          className="flex min-h-11 shrink-0 items-center rounded-sm md:min-h-0"
        >
          <Image
            src="/images/logo/kancara_wordmark_logo.webp"
            alt=""
            width={866}
            height={288}
            loading="eager"
            className="-my-1 h-10 w-auto"
          />
        </Link>

        <nav aria-label={text.navLabel} className="relative hidden md:block">
          <ul ref={navListRef} className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={(event) => previewSmile(event, link.href)}
                    className={`inline-flex h-10 items-center rounded-md px-3 pb-1 text-label transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.97] ${
                      active
                        ? "text-primary group-data-over-hero/nav:text-neutral-50"
                        : "text-text-muted hover:bg-surface-muted hover:text-text group-data-over-hero/nav:text-neutral-50/80 group-data-over-hero/nav:hover:bg-neutral-50/10 group-data-over-hero/nav:hover:text-neutral-50"
                    }`}
                  >
                    {text.links[link.key]}
                  </Link>
                </li>
              );
            })}
          </ul>
          <span
            ref={smileRef}
            aria-hidden="true"
            data-state="hidden"
            className="pointer-events-none absolute bottom-0.5 left-0 h-2 w-5 translate-x-[calc(var(--smile-x,0px)-50%)] opacity-0 data-[state=placed]:opacity-100 data-[state=ready]:opacity-100 data-[state=ready]:motion-safe:transition-[translate] data-[state=ready]:motion-safe:duration-500 data-[state=ready]:motion-safe:ease-spring"
          >
            <Smile className="size-full" />
          </span>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <LanguageToggle label={text.languageToggle} />
            <ThemeToggle label={text.themeToggle} />
            {/* Profile menu goes here (added later). */}
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? text.closeMenu : text.openMenu}
            className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-text transition-[color,background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97] group-data-over-hero/nav:text-neutral-50 group-data-over-hero/nav:hover:bg-neutral-50/10 md:hidden"
          >
            <Menu
              aria-hidden="true"
              className={`absolute size-6 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity ${
                menuOpen ? "scale-75 opacity-0 blur-[2px]" : ""
              }`}
            />
            <X
              aria-hidden="true"
              className={`absolute size-6 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity ${
                menuOpen ? "" : "scale-75 opacity-0 blur-[2px]"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        inert={!menuOpen}
        className={`mx-auto mt-2 max-w-5xl rounded-lg border border-border bg-surface p-2 origin-top-right shadow-lg shadow-neutral-950/10 transition-[opacity,scale,translate] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity md:hidden ${
          menuOpen
            ? "pointer-events-auto duration-250 opacity-100"
            : "-translate-y-1 scale-[0.97] opacity-0 duration-150"
        }`}
      >
        <nav aria-label={text.navLabel}>
          <ul className="flex flex-col gap-0.5">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={closeMenu}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between rounded-md px-3 py-3 text-label-lg transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.98] ${
                      active
                        ? "bg-primary-subtle text-on-primary-subtle"
                        : "text-text hover:bg-surface-muted"
                    }`}
                  >
                    {text.links[link.key]}
                    {active && <Smile className="h-2 w-5" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-2 flex items-center justify-between border-t border-border px-1 pt-3 pb-1">
          <LanguageToggle label={text.languageToggle} />
          <ThemeToggle label={text.themeToggle} />
        </div>
      </div>
    </header>
  );
}
