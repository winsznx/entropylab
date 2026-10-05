import { useEffect, useState } from "react";
import { applyTheme, readTheme, type ThemeChoice } from "../theme.js";
import { Icon, type IconName } from "./Icon.js";

const ORDER: ThemeChoice[] = ["system", "light", "dark"];
const GLYPH: Record<ThemeChoice, IconName> = { system: "monitor", light: "sun", dark: "moon" };
const LABEL: Record<ThemeChoice, string> = {
  system: "Theme: follow system",
  light: "Theme: light",
  dark: "Theme: dark",
};

/** Cycles system, light, dark. Three real options, not a binary with a guess. */
export function ThemeToggle(): JSX.Element {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    setChoice(readTheme());
  }, []);

  // While following the system, a change to the OS setting has to reach the
  // page without a reload.
  useEffect(() => {
    if (choice !== "system") return undefined;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = (): void => applyTheme("system");
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [choice]);

  const next = (): void => {
    const value = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length] as ThemeChoice;
    setChoice(value);
    applyTheme(value);
  };

  return (
    <button
      type="button"
      className="navlink"
      onClick={next}
      aria-label={LABEL[choice]}
      title={LABEL[choice]}
    >
      <Icon name={GLYPH[choice]} size={16} />
    </button>
  );
}
