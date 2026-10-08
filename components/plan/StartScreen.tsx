"use client";

import { ListChecks } from "lucide-react";
import Image from "next/image";
import type { Messages } from "@/lib/messages";
import Composer from "./Composer";
import { OUTLINE_BUTTON, QUICK_CHIP } from "./styles";

type StartScreenProps = {
  text: Messages["plan"];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStartManual: () => void;
};

export default function StartScreen({ text, onStartManual }: StartScreenProps) {
  return (
    <div className="relative mx-auto w-full max-w-3xl text-center motion-safe:animate-message-in">
      {/* Decorative ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 opacity-30 blur-[100px]">
        <div className="aspect-square w-[600px] rounded-full bg-gradient-to-tr from-primary/40 to-transparent"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative group">
          <div className="absolute -inset-4 rounded-full bg-primary/20 blur-xl transition-all duration-500 group-hover:bg-primary/30 group-hover:blur-2xl"></div>
          <Image
            src="/images/logo/kancara_mascot_captain_logo.webp"
            alt="Kancara Captain Mascot"
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
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-text-muted">
          {text.start.lead}
        </p>

        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={onStartManual}
            className="group relative inline-flex h-14 items-center justify-center gap-3 whitespace-nowrap rounded-full bg-gradient-to-r from-primary to-primary-hover px-8 text-body font-medium text-surface shadow-[0_0_40px_-10px_rgba(var(--color-primary),0.5)] outline-none transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_0_60px_-15px_rgba(var(--color-primary),0.7)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:translate-y-0 active:scale-95"
          >
            <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></span>
            <ListChecks className="relative z-10 size-6 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
            <span className="relative z-10">{text.start.form}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
