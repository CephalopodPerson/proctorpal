"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { detectPlatform, isPwaStandalone } from "@/lib/proctor/platform";
import { useT } from "@/lib/i18n";

export default function StudentEntry() {
  const t = useT();
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [studentId, setStudentId] = useState("");
  const [confirm, setConfirm] = useState<{ name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit() {
    setError(null);
    const res = await fetch("/api/student/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessCode,
        studentId,
        platform: detectPlatform(),
        isPwa: isPwaStandalone(),
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Could not start the test");
      return;
    }
    const j = await res.json();
    if (!confirm) {
      setConfirm({ name: j.studentName });
      return;
    }
    startTransition(() => {
      if (j.status === "pending_admit") router.push("/take/waiting");
      else router.push("/take/run");
    });
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-bold">{t("student.startTest")}</h1>
      <p className="mt-1 text-sm text-slate-600">{t("student.entryHelp")}</p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div>
          <label className="text-sm font-medium text-slate-700">{t("student.accessCode")}</label>
          <input
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono uppercase tracking-widest"
            placeholder="ABC-123"
            autoFocus
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">{t("student.studentId")}</label>
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono"
            placeholder="123456"
          />
        </div>

        {confirm && (
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
            {t("student.signingInAs")}{" "}
            <span className="font-semibold">{confirm.name}</span>. {t("student.fixId")}
          </div>
        )}

        {error && <div className="rounded-lg bg-violation-soft p-3 text-sm text-violation">{error}</div>}

        <button
          disabled={pending}
          className="w-full rounded-lg bg-slate-900 py-3 text-white font-semibold disabled:opacity-60"
        >
          {confirm ? t("student.continueToTest") : t("student.confirmIdentity")}
        </button>
      </form>
    </main>
  );
}
