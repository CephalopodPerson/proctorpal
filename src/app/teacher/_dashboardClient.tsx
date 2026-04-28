"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n";

export function TeacherDashboardClient({
  classes,
  tests,
}: {
  classes: Array<{ id: string; name: string }>;
  tests: Array<{ id: string; title: string; status: string }>;
}) {
  const t = useT();
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card title={t("dashboard.classesTitle")} linkLabel={t("dashboard.manageClasses")} href="/teacher/classes">
        {classes.length ? (
          <ul className="divide-y divide-slate-100">
            {classes.map((c) => (
              <li key={c.id} className="py-2">
                <Link href={"/teacher/classes/" + c.id} className="hover:underline">{c.name}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">{t("dashboard.noClasses")}</p>
        )}
      </Card>

      <Card title={t("dashboard.testsTitle")} linkLabel={t("dashboard.manageTests")} href="/teacher/tests">
        {tests.length ? (
          <ul className="divide-y divide-slate-100">
            {tests.map((tt) => (
              <li key={tt.id} className="py-2 flex justify-between">
                <Link href={"/teacher/tests/" + tt.id} className="hover:underline">{tt.title}</Link>
                <span className="text-xs uppercase tracking-wide text-slate-500">{tt.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">{t("dashboard.noTests")}</p>
        )}
      </Card>
    </div>
  );
}

function Card({ title, href, linkLabel, children }: { title: string; href: string; linkLabel: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href={href} className="text-sm text-slate-500 hover:text-slate-900">{linkLabel} →</Link>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
