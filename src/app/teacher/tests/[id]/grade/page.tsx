"use client";

// Grading view: list submitted sessions, drill into one, walk question-by-
// question. Auto-grade results are shown; short-answer "needs_review" and
// every long-answer get a manual scoring input. Final publish runs the
// aggregate calculation.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Question } from "@/types";

interface SessionLite {
  id: string;
  status: string;
  student: { display_name: string; student_id: string };
  totalAuto: number;
  needsReview: number;
}

interface AnswerRow {
  session_question_id: string;
  payload: any;
  auto_score: number | null;
  auto_status: string | null;
  manual_score: number | null;
  manual_comment: string | null;
  question: Question;
}

export default function GradePage() {
  const params = useParams<{ id: string }>();
  const testId = params.id;
  const [sessions, setSessions] = useState<SessionLite[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  const refreshSessions = useCallback(async () => {
    const sb = getSupabaseBrowser();
    const { data: assigns } = await sb
      .from("test_assignments")
      .select("id")
      .eq("test_id", testId);
    const ids = (assigns ?? []).map((a) => a.id);
    if (ids.length === 0) return;
    const { data: rows } = await sb
      .from("sessions")
      .select("id, status, students(display_name, student_id)")
      .in("assignment_id", ids)
      .in("status", ["submitted", "auto_submitted"]);

    const out: SessionLite[] = [];
    for (const s of (rows as any[]) ?? []) {
      const { data: sqs } = await sb
        .from("session_questions")
        .select("id, answers!session_question_id(auto_score, auto_status, manual_score)")
        .eq("session_id", s.id);
      let totalAuto = 0;
      let needsReview = 0;
      for (const sq of (sqs as any[]) ?? []) {
        const a = sq.answers?.[0];
        if (!a) continue;
        if (a.manual_score != null) totalAuto += Number(a.manual_score);
        else if (a.auto_score != null) totalAuto += Number(a.auto_score);
        if (a.auto_status === "needs_review" && a.manual_score == null) needsReview++;
      }
      out.push({
        id: s.id,
        status: s.status,
        student: s.students,
        totalAuto,
        needsReview,
      });
    }
    setSessions(out);
  }, [testId]);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const loadSession = useCallback(async (sessionId: string) => {
    setActive(sessionId);
    const sb = getSupabaseBrowser();
    const { data } = await sb
      .from("session_questions")
      .select("id, position, questions(*), answers!session_question_id(*)")
      .eq("session_id", sessionId)
      .order("position");
    const rows: AnswerRow[] = ((data as any[]) ?? []).map((sq) => ({
      session_question_id: sq.id,
      payload: sq.answers?.[0]?.payload ?? null,
      auto_score: sq.answers?.[0]?.auto_score ?? null,
      auto_status: sq.answers?.[0]?.auto_status ?? null,
      manual_score: sq.answers?.[0]?.manual_score ?? null,
      manual_comment: sq.answers?.[0]?.manual_comment ?? null,
      question: sq.questions,
    }));
    setAnswers(rows);
  }, []);

  async function saveManual(answerId: string, manualScore: number | null, manualComment: string | null) {
    await fetch(`/api/teacher/answers/${answerId}/grade`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manualScore, manualComment }),
    });
    if (active) loadSession(active);
    refreshSessions();
  }

  async function publishAll() {
    setPublishMessage(null);
    const r = await fetch(`/api/teacher/tests/${testId}/publish-grades`, { method: "POST" });
    const j = await r.json();
    if (!r.ok) setPublishMessage(j.error ?? "Could not publish");
    else setPublishMessage(`Published ${j.sessionsPublished} grade(s).`);
  }

  return (
    <div className="grid gap-6 md:grid-cols-[260px_1fr]">
      <aside className="space-y-3">
        <Link href={`/teacher/tests/${testId}`} className="text-sm text-slate-500 hover:underline">
          ← Back to test
        </Link>
        <button
          onClick={publishAll}
          className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
        >
          Publish grades
        </button>
        {publishMessage && <p className="text-sm">{publishMessage}</p>}

        <ul className="rounded-2xl border border-slate-200 bg-white">
          {sessions.map((s) => (
            <li
              key={s.id}
              className={`cursor-pointer border-b border-slate-100 p-3 last:border-0 ${
                active === s.id ? "bg-slate-50" : ""
              }`}
              onClick={() => loadSession(s.id)}
            >
              <div className="font-medium text-sm">{s.student.display_name}</div>
              <div className="mt-0.5 text-xs text-slate-500">
                Score: {s.totalAuto.toFixed(1)} {s.needsReview > 0 && (
                  <span className="ml-2 inline-block rounded bg-warn-soft px-1.5 py-0.5 text-warn">
                    {s.needsReview} to review
                  </span>
                )}
              </div>
            </li>
          ))}
          {sessions.length === 0 && (
            <li className="p-4 text-center text-sm text-slate-500">No submissions yet.</li>
          )}
        </ul>
      </aside>

      <main className="space-y-4">
        {!active && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Pick a student to start grading.
          </div>
        )}
        {active &&
          answers.map((a) => (
            <AnswerCard key={a.session_question_id} a={a} onSave={(score, comment) => saveManual(a.session_question_id, score, comment)} />
          ))}
      </main>
    </div>
  );
}

function AnswerCard({
  a,
  onSave,
}: {
  a: AnswerRow;
  onSave: (score: number | null, comment: string | null) => void;
}) {
  const [score, setScore] = useState<string>(
    a.manual_score != null ? String(a.manual_score) : a.auto_score != null ? String(a.auto_score) : ""
  );
  const [comment, setComment] = useState<string>(a.manual_comment ?? "");
  const needsManual =
    a.question.type === "long_answer" || a.auto_status === "needs_review";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500">{a.question.type.replace("_", " ")}</div>
      <div className="mt-1 font-medium whitespace-pre-wrap">{a.question.prompt}</div>

      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-wrap">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Student response</div>
        {renderAnswer(a)}
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm">
        <span className="text-slate-500">Auto:</span>
        <span>{a.auto_score ?? "—"} ({a.auto_status ?? "—"})</span>
        <span className="text-slate-500 ml-4">Worth:</span>
        <span>{a.question.points}</span>
      </div>

      {needsManual && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_auto]">
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="Score"
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            step="0.5"
          />
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comment (optional)"
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
          />
          <button
            onClick={() => onSave(score === "" ? null : Number(score), comment || null)}
            className="rounded-md bg-slate-900 px-3 py-1 text-sm font-semibold text-white"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

function renderAnswer(a: AnswerRow) {
  if (a.payload == null) return <span className="text-slate-400">No answer</span>;
  switch (a.question.type) {
    case "multiple_choice":
      return <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(a.payload, null, 2)}</pre>;
    case "true_false":
      return <span>{a.payload.value === true ? "True" : a.payload.value === false ? "False" : "—"}</span>;
    case "short_answer":
    case "long_answer":
      return <span>{a.payload.value || <span className="text-slate-400">(empty)</span>}</span>;
    case "matching":
    case "ordering":
      return <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(a.payload, null, 2)}</pre>;
    default:
      return <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(a.payload)}</pre>;
  }
}
