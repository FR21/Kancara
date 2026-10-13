import { useSyncExternalStore } from "react";

// A phone dials a number the moment its link is tapped. A computer cannot: the browser answers with its own
// "open an app?" alert, which names no number and helps nobody. So on a device that does not dial, the number is
// shown in the page's own popup instead, to be read off, copied, or passed to WhatsApp. This holds which number
// that popup is showing; one popup per page listens to it.

export type CallTarget = {
  name: string;
  phone: string;
  /** Set for a text message: the words to send along. */
  message?: string;
};

let target: CallTarget | null = null;
const listeners = new Set<() => void>();

function set(next: CallTarget | null) {
  target = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True where tapping a number dials it: a phone or tablet, told by its touch screen being the main pointer. */
export function dialsItself(): boolean {
  return navigator.maxTouchPoints > 0 && window.matchMedia("(pointer: coarse)").matches;
}

export function askToCall(next: CallTarget) {
  set(next);
}

export function closeCallPrompt() {
  set(null);
}

export function useCallTarget(): CallTarget | null {
  return useSyncExternalStore(
    subscribe,
    () => target,
    () => null,
  );
}
