import { useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";
export type ThemeSize = 1 | 2 | 3;
export type ThemePalette = "default" | "green" | "blue" | "yellow";

export type ThemeState = {
  mode: ThemeMode;
  size: ThemeSize;
  palette: ThemePalette;
};

const STORAGE_KEY = "prokim-theme";
const EVENT = "theme-change";

export const DEFAULT_THEME: ThemeState = {
  mode: "dark",
  size: 1,
  palette: "default",
};

export function getTheme(): ThemeState {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_THEME, ...parsed };
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(t: ThemeState) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme-mode", t.mode);
  root.setAttribute("data-palette", t.palette);
  root.setAttribute("data-size", String(t.size));
}

export function setTheme(partial: Partial<ThemeState>) {
  if (typeof window === "undefined") return;
  const next = { ...getTheme(), ...partial };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  applyTheme(next);
  window.dispatchEvent(new Event(EVENT));
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeState>(getTheme());

  useEffect(() => {
    setThemeState(getTheme());
    const onChange = () => setThemeState(getTheme());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  return { theme, setTheme };
}
