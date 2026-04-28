"use client";

// Live monitor — realtime view of every active session for this test,
// plus per-student controls (admit, pause, resume, +time, release device).

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/utils";

interface SessionRow {
  id: string;
  status: string;
  started_at: string | null;
  paused_at: string | null;
  duration_seconds_remaining: number;
  submitted_at: string | null;
  student: { id: string; display_name: string; student_id: string };
  violations_count: number;
  answered: number;
  total: number;
}

export default function MonitorPage() {
  const params = useParams<{ id: string }>();
  const testId = params.id;
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [accessCode, setAccessCode] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const sb = getSupabaseBrowser();
    // Pull every session for every assignment of this test.
    const { data: assignments } = await sb
      .from("test_assignments")
      .select("id, access_code, is_open")
      .eq("test_id", testId)
      .eq("is_open", true);
    if (assignments && assignments.length) setAccessCode(assignments[0].access_code);

    const ids = (assignments ?? []).map((a) => a.id);
    if (ids.length === 0) {
      setRows([]);
      return;
    }
    const { data: sessions } = await sb
      .from("sessions")
      .select("*, students(id, display_name, student_id)")
      .in("assignment_id", ids)
      .order("created_at", { ascending: true });

    const out: SessionRow[] = [];
    for (const s of (sessions as any[]) ?? []) {
      const [{ count: vCount }, { data: sqs }, { data: ans }] = await Promise.all([
        sb
          .from("violations")
          .select("id", { count: "exact", head: true })
          .eq("session_id", s.id),
        sb.from("session_questions").select("id").eq("session_id", s.id),
        sb
          .from("answers")
          .select("session_question_id, payload")
          .in("session_question_id", []),
      ]);
      const sqIds = (sqs ?? []).map((x: any) => x.id);
      let answered = 0;
      if (sqIds.length) {
        const { data: a2 } = await sb
          .from("answers")
          .select("session_question_id, payload")
          .in("session_question_id", sqIds);
        answered = (a2 ?? []).filter((a: any) => a.payload != null).length;
      }
      void ans;
      out.push({
        id: s.id,
        status: s.status,
        started_at: s.started_at,
        paused_at: s.paused_at,
        duration_seconds_remaining: s.duration_seconds_remaining,
        submitted_at: s.submitted_at,
        student: s.students,
        violations_count: vCount ?? 0,
        answered,
        total: sqIds.length,
      });
    }
    setRows(out);
  }, [testId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: refresh on any change to sessions/violations/answers
  // for any of our assignments.
  useEffect(() => {
    const sb = getSupabaseBrowser();
    const ch = sb
      .channel(`monitor:${testId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "violations" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "answers" }, () => refresh())
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [testId, refresh]);

  async function act(sessionId: string, action: string, value?: number) {
    await fetch(`/api/teacher/sessions/${sessionId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, value }),
    });
    refresh();
  }

  const counts = useMemo(() => {
    const c = { active: 0, paused: 0, waiting: 0, submitted: 0 };
    for (const r of rows) {
      if (r.status === "in_progress") c.active++;
      else if (r.status === "paused") c.paused++;
      else if (r.status === "pending_admit") c.waiting++;
      else if (r.status === "submitted" || r.status === "auto_submitted") c.submitted++;
    }
    return c;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/teacher/tests/${testId}`} className="text-sm text-slate-500 hover:underline">
          ← Back to test
        </Link>
        {accessCode && (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-mono text-lg">
            Access code: <span className="font-bold tracking-widest">{accessCode}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stat label="Waiting" value={counts.waiting} />
        <Stat label="Active" value={counts.active} />
        <Stat label="Paused" value={counts.paused} />
        <Stat label="Submitted" value={counts.submitted} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-3">Student</th>
              <th className="p-3">Status</th>
              <th className="p-3">Time left</th>
              <th className="p-3">Progress</th>
              <th className="p-3">Violations</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-50">
                <td className="p-3">
                  <div className="font-medium">{r.student?.display_name}</div>
                  <div className="font-mono text-xs text-slate-500">{r.student?.student_id}</div>
                </td>
                <td className="p-3">
                  <StatusBadge s={r.status} />
                </td>
                <td className="p-3 font-mono">
                  {r.status === "in_progress" || r.status === "paused"
                    ? formatDuration(liveRemaining(r))
                    : "—"}
                </td>
                <td className="p-3">
                  {r.total > 0 ? (
                    <span>
                      {r.answered}/{r.total}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3">
                  <span className={r.violations_count > 0 ? "text-violation font-semibold" : ""}>
                    {r.violations_count}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex flex-wrap justify-end gap-1">
                    {r.status === "pending_admit" && (
                      <Btn onClick={() => act(r.id, "admit")}>Admit</Btn>
                    )}
                    {r.status === "in_progress" && (
                      <Btn onClick={() => act(r.id, "pause")}>Pause</Btn>
                    )}
                    {r.status === "paused" && (
                      <Btn onClick={() => act(r.id, "resume")} variant="primary">
                        Resume
                      </Btn>
                    )}
                    {(r.status === "in_progress" || r.status === "paused") && (
                      <>
                        <Btn onClick={() => act(r.id, "add_time", 60)}>+1m</Btn>
                        <Btn onClick={() => act(r.id, "add_time", 300)}>+5m</Btn>
                      </>
                    )}
                    <Btn onClick={() => act(r.id, "release_device")}>Unlock device</Btn>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-slate-500">
                  No sessions yet. Share the access code with your class.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    in_progress: "bg-ok-soft text-ok",
    paused: "bg-warn-soft text-warn",
    pending_admit: "bg-slate-100 text-slate-700",
    submitted: "bg-slate-100 text-slate-700",
    auto_submitted: "bg-slate-100 text-slate-700",
    voided: "bg-violation-soft text-violation",
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${map[s] ?? "bg-slate-100"}`}>
      {s.replace("_", " ")}
    </span>
  );
}

function Btn({
  children,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary";
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-md border px-2 py-1 text-xs font-medium",
        variant === "primary"
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white hover:border-slate-400",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function liveRemaining(r: { started_at: string | null; duration_seconds_remaining: number; paused_at: string | null; status: string }) {
  if (r.status !== "in_progress" || !r.started_at) return r.duration_seconds_remaining;
  const elapsed = (Date.now() - new Date(r.started_at).getTime()) / 1000;
  return Math.max(0, Math.floor(r.duration_seconds_remaining - elapsed));
}
