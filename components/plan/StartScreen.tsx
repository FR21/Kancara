"use client";

import { ListChecks } from "lucide-react";
import Image from "next/image";
import type { Messages } from "@/lib/messages";

type StartScreenProps = {
  text: Messages["plan"];
  onStartManual: () => void;
};

export default function StartScreen({ text, onStartManual }: StartScreenProps) {
  return (
    <div className="relative mx-auto w-full max-w-3xl text-center motion-safe:animate-message-in">
      <div aria-hidden="true" className="parallax-top pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 opacity-30 blur-[100px] [--parallax-to:10rem]">
        <div className="aspect-square w-[600px] rounded-full bg-gradient-to-tr from-primary/40 to-transparent"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative group motion-safe:animate-float">
          <div className="absolute -inset-4 rounded-full bg-primary/20 blur-xl transition-all duration-500 group-hover:bg-primary/30 group-hover:blur-2xl"></div>
          <Image
            src="/images/logo/kancara_mascot_captain_logo.webp"
            alt=""
            width={500}
            height={500}
            sizes="(min-width: 1024px) 160px, 128px"
            priority
            className="relative mx-auto size-32 drop-shadow-2xl transition-transform duration-500 ease-out group-hover:scale-110 lg:size-40"
          />
        </div>
        
        <h1 tabIndex={-1} className="mt-8 text-4xl font-extrabold tracking-tight text-balance text-text outline-none sm:text-5xl lg:text-6xl">
          {text.start.title}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-body leading-relaxed text-pretty text-text-muted sm:text-h3">
          {text.start.lead}
        </p>

        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={onStartManual}
            className="group relative inline-flex h-14 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-gradient-to-r from-primary to-primary-hover px-8 text-body font-medium text-on-primary shadow-lg shadow-primary/30 outline-none transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/40 active:translate-y-0 active:scale-95"
          >
            <span className="absolute inset-0 rounded-full bg-on-primary/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></span>
            <ListChecks className="relative z-10 size-6 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
            <span className="relative z-10">{text.start.form}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
