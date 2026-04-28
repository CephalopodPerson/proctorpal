// GET /api/student/session
// Returns the full snapshot needed to render the test page:
//   - session row (status, timing, paused state)
//   - test settings (proctoring flags, results visibility)
//   - the drawn questions in order, with their saved answers
//
// Called on initial load and whenever the page reconnects.

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getStudentSessionContext } from "@/lib/session-context";

export async function GET() {
  const ctx = await getStudentSessionContext();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sb = getSupabaseAdmin();

  const { data: session } = await sb
    .from("sessions")
    .select("*, test_assignments(test_id, tests(*))")
    .eq("id", ctx.sid)
    .single();

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const test = (session as any).test_assignments?.tests;

  const { data: sqs } = await sb
    .from("session_questions")
    .select("id, position, section_id, questions(*)")
    .eq("session_id", ctx.sid)
    .order("position", { ascending: true });

  const sqIds = (sqs ?? []).map((sq: any) => sq.id);
  const { data: answers } = sqIds.length
    ? await sb.from("answers").select("*").in("session_question_id", sqIds)
    : { data: [] as any[] };

  const answersBySq = new Map((answers ?? []).map((a: any) => [a.session_question_id, a]));

  return NextResponse.json({
    session: {
      id: session.id,
      status: session.status,
      started_at: session.started_at,
      duration_seconds_remaining: session.duration_seconds_remaining,
      paused_at: session.paused_at,
      submitted_at: session.submitted_at,
      platform: session.platform,
    },
    test: {
      id: test?.id,
      title: test?.title,
      duration_seconds: test?.duration_seconds,
      require_fullscreen: test?.require_fullscreen,
      block_copy_paste: test?.block_copy_paste,
      detect_focus_loss: test?.detect_focus_loss,
      force_virtual_keyboard_on_touch: test?.force_virtual_keyboard_on_touch,
      results_visibility: test?.results_visibility,
    },
    questions: (sqs ?? []).map((sq: any) => ({
      session_question_id: sq.id,
      position: sq.position,
      section_id: sq.section_id,
      question: sq.questions,
      answer: answersBySq.get(sq.id)?.payload ?? null,
    })),
  });
}
