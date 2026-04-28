"use client";

// Class detail: roster (with CSV template + import), and assignments panel
// showing every test published to this class with quick links to monitor/grade.

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { normalizeStudentId } from "@/lib/utils";

interface Student {
  id: string;
  student_id: string;
  display_name: string;
  email: string | null;
}

interface AssignmentRow {
  id: string;
  access_code: string;
  is_open: boolean;
  test_id: string;
  test_title: string;
  total: number;
  submitted: number;
}

export default function ClassDetail() {
  const params = useParams<{ id: string }>();
  const classId = params.id;
  const [students, setStudents] = useState<Student[]>([]);
  const [className, setClassName] = useState<string>("");
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const sb = getSupabaseBrowser();
    const [{ data: cls }, { data: rows }, { data: assigns }] = await Promise.all([
      sb.from("classes").select("name").eq("id", classId).single(),
      sb.from("students").select("*").eq("class_id", classId).order("display_name"),
      sb
        .from("test_assignments")
        .select("id, access_code, is_open, test_id, tests(title)")
        .eq("class_id", classId)
        .order("created_at", { ascending: false }),
    ]);
    setClassName(cls?.name ?? "");
    setStudents((rows as Student[]) ?? []);

    // Per-assignment session counts
    const out: AssignmentRow[] = [];
    for (const a of (assigns as any[]) ?? []) {
      const { count: total } = await sb
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("assignment_id", a.id);
      const { count: submitted } = await sb
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("assignment_id", a.id)
        .in("status", ["submitted", "auto_submitted"]);
      out.push({
        id: a.id,
        access_code: a.access_code,
        is_open: a.is_open,
        test_id: a.test_id,
        test_title: a.tests?.title ?? "(unnamed)",
        total: total ?? 0,
        submitted: submitted ?? 0,
      });
    }
    setAssignments(out);
  }, [classId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function downloadTemplate() {
    const csv =
      "student_id,display_name,email\n" +
      "12345,Maria Lopez,maria@example.com\n" +
      "12346,Tom Chen,\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "roster-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const sb = getSupabaseBrowser();
        const rows = (results.data as any[])
          .map((r) => {
            const sid = r.student_id ?? r.id ?? Object.values(r)[0];
            const name = r.display_name ?? r.name ?? Object.values(r)[1];
            const email = r.email ?? Object.values(r)[2] ?? null;
            if (!sid || !name) return null;
            return {
              class_id: classId,
              student_id: normalizeStudentId(String(sid)),
              display_name: String(name).trim(),
              email: email ? String(email).trim() : null,
            };
          })
          .filter(Boolean);
        if (rows.length === 0) {
          setImportMessage("No valid rows found in CSV.");
          return;
        }
        const { error } = await sb
          .from("students")
          .upsert(rows as any[], { onConflict: "class_id,student_id" });
        if (error) setImportMessage("Import failed: " + error.message);
        else setImportMessage("Imported " + rows.length + " students.");
        refresh();
      },
    });
  }

  async function toggleAssignment(a: AssignmentRow) {
    const sb = getSupabaseBrowser();
    await sb
      .from("test_assignments")
      .update({ is_open: !a.is_open })
      .eq("id", a.id);
    refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{className || "Class"}</h1>

      {/* Assignments panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Tests assigned to this class</h2>
        {assignments.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No tests yet. Build a test, then publish it to this class from the test editor.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {assignments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <Link href={"/teacher/tests/" + a.test_id} className="font-medium hover:underline">
                    {a.test_title}
                  </Link>
                  <div className="text-xs text-slate-500">
                    Code: <span className="font-mono font-semibold">{a.access_code}</span>
                    {" - "}
                    {a.submitted}/{a.total} submitted
                    {!a.is_open && <span className="ml-2 text-violation">(closed)</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={"/teacher/tests/" + a.test_id + "/monitor"}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium hover:border-slate-400"
                  >
                    Monitor
                  </Link>
                  <Link
                    href={"/teacher/tests/" + a.test_id + "/grade"}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium hover:border-slate-400"
                  >
                    Grade
                  </Link>
                  <button
                    onClick={() => toggleAssignment(a)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium hover:border-slate-400"
                  >
                    {a.is_open ? "Close" : "Reopen"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Roster import */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Import roster (CSV)</h2>
          <button
            onClick={downloadTemplate}
            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium hover:border-slate-400"
          >
            Download template
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Columns: <code className="font-mono">student_id, display_name, email</code> (email
          optional). Existing students with the same student_id are updated.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="mt-3"
        />
        {importMessage && <p className="mt-3 text-sm text-slate-700">{importMessage}</p>}
      </div>

      {/* Roster list */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4 font-semibold">
          Roster ({students.length})
        </div>
        <ul className="divide-y divide-slate-100">
          {students.map((s) => (
            <li key={s.id} className="flex items-center justify-between p-3 text-sm">
              <span>{s.display_name}</span>
              <span className="font-mono text-slate-500">{s.student_id}</span>
            </li>
          ))}
          {students.length === 0 && (
            <li className="p-6 text-center text-sm text-slate-500">No students yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
