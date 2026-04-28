// POST /api/teacher/tests/[id]/publish-grades
// For every submitted session of this test, sums (manual_score ?? auto_score)
// across all answers and writes a grades row. Idempotent.

import { NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();

  // Confirm test ownership.
  const { data: test } = await admin
    .from("tests")
    .select("id,teacher_id")
    .eq("id", ctx.params.id)
    .single();
  if (!test || test.teacher_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Pull every submitted session.
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, status, test_assignments!inner(test_id)")
    .eq("test_assignments.test_id", ctx.params.id)
    .in("status", ["submitted", "auto_submitted"]);

  let count = 0;
  for (const s of (sessions as any[]) ?? []) {
    const { data: rows } = await admin
      .from("session_questions")
      .select("id, questions(points), answers!session_question_id(auto_score, manual_score)")
      .eq("session_id", s.id);
    let total = 0;
    let possible = 0;
    for (const r of (rows as any[]) ?? []) {
      possible += Number(r.questions?.points ?? 0);
      const a = r.answers?.[0];
      if (!a) continue;
      const score = a.manual_score ?? a.auto_score ?? 0;
      total += Number(score);
    }
    await admin.from("grades").upsert({
      session_id: s.id,
      total_score: total,
      total_possible: possible,
      published_at: new Date().toISOString(),
    });
    count++;
  }

  return NextResponse.json({ ok: true, sessionsPublished: count });
}
