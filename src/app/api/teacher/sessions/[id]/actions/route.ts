// POST /api/teacher/sessions/[id]/actions
// Body: { action: "admit" | "pause" | "resume" | "add_time" | "release_device" | "void", value?: number }
//
// One endpoint that handles all teacher-side session control. Keeps the
// dashboard JS simple (one fetch helper) and centralizes auth checks.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";
import { seededShuffle } from "@/lib/utils";

const Body = z.object({
  action: z.enum(["admit", "pause", "resume", "add_time", "release_device", "void"]),
  value: z.number().optional(),
});

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parse = Body.safeParse(json);
  if (!parse.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const admin = getSupabaseAdmin();

  // Confirm ownership: load session + assignment + test + teacher_id.
  const { data: row } = await admin
    .from("sessions")
    .select(
      "*, test_assignments(test_id, tests(id, teacher_id, duration_seconds))"
    )
    .eq("id", ctx.params.id)
    .single();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const test = (row as any).test_assignments?.tests;
  if (!test || test.teacher_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();

  switch (parse.data.action) {
    case "admit": {
      if (row.status !== "pending_admit")
        return NextResponse.json({ error: "Not pending" }, { status: 409 });
      // Draw questions for this session, then flip to in_progress.
      await drawQuestions(admin, row.id, test.id);
      await admin
        .from("sessions")
        .update({
          status: "in_progress",
          started_at: now.toISOString(),
        })
        .eq("id", row.id);
      return NextResponse.json({ ok: true });
    }
    case "pause": {
      if (row.status !== "in_progress")
        return NextResponse.json({ error: "Not active" }, { status: 409 });
      const remaining = computeRemaining(row);
      await admin
        .from("sessions")
        .update({
          status: "paused",
          paused_at: now.toISOString(),
          duration_seconds_remaining: remaining,
        })
        .eq("id", row.id);
      return NextResponse.json({ ok: true });
    }
    case "resume": {
      if (row.status !== "paused")
        return NextResponse.json({ error: "Not paused" }, { status: 409 });
      await admin
        .from("sessions")
        .update({
          status: "in_progress",
          started_at: now.toISOString(),
          paused_at: null,
        })
        .eq("id", row.id);
      return NextResponse.json({ ok: true });
    }
    case "add_time": {
      const seconds = parse.data.value ?? 0;
      if (seconds <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      const remaining =
        row.status === "in_progress" ? computeRemaining(row) : row.duration_seconds_remaining;
      await admin
        .from("sessions")
        .update({
          duration_seconds_remaining: remaining + seconds,
          // If currently running, reset started_at so the timer keeps moving from "now".
          started_at: row.status === "in_progress" ? now.toISOString() : row.started_at,
        })
        .eq("id", row.id);
      return NextResponse.json({ ok: true });
    }
    case "release_device": {
      await admin.from("sessions").update({ device_fingerprint: null }).eq("id", row.id);
      return NextResponse.json({ ok: true });
    }
    case "void": {
      await admin.from("sessions").update({ status: "voided" }).eq("id", row.id);
      return NextResponse.json({ ok: true });
    }
  }
}

function computeRemaining(row: { started_at: string | null; duration_seconds_remaining: number }) {
  if (!row.started_at) return row.duration_seconds_remaining;
  const elapsed = (Date.now() - new Date(row.started_at).getTime()) / 1000;
  return Math.max(0, Math.floor(row.duration_seconds_remaining - elapsed));
}

async function drawQuestions(admin: ReturnType<typeof getSupabaseAdmin>, sessionId: string, testId: string) {
  // No-op if already drawn (idempotent admit).
  const { count } = await admin
    .from("session_questions")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if ((count ?? 0) > 0) return;

  const { data: sections } = await admin
    .from("test_sections")
    .select("id, position, draw_count, question_banks(id)")
    .eq("test_id", testId)
    .order("position", { ascending: true });
  if (!sections) return;

  let position = 0;
  for (const sec of sections as any[]) {
    const bank = sec.question_banks?.[0];
    if (!bank) continue;
    const { data: questions } = await admin.from("questions").select("id").eq("bank_id", bank.id);
    if (!questions || questions.length === 0) continue;
    const shuffled = seededShuffle(questions, `${sessionId}:${sec.id}`);
    const drawCount = sec.draw_count ?? shuffled.length;
    const drawn = shuffled.slice(0, drawCount);
    const rows = drawn.map((q) => ({
      session_id: sessionId,
      question_id: q.id,
      section_id: sec.id,
      position: position++,
    }));
    if (rows.length) await admin.from("session_questions").insert(rows);
  }
}
