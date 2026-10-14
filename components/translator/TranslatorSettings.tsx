import { ArrowDownUp, Volume2 } from "lucide-react";
import SelectField from "@/components/ui/SelectField";
import { FIELD_LABEL, choiceClass } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import { type LanguageKey, type LocalLanguage, LOCAL_LANGUAGES } from "./languages";

type TranslatorSettingsProps = {
  localLanguage: LocalLanguage;
  onLanguage: (key: string) => void;
  autoSpeak: boolean;
  onAutoSpeak: (on: boolean) => void;
  faceToFace: boolean;
  onFaceToFace: (on: boolean) => void;
  canSpeak: boolean;
  text: Messages["translator"];
};

/** "Jepang (日本語)": the name in the reader's language, then the language's own name when it differs. */
export function languageLabel(language: LocalLanguage, names: Record<LanguageKey, string>): string {
  const name = names[language.key];
  return name === language.nativeName ? name : `${name} (${language.nativeName})`;
}

// Who the traveler is talking to and how the phone helps: the other side's language, reading each translation
// aloud, and turning the screen for the person across the table. The field and the two switches stand on rows of
// their own, so a field's corner never sits beside a pill's.
export default function TranslatorSettings({ localLanguage, onLanguage, autoSpeak, onAutoSpeak, faceToFace, onFaceToFace, canSpeak, text }: TranslatorSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="max-w-sm">
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
      <div className="flex flex-wrap gap-2">
        {canSpeak && (
          <button type="button" aria-pressed={autoSpeak} onClick={() => onAutoSpeak(!autoSpeak)} className={choiceClass(autoSpeak)}>
            <Volume2 className="size-4" aria-hidden="true" />
            {text.settings.autoSpeak}
          </button>
        )}
        <button type="button" aria-pressed={faceToFace} onClick={() => onFaceToFace(!faceToFace)} className={choiceClass(faceToFace)}>
          <ArrowDownUp className="size-4" aria-hidden="true" />
          {text.settings.faceToFace}
        </button>
      </div>
    </div>
  );
}
