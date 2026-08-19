"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dictionaries, LANGS, type Dict, type Lang } from "@/lib/i18n/dictionaries";

type Theme = "light" | "dark";

interface PrefsValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  t: Dict;
  locale: string;
  ready: boolean;
}

const LOCALES: Record<Lang, string> = { th: "th-TH", en: "en-GB", zh: "zh-CN" };

const PrefsContext = createContext<PrefsValue | null>(null);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("th");
  const [theme, setThemeState] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedLang = window.localStorage.getItem("nexus.lang") as Lang | null;
    const storedTheme = window.localStorage.getItem("nexus.theme") as Theme | null;
    if (storedLang && (LANGS as readonly string[]).includes(storedLang)) setLangState(storedLang);
    if (storedTheme === "dark" || storedTheme === "light") setThemeState(storedTheme);
    setReady(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.lang = lang;
    root.style.colorScheme = theme;
  }, [theme, lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("nexus.lang", l);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    window.localStorage.setItem("nexus.theme", t);
  }, []);

  const value = useMemo<PrefsValue>(
    () => ({
      lang,
      setLang,
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
      t: dictionaries[lang],
      locale: LOCALES[lang],
      ready,
    }),
    [lang, theme, setLang, setTheme, ready],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return ctx;
}
