"use client";

import { type ReactNode, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const subscribeNever = () => () => undefined;

// A page's main action pinned at the bottom of a phone, where the thumb rests. It is drawn straight into the page's
// body: inside the page, an ancestor that animates in (a translate or a scale) would become what "fixed" is fixed
// to, and the bar would sit under the header instead of at the bottom of the screen.
export default function MobileActionBar({ children }: { children: ReactNode }) {
  // document.body exists only in the browser: the server and the first render in the browser draw nothing.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    <div data-page-bar className="safe-bottom safe-x fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pt-3 sm:hidden">
      <div className="mx-auto flex max-w-2xl *:flex-1">{children}</div>
    </div>,
    document.body,
  );
}
