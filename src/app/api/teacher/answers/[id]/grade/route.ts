// PATCH /api/teacher/answers/[id]/grade
// Body: { manualScore?: number, manualComment?: string }
// Used for the short-answer review queue and long-answer grading.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";

const Body = z.object({
  manualScore: z.number().optional(),
  manualComment: z.string().optional(),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parse = Body.safeParse(json);
  if (!parse.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const admin = getSupabaseAdmin();

  // Confirm the answer belongs to one of this teacher's tests.
  const { data: row } = await admin
    .from("answers")
    .select("session_question_id, session_questions(session_id, sessions(test_assignments(tests(teacher_id))))")
    .eq("session_question_id", ctx.params.id)
    .single();
  const teacherId = (row as any)?.session_questions?.sessions?.test_assignments?.tests?.teacher_id;
  if (!row || teacherId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await admin
    .from("answers")
    .update({
      manual_score: parse.data.manualScore ?? null,
      manual_comment: parse.data.manualComment ?? null,
      graded_by: user.id,
      graded_at: new Date().toISOString(),
    })
    .eq("session_question_id", ctx.params.id);

  return NextResponse.json({ ok: true });
}
