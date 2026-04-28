// POST /api/student/start
// Body: { accessCode: string, studentId: string, platform, isPwa }
// Validates roster, finds-or-creates a session, sets a signed token cookie,
// returns the session shape for the entry/waiting flow.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { signSessionToken, deviceFingerprintFromHeaders } from "@/lib/session-token";
import { normalizeStudentId, seededShuffle } from "@/lib/utils";

const Body = z.object({
  accessCode: z.string().min(3),
  studentId: z.string().min(1),
  platform: z.string().optional(),
  isPwa: z.boolean().optional(),
});

const SESSION_COOKIE = "pt_session";
const TOKEN_TTL_HOURS = 6;

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parse = Body.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { accessCode, studentId, platform, isPwa } = parse.data;
  const code = accessCode.trim().toUpperCase();
  const sid = normalizeStudentId(studentId);

  const sb = getSupabaseAdmin();

  // 1. Resolve assignment by access code.
  const { data: assignment } = await sb
    .from("test_assignments")
    .select("id, test_id, class_id, is_open, opens_at, closes_at, tests(id,duration_seconds,require_teacher_admit)")
    .eq("access_code", code)
    .eq("is_open", true)
    .single();

  if (!assignment) {
    return NextResponse.json({ error: "Invalid access code" }, { status: 404 });
  }

  const now = new Date();
  if (assignment.opens_at && new Date(assignment.opens_at) > now) {
    return NextResponse.json({ error: "This test isn't open yet" }, { status: 403 });
  }
  if (assignment.closes_at && new Date(assignment.closes_at) < now) {
    return NextResponse.json({ error: "This test has closed" }, { status: 403 });
  }

  // 2. Look up student in this class.
  const { data: student } = await sb
    .from("students")
    .select("id, display_name")
    .eq("class_id", assignment.class_id)
    .eq("student_id", sid)
    .single();

  if (!student) {
    return NextResponse.json(
      { error: "Student ID not found on the roster for this test" },
      { status: 404 }
    );
  }

  // 3. Find existing session, or create.
  const { data: existing } = await sb
    .from("sessions")
    .select("*")
    .eq("assignment_id", assignment.id)
    .eq("student_id", student.id)
    .maybeSingle();

  const test = (assignment as any).tests;
  const userAgent = req.headers.get("user-agent") ?? "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
  const fingerprint = deviceFingerprintFromHeaders(userAgent, ip);

  let session: any = existing;
  if (!session) {
    const initStatus = test.require_teacher_admit ? "pending_admit" : "in_progress";
    const startedAt = initStatus === "in_progress" ? now.toISOString() : null;

    const { data: created, error: insErr } = await sb
      .from("sessions")
      .insert({
        assignment_id: assignment.id,
        student_id: student.id,
        status: initStatus,
        started_at: startedAt,
        duration_seconds_remaining: test.duration_seconds,
        device_fingerprint: fingerprint,
        platform: platform ?? null,
        is_pwa_standalone: isPwa ?? null,
      })
      .select("*")
      .single();
    if (insErr || !created) {
      return NextResponse.json({ error: insErr?.message ?? "Failed to create session" }, { status: 500 });
    }
    session = created;

    // If immediately in_progress, draw questions now. Otherwise we draw at admit time.
    if (initStatus === "in_progress") {
      await drawQuestionsForSession(session.id, assignment.test_id, student.id);
    }
  } else {
    // One-device lock: if a fingerprint is set and doesn't match, reject.
    if (
      session.device_fingerprint &&
      session.device_fingerprint !== fingerprint &&
      session.status !== "submitted" &&
      session.status !== "voided"
    ) {
      return NextResponse.json(
        {
          error:
            "This test was started on a different device. Ask your teacher to release the device lock.",
        },
        { status: 409 }
      );
    }
    if (session.status === "submitted" || session.status === "auto_submitted") {
      return NextResponse.json({ error: "You've already submitted this test." }, { status: 409 });
    }
  }

  // 4. Issue token.
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_HOURS * 3600;
  const token = await signSessionToken({
    sid: session.id,
    aid: assignment.id,
    iat: Math.floor(Date.now() / 1000),
    exp,
    fp: fingerprint,
  });

  const res = NextResponse.json({
    sessionId: session.id,
    studentName: student.display_name,
    status: session.status,
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TOKEN_TTL_HOURS * 3600,
    path: "/",
  });
  return res;
}

async function drawQuestionsForSession(sessionId: string, testId: string, studentId: string) {
  const sb = getSupabaseAdmin();
  const { data: sections } = await sb
    .from("test_sections")
    .select("id, position, draw_count, question_banks(id)")
    .eq("test_id", testId)
    .order("position", { ascending: true });

  if (!sections) return;

  let position = 0;
  for (const sec of sections as any[]) {
    const bank = sec.question_banks?.[0];
    if (!bank) continue;
    const { data: questions } = await sb
      .from("questions")
      .select("id")
      .eq("bank_id", bank.id);
    if (!questions || questions.length === 0) continue;

    // Seeded shuffle so reconnects are deterministic per student per session.
    const shuffled = seededShuffle(questions, `${sessionId}:${sec.id}`);
    const drawCount = sec.draw_count ?? shuffled.length;
    const drawn = shuffled.slice(0, drawCount);

    const rows = drawn.map((q) => ({
      session_id: sessionId,
      question_id: q.id,
      section_id: sec.id,
      position: position++,
    }));
    if (rows.length > 0) {
      await sb.from("session_questions").insert(rows);
    }
  }
  // studentId param kept for future per-student variants if we ever want them.
  void studentId;
}
