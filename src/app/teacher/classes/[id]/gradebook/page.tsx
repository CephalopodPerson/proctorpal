"use client";

// Per-class gradebook. Students x tests grid, plus a per-student average
// across all published grades. CSV export for plugging into your gradebook.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";

interface Student {
  id: string;
  student_id: string;
  display_name: string;
}

interface TestCol {
  test_id: string;
  test_title: string;
  assignment_id: string;
}

// Score state per (student, test):
//   - "none": no session for this student on this test
//   - "in_progress" | "paused" | "pending_admit"
//   - "submitted_ungraded": submitted but no published grade yet
//   - { score, possible }: published grade
type Cell =
  | { kind: "none" }
  | { kind: "status"; status: string }
  | { kind: "submitted_ungraded" }
  | { kind: "graded"; score: number; possible: number };

export default function Gradebook() {
  const params = useParams<{ id: string }>();
  const classId = params.id;
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [tests, setTests] = useState<TestCol[]>([]);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [loading, setLoading] = useState(true);

  const cellKey = (sid: string, tid: string) => sid + "::" + tid;

  const refresh = useCallback(async () => {
    setLoading(true);
    const sb = getSupabaseBrowser();
    const [{ data: cls }, { data: studs }, { data: assigns }] = await Promise.all([
      sb.from("classes").select("name").eq("id", classId).single(),
      sb
        .from("students")
        .select("id, student_id, display_name")
        .eq("class_id", classId)
        .order("display_name"),
      sb
        .from("test_assignments")
        .select("id, test_id, tests(title)")
        .eq("class_id", classId)
        .order("created_at", { ascending: true }),
    ]);

    setClassName(cls?.name ?? "");
    const studList = (studs as Student[]) ?? [];
    setStudents(studList);

    const testList = ((assigns as any[]) ?? []).map((a) => ({
      assignment_id: a.id,
      test_id: a.test_id,
      test_title: a.tests?.title ?? "(unnamed)",
    })) as TestCol[];
    setTests(testList);

    // For each assignment, pull all sessions + grades and build cells.
    const c: Record<string, Cell> = {};
    for (const stud of studList) {
      for (const t of testList) {
        c[cellKey(stud.id, t.test_id)] = { kind: "none" };
      }
    }
    for (const t of testList) {
      const { data: sessions } = await sb
        .from("sessions")
        .select("id, status, student_id, grades(total_score, total_possible)")
        .eq("assignment_id", t.assignment_id);
      for (const s of (sessions as any[]) ?? []) {
        const k = cellKey(s.student_id, t.test_id);
        const grade = s.grades?.[0];
        if (grade) {
          c[k] = {
            kind: "graded",
            score: Number(grade.total_score),
            possible: Number(grade.total_possible),
          };
        } else if (s.status === "submitted" || s.status === "auto_submitted") {
          c[k] = { kind: "submitted_ungraded" };
        } else {
          c[k] = { kind: "status", status: s.status };
        }
      }
    }
    setCells(c);
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const averages = useMemo(() => {
    const out: Record<string, { pct: number; n: number } | null> = {};
    for (const s of students) {
      let totalScore = 0;
      let totalPossible = 0;
      let n = 0;
      for (const t of tests) {
        const c = cells[cellKey(s.id, t.test_id)];
        if (c?.kind === "graded") {
          totalScore += c.score;
          totalPossible += c.possible;
          n++;
        }
      }
      out[s.id] = totalPossible > 0 ? { pct: (totalScore / totalPossible) * 100, n } : null;
    }
    return out;
  }, [students, tests, cells]);

  function exportCsv() {
    const headers = ["student_id", "display_name", ...tests.map((t) => t.test_title), "average_pct"];
    const lines = [headers.join(",")];
    for (const s of students) {
      const row: string[] = [s.student_id, csvEscape(s.display_name)];
      for (const t of tests) {
        const c = cells[cellKey(s.id, t.test_id)];
        if (c?.kind === "graded") {
          row.push(c.score + "/" + c.possible);
        } else if (c?.kind === "submitted_ungraded") {
          row.push("ungraded");
        } else if (c?.kind === "status") {
          row.push(c.status);
        } else {
          row.push("");
        }
      }
      const avg = averages[s.id];
      row.push(avg ? avg.pct.toFixed(1) : "");
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gradebook-" + (className.replace(/[^a-z0-9]/gi, "_") || "class") + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="p-6 text-slate-500">Loading gradebook...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={"/teacher/classes/" + classId}
            className="text-sm text-slate-500 hover:underline"
          >
            &larr; Back to class
          </Link>
          <h1 className="text-2xl font-bold mt-1">{className} - Gradebook</h1>
        </div>
        <button
          onClick={exportCsv}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:border-slate-400"
        >
          Export CSV
        </button>
      </div>

      {tests.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
          No tests assigned to this class yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="sticky left-0 bg-white p-3 z-10">Student</th>
                {tests.map((t) => (
                  <th key={t.test_id} className="p-3 whitespace-nowrap">
                    <Link href={"/teacher/tests/" + t.test_id + "/grade"} className="hover:underline">
                      {t.test_title}
                    </Link>
                  </th>
                ))}
                <th className="p-3 whitespace-nowrap text-right">Avg %</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-slate-50">
                  <td className="sticky left-0 bg-white p-3">
                    <div className="font-medium">{s.display_name}</div>
                    <div className="font-mono text-xs text-slate-500">{s.student_id}</div>
                  </td>
                  {tests.map((t) => {
                    const c = cells[cellKey(s.id, t.test_id)];
                    return (
                      <td key={t.test_id} className="p-3 whitespace-nowrap">
                        <CellView c={c} />
                      </td>
                    );
                  })}
                  <td className="p-3 text-right font-mono">
                    {averages[s.id] ? averages[s.id]!.pct.toFixed(1) + "%" : "-"}
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={tests.length + 2} className="p-6 text-center text-slate-500">
                    No students in this class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Cells: <span className="font-mono">12/15</span> = published score, <span className="text-warn">ungraded</span> = submitted but not published, <span className="text-slate-500">in progress / paused</span> = active session, &mdash; = no session yet.
      </p>
    </div>
  );
}

function CellView({ c }: { c: Cell | undefined }) {
  if (!c || c.kind === "none") return <span className="text-slate-300">&mdash;</span>;
  if (c.kind === "graded") {
    const pct = c.possible > 0 ? (c.score / c.possible) * 100 : 0;
    return (
      <span className="font-mono">
        {c.score}/{c.possible}{" "}
        <span className="text-xs text-slate-500">({pct.toFixed(0)}%)</span>
      </span>
    );
  }
  if (c.kind === "submitted_ungraded") {
    return <span className="text-warn text-xs">ungraded</span>;
  }
  return <span className="text-xs text-slate-500">{c.status.replace("_", " ")}</span>;
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
