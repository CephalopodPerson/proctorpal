"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

interface TestRow {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  updated_at: string;
}

export default function TestsList() {
  const router = useRouter();
  const [tests, setTests] = useState<TestRow[]>([]);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function refresh() {
    const sb = getSupabaseBrowser();
    const { data } = await sb
      .from("tests")
      .select("id,title,status,updated_at")
      .order("updated_at", { ascending: false });
    setTests((data as TestRow[]) ?? []);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    const sb = getSupabaseBrowser();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;
    const { data } = await sb
      .from("tests")
      .insert({ teacher_id: user.id, title: title.trim() })
      .select("id")
      .single();
    setCreating(false);
    if (data) router.push(`/teacher/tests/${data.id}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tests</h1>

      <form onSubmit={create} className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2"
          placeholder="New test title"
        />
        <button
          disabled={creating}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white font-semibold disabled:opacity-60"
        >
          New test
        </button>
      </form>

      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {tests.map((t) => (
          <li key={t.id} className="flex items-center justify-between p-4">
            <Link href={`/teacher/tests/${t.id}`} className="font-medium hover:underline">
              {t.title}
            </Link>
            <span className="text-xs uppercase tracking-wide text-slate-500">{t.status}</span>
          </li>
        ))}
        {tests.length === 0 && (
          <li className="p-6 text-center text-sm text-slate-500">No tests yet.</li>
        )}
      </ul>
    </div>
  );
}
