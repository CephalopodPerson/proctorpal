"use client";

// Compact EN / KO toggle. Drop into any layout.
// Shows the OTHER language as the click target so users see the
// language they'd be switching TO.

import { useLocale } from "@/lib/i18n";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  return (
    <div className={"inline-flex items-center rounded-md border border-slate-200 text-xs font-medium overflow-hidden " + (className ?? "")}>
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={
          "px-2.5 py-1 transition " +
          (locale === "en" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50")
        }
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("ko")}
        aria-pressed={locale === "ko"}
        className={
          "px-2.5 py-1 transition " +
          (locale === "ko" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50")
        }
      >
        한국어
      </button>
    </div>
  );
}
