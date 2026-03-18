"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

export default function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "text-sm"}`}>
      {!compact && <span className="text-muted-foreground">{t("common.language")}</span>}
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
        aria-label={t("common.language")}
      >
        <option value="en">{t("common.english")}</option>
        <option value="hi">{t("common.hindi")}</option>
      </select>
    </div>
  );
}
