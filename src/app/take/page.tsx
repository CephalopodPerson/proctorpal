"use client";

// Student entry: enter access code + student ID. After validation, the
// server returns either "pending_admit" (waiting room) or "in_progress"
// (jump straight to the test).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { detectPlatform, isPwaStandalone } from "@/lib/proctor/platform";

export default function StudentEntry() {
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
      <h1 className="text-2xl font-bold">Start a test</h1>
      <p className="mt-1 text-sm text-slate-600">
        Enter the access code your teacher gave you, then your student ID.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div>
          <label className="text-sm font-medium text-slate-700">Access code</label>
          <input
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono uppercase tracking-widest"
            placeholder="ABC-123"
            autoFocus
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Student ID</label>
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono"
            placeholder="e.g. 123456"
          />
        </div>

        {confirm && (
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
            You&apos;re signing in as <span className="font-semibold">{confirm.name}</span>. If
            this is wrong, fix your student ID before continuing.
          </div>
        )}

        {error && <div className="rounded-lg bg-violation-soft p-3 text-sm text-violation">{error}</div>}

        <button
          disabled={pending}
          className="w-full rounded-lg bg-slate-900 py-3 text-white font-semibold disabled:opacity-60"
        >
          {confirm ? "Continue to test" : "Confirm identity"}
        </button>
      </form>
    </main>
  );
}
