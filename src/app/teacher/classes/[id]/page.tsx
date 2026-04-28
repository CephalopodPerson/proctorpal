"use client";

// Class detail: roster view + CSV import.
// CSV expected header: student_id, display_name, email (optional)
// We accept missing header line: column 1 = id, 2 = name, 3 = email.

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Papa from "papaparse";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { normalizeStudentId } from "@/lib/utils";

interface Student {
  id: string;
  student_id: string;
  display_name: string;
  email: string | null;
}

export default function ClassDetail() {
  const params = useParams<{ id: string }>();
  const classId = params.id;
  const [students, setStudents] = useState<Student[]>([]);
  const [className, setClassName] = useState<string>("");
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const sb = getSupabaseBrowser();
    const [{ data: cls }, { data: rows }] = await Promise.all([
      sb.from("classes").select("name").eq("id", classId).single(),
      sb.from("students").select("*").eq("class_id", classId).order("display_name"),
    ]);
    setClassName(cls?.name ?? "");
    setStudents((rows as Student[]) ?? []);
  }, [classId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
        if (error) setImportMessage(`Import failed: ${error.message}`);
        else setImportMessage(`Imported ${rows.length} students.`);
        refresh();
      },
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{className || "Class"}</h1>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Import roster (CSV)</h2>
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
        {importMessage && (
          <p className="mt-3 text-sm text-slate-700">{importMessage}</p>
        )}
      </div>

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
