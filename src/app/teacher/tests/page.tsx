"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
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
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { data } = await sb
      .from("tests")
      .insert({ teacher_id: user.id, title: title.trim() })
      .select("id")
      .single();
    setCreating(false);
    if (data) router.push("/teacher/tests/" + (data as { id: string }).id);
  }

  function downloadJsonTemplate() {
    const example = {
      title: "Sample Quiz",
      description: "Example test you can edit",
      duration_minutes: 30,
      sections: [
        {
          title: "Multiple Choice",
          draw_count: null,
          instructions: "Pick the best answer.",
          questions: [
            {
              type: "multiple_choice",
              prompt: "What is 2 + 2?",
              points: 1,
              options: [
                { id: "a", text: "3" },
                { id: "b", text: "4" },
                { id: "c", text: "5" },
              ],
              correct: ["b"],
              multi_select: false,
            },
            {
              type: "true_false",
              prompt: "The Earth is round.",
              points: 1,
              correct: true,
            },
            {
              type: "short_answer",
              prompt: "What is H2O?",
              points: 1,
              accepts: [{ value: "water", mode: "ci" }],
            },
            {
              type: "long_answer",
              prompt: "Describe the water cycle.",
              points: 5,
              rubric: "Mention evaporation, condensation, precipitation.",
            },
            {
              type: "matching",
              prompt: "Match the items to their categories.",
              points: 2,
              left: [
                { id: "l1", text: "Apple" },
                { id: "l2", text: "Carrot" },
              ],
              right: [
                { id: "r1", text: "Fruit" },
                { id: "r2", text: "Vegetable" },
              ],
              pairs: [["l1", "r1"], ["l2", "r2"]],
            },
            {
              type: "ordering",
              prompt: "Put these in chronological order.",
              points: 2,
              items: [
                { id: "i1", text: "Sunrise" },
                { id: "i2", text: "Noon" },
                { id: "i3", text: "Sunset" },
              ],
              correct_order: ["i1", "i2", "i3"],
            },
          ],
        },
      ],
    };
    download("test-template.json", JSON.stringify(example, null, 2), "application/json");
  }

  function downloadCsvTemplate() {
    const csv =
      'section,type,prompt,points,option_a,option_b,option_c,option_d,correct,image_url,youtube_id\n' +
      '"Section 1",multiple_choice,"What is 2+2?",1,"3","4","5","6","b",,\n' +
      '"Section 1",true_false,"The Earth is round.",1,,,,,"true",,\n' +
      '"Section 1",short_answer,"What is H2O?",1,"water",,,,,,\n' +
      '"Section 1",long_answer,"Describe the water cycle.",5,,,,,,,\n';
    download("test-template.csv", csv, "text/csv");
  }

  function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    setImportMessage("Reading file...");
    const text = await file.text();
    let testJson: unknown;
    if (file.name.toLowerCase().endsWith(".csv")) {
      testJson = csvToTest(text);
    } else {
      try {
        testJson = JSON.parse(text);
      } catch {
        setImportMessage("Invalid JSON file.");
        return;
      }
    }
    setImportMessage("Importing...");
    const r = await fetch("/api/teacher/tests/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: testJson }),
    });
    const j = await r.json();
    if (!r.ok) {
      setImportMessage("Import failed: " + (j.error ?? "unknown"));
      return;
    }
    setImportMessage("Imported. Redirecting to editor...");
    router.push("/teacher/tests/" + j.testId);
  }

  function csvToTest(csv: string) {
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
    const rows = parsed.data as any[];
    // Group by section name (column "section").
    const sectionsMap = new Map<string, any[]>();
    for (const r of rows) {
      const sec = (r.section ?? "Section 1").trim();
      if (!sectionsMap.has(sec)) sectionsMap.set(sec, []);
      sectionsMap.get(sec)!.push(r);
    }
    const sections: any[] = [];
    for (const [secName, secRows] of sectionsMap) {
      const questions = secRows.map((r: any) => csvRowToQuestion(r));
      sections.push({ title: secName, draw_count: null, questions });
    }
    return {
      title: "Imported test",
      duration_minutes: 30,
      sections,
    };
  }

  function csvRowToQuestion(r: any) {
    const type = (r.type ?? "multiple_choice").trim();
    const prompt = r.prompt ?? "";
    const points = Number(r.points ?? 1);
    const image_url = r.image_url || null;
    const youtube_id = r.youtube_id || null;
    const base = { type, prompt, points, image_url, youtube_id };

    if (type === "multiple_choice") {
      const opts: { id: string; text: string }[] = [];
      const letters = ["a", "b", "c", "d", "e", "f"];
      for (const L of letters) {
        const v = r["option_" + L];
        if (v && String(v).trim()) opts.push({ id: L, text: String(v).trim() });
      }
      const correct = String(r.correct ?? "").trim().toLowerCase();
      return { ...base, options: opts, correct: correct ? [correct] : [], multi_select: false };
    }
    if (type === "true_false") {
      return { ...base, correct: String(r.correct ?? "").trim().toLowerCase() === "true" };
    }
    if (type === "short_answer") {
      const v = String(r.option_a ?? r.correct ?? "").trim();
      return { ...base, accepts: v ? [{ value: v, mode: "ci" as const }] : [] };
    }
    if (type === "long_answer") {
      return { ...base, rubric: "" };
    }
    return base;
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Import existing test</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload a JSON file (full structure, all 6 question types) or a CSV
          (one question per row, MC/TF/short/long only).
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:border-slate-400"
          >
            Choose file...
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <button
            onClick={downloadJsonTemplate}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:border-slate-400"
          >
            Download JSON template
          </button>
          <button
            onClick={downloadCsvTemplate}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:border-slate-400"
          >
            Download CSV template
          </button>
        </div>
        {importMessage && <p className="mt-3 text-sm text-slate-700">{importMessage}</p>}
      </div>

      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {tests.map((t) => (
          <li key={t.id} className="flex items-center justify-between p-4">
            <Link href={"/teacher/tests/" + t.id} className="font-medium hover:underline">
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
