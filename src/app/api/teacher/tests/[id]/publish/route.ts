// POST /api/teacher/tests/[id]/publish
// Body: { classId: string }
// Generates a unique access code, creates a test_assignment, sets the test
// status to "published". Returns the access code so the teacher can share.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { generateAccessCode } from "@/lib/utils";

const Body = z.object({ classId: z.string().uuid() });

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const sb = getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parse = Body.safeParse(json);
  if (!parse.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Confirm test belongs to this teacher.
  const { data: test } = await sb
    .from("tests")
    .select("id,teacher_id")
    .eq("id", ctx.params.id)
    .single();
  if (!test || test.teacher_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Confirm class belongs to this teacher.
  const { data: cls } = await sb
    .from("classes")
    .select("id,teacher_id")
    .eq("id", parse.data.classId)
    .single();
  if (!cls || cls.teacher_id !== user.id)
    return NextResponse.json({ error: "Class not yours" }, { status: 403 });

  // Try a few codes until we land an unused one.
  for (let i = 0; i < 8; i++) {
    const code = generateAccessCode();
    const { data: ins, error } = await sb
      .from("test_assignments")
      .insert({
        test_id: ctx.params.id,
        class_id: parse.data.classId,
        access_code: code,
        is_open: true,
      })
      .select("*")
      .single();
    if (!error && ins) {
      await sb.from("tests").update({ status: "published" }).eq("id", ctx.params.id);
      return NextResponse.json({ assignmentId: ins.id, accessCode: code });
    }
  }
  return NextResponse.json({ error: "Could not allocate access code" }, { status: 500 });
}
