export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "entropylab:theme";

/**
 * Runs before first paint, inlined into index.html.
 *
 * Without it the page renders light, then flips when React mounts, which is
 * the single most noticeable rendering defect a themed app can ship. Wrapped
 * in try/catch because reading localStorage throws in a private window, and
 * someone profiling entropy for a seed ceremony is likely to be in one.
 */
export const THEME_BOOTSTRAP = `(function(){try{
var c=localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"system";
var d=c==="dark"||(c==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.setAttribute("data-theme",d?"dark":"light");
}catch(e){}})();`;

export function readTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Storage blocked. The system preference still applies.
  }
  return "system";
}

export function applyTheme(choice: ThemeChoice): void {
  const dark =
    choice === "dark" ||
    (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Not persisting is acceptable; the choice still applies this visit.
  }
}
