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

export default function StartScreen({ text, input, onInputChange, onSend, onStartManual }: StartScreenProps) {
  const composerText = { ...text.composer, placeholder: text.start.placeholder };

  const pickExample = (story: string) => {
    onInputChange(story);
    document.getElementById("plan-composer")?.focus();
  };

  return (
    <div className="mx-auto w-full max-w-3xl text-center motion-safe:animate-message-in">
      <Image
        src="/images/logo/kancara_mascot_captain_logo.webp"
        alt=""
        width={500}
        height={500}
        sizes="(min-width: 1024px) 128px, 96px"
        preload
        className="mx-auto size-24 lg:size-32"
      />
      <h1 tabIndex={-1} className="mt-4 text-h2 text-balance text-text outline-none sm:text-h1 lg:text-display">
        {text.start.title}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-body text-pretty text-text-muted">{text.start.lead}</p>

      <div className="mt-8 text-left">
        <Composer value={input} disabled={false} text={composerText} rows={4} onChange={onInputChange} onSend={onSend} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <p className="text-label text-text-muted">{text.start.examplesLabel}</p>
        {text.chat.examples.map((example, index) => (
          <button key={example} type="button" title={example} onClick={() => pickExample(example)} className={QUICK_CHIP}>
            {text.chat.exampleLabels[index]}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-8 flex max-w-md items-center gap-3 text-label text-text-muted">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        {text.start.or}
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-4 flex justify-center">
        <button type="button" onClick={onStartManual} className={OUTLINE_BUTTON}>
          <ListChecks className="size-4" aria-hidden="true" />
          {text.start.form}
        </button>
      </div>
    </div>
  );
}
