"use client";

import { ListChecks, Users } from "lucide-react";
import Link from "next/link";
import type { Messages } from "@/lib/messages";
import { useLocale } from "@/lib/use-locale";
import CaptainGreeter from "./CaptainGreeter";

type StartScreenProps = {
  text: Messages["plan"];
  onStartManual: () => void;
};

export default function StartScreen({ text, onStartManual }: StartScreenProps) {
  const locale = useLocale();

  return (
    <div className="relative mx-auto w-full max-w-3xl text-center motion-safe:animate-message-in">
      <div aria-hidden="true" className="parallax-top pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 opacity-30 blur-[100px] [--parallax-to:10rem]">
        <div className="aspect-square w-[600px] rounded-full bg-gradient-to-tr from-primary/40 to-transparent"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <CaptainGreeter lines={text.start.greetings} label={text.start.greet} />

        <h1 tabIndex={-1} className="mt-4 text-4xl font-extrabold tracking-tight text-balance text-text outline-none sm:text-5xl lg:text-6xl">
          {text.start.title}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-body leading-relaxed text-pretty text-text-muted sm:text-h3">
          {text.start.lead}
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={onStartManual}
            className="group relative inline-flex h-14 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-gradient-to-r from-primary to-primary-hover px-8 text-body font-medium text-on-primary shadow-lg shadow-primary/30 outline-none transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/40 active:translate-y-0 active:scale-95"
          >
            <span className="absolute inset-0 rounded-full bg-on-primary/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></span>
            <ListChecks className="relative z-10 size-6 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
            <span className="relative z-10">{text.start.form}</span>
          </button>
          <Link
            href="/profile/saved-members"
            className="group inline-flex h-14 items-center justify-center gap-3 whitespace-nowrap rounded-full border border-border-strong bg-surface px-7 text-body font-medium text-text shadow-md transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary hover:bg-surface-muted hover:shadow-lg active:translate-y-0 active:scale-95"
          >
            <Users className="size-5 text-primary transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
            <span>{locale === "id" ? "Profil Tersimpan" : "Saved Profiles"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
