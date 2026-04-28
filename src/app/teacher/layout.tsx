import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const sb = await getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/teacher" className="font-semibold">ProctorPal</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/teacher/classes" className="hover:underline">Classes</Link>
            <Link href="/teacher/tests" className="hover:underline">Tests</Link>
            <form action="/api/teacher/logout" method="post">
              <button className="text-slate-500 hover:text-slate-900">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
