"use client";
// Client-side nav for the teacher header so it can use the i18n hook.
import Link from "next/link";
import { useT } from "@/lib/i18n";

export function TeacherNav() {
  const t = useT();
  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link href="/teacher/classes" className="hover:underline">{t("nav.classes")}</Link>
      <Link href="/teacher/tests" className="hover:underline">{t("nav.tests")}</Link>
      <form action="/api/teacher/logout" method="post">
        <button className="text-slate-500 hover:text-slate-900">{t("common.signOut")}</button>
      </form>
    </nav>
  );
}
