import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";

export default async function TeacherDashboard() {
  const sb = getSupabaseServer();
  const [{ data: classes }, { data: tests }] = await Promise.all([
    sb.from("classes").select("id,name").order("created_at", { ascending: false }).limit(5),
    sb.from("tests").select("id,title,status,updated_at").order("updated_at", { ascending: false }).limit(5),
  ]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card title="Classes" linkLabel="Manage classes" href="/teacher/classes">
        {classes && classes.length ? (
          <ul className="divide-y divide-slate-100">
            {classes.map((c) => (
              <li key={c.id} className="py-2">
                <Link href={`/teacher/classes/${c.id}`} className="hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No classes yet. Create one to import your roster.</p>
        )}
      </Card>

      <Card title="Tests" linkLabel="Manage tests" href="/teacher/tests">
        {tests && tests.length ? (
          <ul className="divide-y divide-slate-100">
            {tests.map((t) => (
              <li key={t.id} className="py-2 flex justify-between">
                <Link href={`/teacher/tests/${t.id}`} className="hover:underline">
                  {t.title}
                </Link>
                <span className="text-xs uppercase tracking-wide text-slate-500">{t.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No tests yet.</p>
        )}
      </Card>
    </div>
  );
}

function Card({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href={href} className="text-sm text-slate-500 hover:text-slate-900">
          {linkLabel} →
        </Link>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
