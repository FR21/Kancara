import { MESSAGES, type Messages, type Namespace } from "./messages";
import { useLocale } from "./use-locale";

/** The current locale's text for one feature, e.g. useMessages("navbar"). */
export function useMessages<N extends Namespace>(namespace: N): Messages[N] {
  return MESSAGES[useLocale()][namespace];
}
