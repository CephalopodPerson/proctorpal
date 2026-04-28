"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { normalizeStudentId } from "@/lib/utils";
import { useT } from "@/lib/i18n";

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
  const t = useT();
  const params = useParams<{ id: string }>();
  const classId = params.id;
  const [students, setStudents] = useState<Student[]>([]);
  const [className, setClassName] = useState<string>("");
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

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

  async function addOne(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    const sid = normalizeStudentId(newId);
    const name = newName.trim();
    if (!sid || !name) {
      setAddError(t("classDetail.idAndNameRequired"));
      return;
    }
    const sb = getSupabaseBrowser();
    const { error } = await sb.from("students").insert({
      class_id: classId,
      student_id: sid,
      display_name: name,
      email: newEmail.trim() || null,
    });
    if (error) {
      setAddError(error.message.includes("duplicate") ? t("classDetail.duplicateId") : error.message);
      return;
    }
    setNewId("");
    setNewName("");
    setNewEmail("");
    refresh();
  }

  async function removeStudent(id: string) {
    if (!confirm(t("classDetail.confirmRemove"))) return;
    const sb = getSupabaseBrowser();
    await sb.from("students").delete().eq("id", id);
    refresh();
  }

  function downloadTemplate() {
    const csv =
      "student_id,display_name,email\n" +
      "12345,Maria Lopez,maria@example.com\n" +
      "12346,Tom Chen,\n";
    download("roster-template.csv", csv, "text/csv");
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
          setImportMessage(t("classDetail.noValidRows"));
          return;
        }
        const { error } = await sb
          .from("students")
          .upsert(rows as any[], { onConflict: "class_id,student_id" });
        if (error) setImportMessage(t("classDetail.importFailed", { msg: error.message }));
        else setImportMessage(t("classDetail.importedN", { n: rows.length }));
        refresh();
      },
    });
  }

  async function toggleAssignment(a: AssignmentRow) {
    const sb = getSupabaseBrowser();
    await sb.from("test_assignments").update({ is_open: !a.is_open }).eq("id", a.id);
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{className || t("nav.classes")}</h1>
        <Link
          href={"/teacher/classes/" + classId + "/gradebook"}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:border-slate-400"
        >
          {t("classDetail.gradebookLink")} &rarr;
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">{t("classDetail.assignmentsTitle")}</h2>
        {assignments.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">{t("classDetail.noAssignments")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {assignments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <Link href={"/teacher/tests/" + a.test_id} className="font-medium hover:underline">
                    {a.test_title}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {t("classDetail.code")}: <span className="font-mono font-semibold">{a.access_code}</span>
                    {" - "}
                    {t("classDetail.submittedOf", { a: a.submitted, b: a.total })}
                    {!a.is_open && <span className="ml-2 text-violation">{t("classDetail.closed")}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={"/teacher/tests/" + a.test_id + "/monitor"}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium hover:border-slate-400"
                  >
                    {t("classDetail.monitor")}
                  </Link>
                  <Link
                    href={"/teacher/tests/" + a.test_id + "/grade"}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium hover:border-slate-400"
                  >
                    {t("classDetail.grade")}
                  </Link>
                  <button
                    onClick={() => toggleAssignment(a)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium hover:border-slate-400"
                  >
                    {a.is_open ? t("common.close") : t("common.reopen")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">{t("classDetail.addStudent")}</h2>
        <form onSubmit={addOne} className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr_2fr_auto]">
          <input
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            placeholder={t("classDetail.idPlaceholder")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("classDetail.namePlaceholder")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder={t("classDetail.emailPlaceholder")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            type="email"
          />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            {t("common.add")}
          </button>
        </form>
        {addError && <p className="mt-2 text-sm text-violation">{addError}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">{t("classDetail.bulkImport")}</h2>
          <button
            onClick={downloadTemplate}
            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium hover:border-slate-400"
          >
            {t("classDetail.downloadTemplate")}
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">{t("classDetail.csvHelp")}</p>
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

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4 font-semibold">
          {t("classDetail.rosterCount", { n: students.length })}
        </div>
        <ul className="divide-y divide-slate-100">
          {students.map((s) => (
            <li key={s.id} className="flex items-center justify-between p-3 text-sm gap-2">
              <div className="flex-1">
                <span>{s.display_name}</span>
                {s.email && <span className="ml-2 text-xs text-slate-400">{s.email}</span>}
              </div>
              <span className="font-mono text-slate-500">{s.student_id}</span>
              <button
                onClick={() => removeStudent(s.id)}
                className="text-xs text-slate-400 hover:text-violation"
              >
                {t("common.remove")}
              </button>
            </li>
          ))}
          {students.length === 0 && (
            <li className="p-6 text-center text-sm text-slate-500">{t("classDetail.rosterEmpty")}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
