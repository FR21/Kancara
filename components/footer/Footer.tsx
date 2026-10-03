"use client";

import { ArrowUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { LEGAL_LINKS, NAV_LINKS } from "@/lib/nav-links";
import { useMessages } from "@/lib/use-messages";

const FAR_HILLS =
  "M0 128C160 84 300 70 470 102S780 58 960 86S1260 66 1440 100V240H0Z";
const MID_HILLS =
  "M0 168C190 128 360 150 560 140S900 108 1110 146S1330 128 1440 136V240H0Z";
const NEAR_HILLS = "M0 204C240 176 470 192 720 184S1180 166 1440 190V240H0Z";
const ROUTE = "M90 176C250 72 460 66 640 118S990 176 1217 126";

const UNDERLINE =
  "bg-[linear-gradient(var(--accent),var(--accent))] bg-position-[0_100%] bg-no-repeat bg-size-[0%_2px] pb-0.5 transition-[color,background-size] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]";

function LinkColumn({
  heading,
  links,
}: {
  heading: string;
  links: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div>
      <h2 className="font-sans text-label text-on-footer">{heading}</h2>
      <ul className="mt-4 flex flex-col items-start gap-3">
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`${UNDERLINE} rounded-sm text-body-sm focus-visible:outline-accent ${
                  active
                    ? "bg-size-[100%_2px] text-on-footer"
                    : "text-on-footer-muted hover:bg-size-[100%_2px] hover:text-on-footer"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Footer() {
  const text = useMessages("footer");
  const navLabels = useMessages("navbar").links;
  const year = new Date().getFullYear();
  const bandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;
    const observer = new IntersectionObserver(([entry]) => {
      band.toggleAttribute("data-in-view", entry.isIntersecting);
    });
    observer.observe(band);
    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => {
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <footer className="relative mt-24 text-on-footer">
      <div
        ref={bandRef}
        aria-hidden="true"
        className="footer-timeline relative h-40 overflow-hidden sm:h-56"
      >
        <svg
          viewBox="0 0 1440 240"
          preserveAspectRatio="none"
          className="footer-settle absolute inset-0 size-full fill-footer-far [--footer-depth:-4.5rem]"
        >
          <path d={FAR_HILLS} />
        </svg>
        <svg
          viewBox="0 0 1440 240"
          preserveAspectRatio="none"
          className="footer-settle absolute inset-0 size-full fill-footer-mid [--footer-depth:-2rem]"
        >
          <path d={MID_HILLS} />
        </svg>

        <div className="footer-settle absolute inset-0 [--footer-depth:-2rem]">
          <svg
            viewBox="0 0 1440 240"
            preserveAspectRatio="none"
            className="footer-draw absolute inset-0 size-full overflow-visible"
          >
            <path
              d={ROUTE}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="0.5 9"
              vectorEffect="non-scaling-stroke"
              className="footer-flow stroke-accent"
            />
          </svg>
          <span className="absolute top-[73.3%] left-[6.25%] size-3 -translate-1/2 rounded-full border-2 border-accent bg-background" />
        </div>

        <svg
          viewBox="0 0 1440 240"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full fill-footer"
        >
          <path d={NEAR_HILLS} />
        </svg>

        <div className="footer-arrive absolute bottom-[22%] left-[84.5%] w-18 -translate-x-1/2 sm:w-28">
          <Image
            src="/images/logo/kancara_mascot_logo.webp"
            alt=""
            width={1254}
            height={1254}
            sizes="(min-width: 640px) 112px, 72px"
            className="origin-bottom transition-[rotate] duration-500 ease-spring hover:-rotate-8"
          />
        </div>
      </div>

      <div className="-mt-px bg-footer">
        <div className="mx-auto grid max-w-5xl gap-x-8 gap-y-10 px-6 pt-8 pb-14 md:grid-cols-[minmax(0,1.6fr)_minmax(0,2fr)] md:gap-y-12">
          <div>
            <Link href="/" className="inline-block rounded-sm focus-visible:outline-accent">
              <Image
                src="/images/logo/kancara_wordmark_logo.webp"
                alt="Kancara"
                width={866}
                height={288}
                className="h-11 w-auto"
              />
            </Link>
            <p className="mt-6 max-w-sm font-heading text-h2 text-balance">{text.tagline}</p>
            <p className="mt-3 max-w-sm text-body-sm text-pretty text-on-footer-muted">
              {text.description}
            </p>
          </div>

          <nav aria-label={text.navLabel} className="grid grid-cols-2 gap-8">
            <LinkColumn
              heading={text.exploreHeading}
              links={NAV_LINKS.map((link) => ({ href: link.href, label: navLabels[link.key] }))}
            />
            <LinkColumn
              heading={text.legalHeading}
              links={LEGAL_LINKS.map((link) => ({ href: link.href, label: text.legal[link.key] }))}
            />
          </nav>
        </div>

        <div className="border-t border-footer-border">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4 text-body-sm text-on-footer-muted">
            <p>© {year} Kancara</p>
            <button
              type="button"
              onClick={scrollToTop}
              className="group -mx-3 inline-flex h-11 cursor-pointer items-center gap-2 rounded-md px-3 transition-[color,background-color,scale] duration-150 ease-out hover:bg-footer-border/60 hover:text-on-footer focus-visible:outline-accent active:scale-[0.97]"
            >
              {text.backToTop}
              <ArrowUp
                aria-hidden="true"
                className="size-4 transition-[translate] duration-200 ease-out group-hover:-translate-y-0.5"
              />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
