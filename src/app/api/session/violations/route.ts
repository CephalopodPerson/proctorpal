// POST /api/session/violations
// Body: { violations: [{ type, details?, pauseSession, occurredAt }] }
// Records proctoring events. If any item has pauseSession=true, marks
// the session paused and stores remaining time.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getStudentSessionContext } from "@/lib/session-context";

const Item = z.object({
  type: z.string(),
  details: z.record(z.any()).optional(),
  pauseSession: z.boolean(),
  occurredAt: z.number(),
});
const Body = z.object({ violations: z.array(Item).min(1).max(100) });

export async function POST(req: Request) {
  const ctx = await getStudentSessionContext();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parse = Body.safeParse(json);
  if (!parse.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const sb = getSupabaseAdmin();

  const rows = parse.data.violations.map((v) => ({
    session_id: ctx.sid,
    type: v.type,
    details: v.details ?? null,
    paused_session: v.pauseSession,
    occurred_at: new Date(v.occurredAt).toISOString(),
  }));

  const { error: insErr } = await sb.from("violations").insert(rows);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  // If any of these should pause, do so once.
  if (rows.some((r) => r.paused_session)) {
    const { data: session } = await sb
      .from("sessions")
      .select("status, started_at, duration_seconds_remaining")
      .eq("id", ctx.sid)
      .single();
    if (session && session.status === "in_progress") {
      const remaining = computeRemaining(session);
      await sb
        .from("sessions")
        .update({
          status: "paused",
          paused_at: new Date().toISOString(),
          duration_seconds_remaining: remaining,
        })
        .eq("id", ctx.sid);
    }
  }

  return NextResponse.json({ ok: true });
}

function computeRemaining(session: { started_at: string | null; duration_seconds_remaining: number }) {
  if (!session.started_at) return session.duration_seconds_remaining;
  const elapsed = (Date.now() - new Date(session.started_at).getTime()) / 1000;
  return Math.max(0, Math.floor(session.duration_seconds_remaining - elapsed));
}
