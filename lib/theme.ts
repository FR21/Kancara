export type Theme = "light" | "dark";

const STORAGE_KEY = "kancara-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

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

export function toggleTheme() {
  const next: Theme = getCurrentTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage unavailable: the choice lasts until the page reloads.
  }
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
