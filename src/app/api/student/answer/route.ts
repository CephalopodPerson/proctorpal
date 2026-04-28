// PATCH /api/student/answer
// Body: { sessionQuestionId: string, payload: AnswerPayload["data"] }
// Upserts the saved answer. Auto-grading runs at submit time, not here,
// but we update updated_at so the live monitor can show "currently typing".

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getStudentSessionContext } from "@/lib/session-context";

const Body = z.object({
  sessionQuestionId: z.string().uuid(),
  payload: z.any(),
});

export async function PATCH(req: Request) {
  const ctx = await getStudentSessionContext();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parse = Body.safeParse(json);
  if (!parse.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const sb = getSupabaseAdmin();

  // Confirm the session_question belongs to this session — prevents one
  // student writing into another's answer.
  const { data: sq } = await sb
    .from("session_questions")
    .select("id, session_id")
    .eq("id", parse.data.sessionQuestionId)
    .single();
  if (!sq || sq.session_id !== ctx.sid)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Refuse writes if session isn't actively in_progress.
  const { data: session } = await sb
    .from("sessions")
    .select("status")
    .eq("id", ctx.sid)
    .single();
  if (!session || session.status !== "in_progress") {
    return NextResponse.json({ error: "Session not active" }, { status: 409 });
  }

  const { error } = await sb.from("answers").upsert(
    {
      session_question_id: parse.data.sessionQuestionId,
      payload: parse.data.payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_question_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
