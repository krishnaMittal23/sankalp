"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <div className="w-full border-t bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} {t("footer.text")}
        </div>
    </div>
  );
}