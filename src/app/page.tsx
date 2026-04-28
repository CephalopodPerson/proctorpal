"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function HomePage() {
  const t = useT();
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">{t("home.title")}</h1>
      <p className="mt-3 text-slate-600">{t("home.subtitle")}</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link
          href="/take"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <h2 className="text-xl font-semibold">{t("home.imStudent")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("home.studentBlurb")}</p>
        </Link>

        <Link
          href="/login"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <h2 className="text-xl font-semibold">{t("home.imTeacher")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("home.teacherBlurb")}</p>
        </Link>
      </div>
    </main>
  );
}
