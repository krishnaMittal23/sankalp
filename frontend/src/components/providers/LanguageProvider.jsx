"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { translations } from "@/lib/i18n/translations";

const LanguageContext = createContext(null);

function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("nextstep-language") : null;
    const initial = stored === "hi" ? "hi" : "en";
    setLanguage(initial);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nextstep-language", language);
      document.cookie = `nextstep-language=${language}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = (key, fallback = "") => {
    const fromLang = getByPath(translations[language], key);
    if (fromLang !== undefined) return fromLang;
    const fromEn = getByPath(translations.en, key);
    return fromEn !== undefined ? fromEn : fallback;
  };

  const value = useMemo(() => ({ language, setLanguage, t }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
