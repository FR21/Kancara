import { Volume2 } from "lucide-react";
import SelectField from "@/components/ui/SelectField";
import { FIELD_LABEL, choiceClass } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import { type LanguageKey, type LocalLanguage, LOCAL_LANGUAGES } from "./languages";

type TranslatorSettingsProps = {
  localLanguage: LocalLanguage;
  onLanguage: (key: string) => void;
  autoSpeak: boolean;
  onAutoSpeak: (on: boolean) => void;
  canSpeak: boolean;
  text: Messages["translator"];
};

/** "Jepang (日本語)": the name in the reader's language, then the language's own name when it differs. */
export function languageLabel(language: LocalLanguage, names: Record<LanguageKey, string>): string {
  const name = names[language.key];
  return name === language.nativeName ? name : `${name} (${language.nativeName})`;
}

// Who the traveler is talking to and how the phone helps: the other side's language and reading each translation aloud.
export default function TranslatorSettings({ localLanguage, onLanguage, autoSpeak, onAutoSpeak, canSpeak, text }: TranslatorSettingsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="w-full max-w-sm">
        <label htmlFor="translator-language" className={`${FIELD_LABEL} block`}>
          {text.settings.language}
        </label>
        <SelectField id="translator-language" value={localLanguage.key} onChange={(event) => onLanguage(event.target.value)} className="mt-2">
          {LOCAL_LANGUAGES.map((language) => (
            <option key={language.key} value={language.key}>
              {languageLabel(language, text.languages)}
            </option>
          ))}
        </SelectField>
      </div>
      {canSpeak && (
        <div className="pb-0.5 sm:ml-auto">
          <button type="button" aria-pressed={autoSpeak} onClick={() => onAutoSpeak(!autoSpeak)} className={choiceClass(autoSpeak)}>
            <Volume2 className="size-4" aria-hidden="true" />
            {text.settings.autoSpeak}
          </button>
        </div>
      )}
    </div>
  );
}
