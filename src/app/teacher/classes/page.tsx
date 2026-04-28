"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";

interface ClassRow {
  id: string;
  name: string;
  studentCount?: number;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const sb = getSupabaseBrowser();
    const { data: list } = await sb.from("classes").select("id,name").order("created_at");
    if (!list) {
      setClasses([]);
      return;
    }
    // Pull counts in parallel.
    const counts = await Promise.all(
      list.map(async (c) => {
        const { count } = await sb
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("class_id", c.id);
        return { ...c, studentCount: count ?? 0 };
      })
    );
    setClasses(counts);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const sb = getSupabaseBrowser();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;
    await sb.from("classes").insert({ name: name.trim(), teacher_id: user.id });
    setName("");
    setLoading(false);
    refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Classes</h1>

      <form onSubmit={create} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2"
          placeholder="New class name (e.g., Period 3 Biology)"
        />
        <button
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white font-semibold disabled:opacity-60"
        >
          Add
        </button>
      </form>

      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {classes.map((c) => (
          <li key={c.id} className="flex items-center justify-between p-4">
            <Link href={`/teacher/classes/${c.id}`} className="font-medium hover:underline">
              {c.name}
            </Link>
            <span className="text-sm text-slate-500">{c.studentCount ?? 0} students</span>
          </li>
        ))}
        {classes.length === 0 && (
          <li className="p-6 text-center text-sm text-slate-500">No classes yet.</li>
        )}
      </ul>
    </div>
  );
}
