"use client";
import { useT } from "@/lib/i18n";

export default function Done() {
  const t = useT();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="h-12 w-12 rounded-full bg-ok-soft flex items-center justify-center text-ok text-2xl font-bold">
        ✓
      </div>
      <h1 className="mt-6 text-2xl font-bold">{t("done.title")}</h1>
      <p className="mt-2 text-slate-600">{t("done.body")}</p>
    </main>
  );
}
