// POST /api/student/submit
// Marks the session submitted, runs the auto-grader on every answer,
// and writes auto_score / auto_status. Final published grade is computed
// later by the teacher from the grading dashboard.

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getStudentSessionContext } from "@/lib/session-context";
import { gradeAnswer } from "@/lib/grading/auto";
import type { Question } from "@/types";

export async function POST() {
  const ctx = await getStudentSessionContext();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sb = getSupabaseAdmin();

  const { data: session } = await sb
    .from("sessions")
    .select("status")
    .eq("id", ctx.sid)
    .single();
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.status === "submitted" || session.status === "auto_submitted") {
    return NextResponse.json({ ok: true, alreadySubmitted: true });
  }

  // Pull every session_question + question + answer for this session.
  const { data: rows } = await sb
    .from("session_questions")
    .select("id, questions(*), answers!session_question_id(*)")
    .eq("session_id", ctx.sid);

  const updates: Array<{ session_question_id: string; auto_score: number; auto_status: string | null }> = [];
  for (const row of (rows ?? []) as any[]) {
    const q: Question = row.questions;
    const a = row.answers?.[0];
    const result = gradeAnswer(q, a?.payload ?? null);
    updates.push({
      session_question_id: row.id,
      auto_score: result.score,
      auto_status: result.status,
    });
  }

  // Upsert auto-grade results.
  for (const u of updates) {
    await sb
      .from("answers")
      .upsert(
        { session_question_id: u.session_question_id, auto_score: u.auto_score, auto_status: u.auto_status },
        { onConflict: "session_question_id" }
      );
  }

  await sb
    .from("sessions")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", ctx.sid);

  return NextResponse.json({ ok: true });
}
