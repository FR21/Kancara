export type Theme = "light" | "dark";

const STORAGE_KEY = "kancara-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const CALM_QUERY = "(prefers-reduced-motion: reduce)";
// The reveal eases in and out, so it neither snaps open nor stops short.
const REVEAL_MS = 900;
const REVEAL_EASING = "cubic-bezier(0.45, 0, 0.2, 1)";
// The share of the circle that is fully the new theme. The rest fades out toward the rim (see globals.css).
const SOLID_SHARE = 0.55;

export const themeInitScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("${DARK_QUERY}").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function getCurrentTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  if (value === "light" || value === "dark") return value;
  return matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function applyTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage unavailable: the choice lasts until the page reloads.
  }
}

/**
 * Switches between light and dark. Given the control that was pressed, the new theme spreads out from it as a
 * soft-edged circle growing over the old one. Browsers without view transitions, and visitors who asked for
 * less motion, get the switch at once.
 */
export function toggleTheme(origin?: Element) {
  const next: Theme = getCurrentTheme() === "dark" ? "light" : "dark";
  if (!origin || typeof document.startViewTransition !== "function" || matchMedia(CALM_QUERY).matches) {
    applyTheme(next);
    return;
  }

  const box = origin.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  // The circle is a mask that grows around the control. Its solid middle has to reach the corner of the window
  // furthest from the control, so the whole mask ends up wider than that.
  const reach = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const size = Math.ceil((reach * 2) / SOLID_SHARE);
  const transition = document.startViewTransition(() => applyTheme(next));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          maskSize: ["0px 0px", `${size}px ${size}px`],
          // The mask is placed by its top-left corner, so that corner moves out as the mask grows around the control.
          maskPosition: [`${x}px ${y}px`, `${x - size / 2}px ${y - size / 2}px`],
        },
        // The mask holds its final size once it gets there. Without that it would fall back to nothing for a frame
        // before the transition is cleared away, and the old theme would flash over the whole page.
        { duration: REVEAL_MS, easing: REVEAL_EASING, fill: "forwards", pseudoElement: "::view-transition-new(root)" },
      );
    })
    // The transition was skipped, for example by a second press. The theme has changed all the same.
    .catch(() => undefined);
}

/**
 * Keeps following the OS setting while the user hasn't picked a theme.
 * Returns a cleanup function for useEffect.
 */
export function followSystemTheme() {
  const media = matchMedia(DARK_QUERY);
  const onChange = () => {
    if (getStoredTheme()) return;
    document.documentElement.dataset.theme = media.matches ? "dark" : "light";
  };
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
