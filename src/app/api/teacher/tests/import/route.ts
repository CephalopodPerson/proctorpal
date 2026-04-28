// POST /api/teacher/tests/import
// Body: { test: ImportedTest }  - the full structure described in
// docs/import-format.md. Creates the test, sections, banks, and questions
// for the calling teacher.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";

const QuestionType = z.enum([
  "multiple_choice",
  "true_false",
  "short_answer",
  "long_answer",
  "matching",
  "ordering",
]);

const QuestionInput = z.object({
  type: QuestionType,
  prompt: z.string(),
  points: z.number().nonnegative().default(1),
  image_url: z.string().nullable().optional(),
  youtube_id: z.string().nullable().optional(),
  // Per-type fields are stuffed into one record; we re-shape below.
  // Multiple choice
  options: z.array(z.object({ id: z.string(), text: z.string(), correct: z.boolean().optional() })).optional(),
  multi_select: z.boolean().optional(),
  correct: z.union([z.boolean(), z.array(z.string()), z.string()]).optional(),
  // Short answer
  accepts: z.array(z.object({ value: z.string(), mode: z.enum(["exact","ci","ws","contains"]) })).optional(),
  tolerance: z.number().optional().nullable(),
  // Long answer
  rubric: z.string().optional().nullable(),
  // Matching
  left: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  right: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  pairs: z.array(z.tuple([z.string(), z.string()])).optional(),
  // Ordering
  items: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  correct_order: z.array(z.string()).optional(),
});

const SectionInput = z.object({
  title: z.string(),
  draw_count: z.number().int().nullable().optional(),
  instructions: z.string().nullable().optional(),
  questions: z.array(QuestionInput),
});

const TestInput = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  duration_minutes: z.number().positive().default(30),
  sections: z.array(SectionInput).min(1),
});

const Body = z.object({ test: TestInput });

export async function POST(req: Request) {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parse = Body.safeParse(json);
  if (!parse.success) {
    return NextResponse.json(
      { error: "Invalid format", details: parse.error.flatten() },
      { status: 400 }
    );
  }
  const { test } = parse.data;

  // Create the test row.
  const { data: testRow, error: tErr } = await sb
    .from("tests")
    .insert({
      teacher_id: user.id,
      title: test.title,
      description: test.description ?? null,
      duration_seconds: Math.round(test.duration_minutes * 60),
    })
    .select("id")
    .single();
  if (tErr || !testRow) {
    return NextResponse.json({ error: tErr?.message ?? "Failed to create test" }, { status: 500 });
  }
  const testId = (testRow as { id: string }).id;

  // Sections + banks + questions.
  for (let i = 0; i < test.sections.length; i++) {
    const sec = test.sections[i];
    const { data: secRow, error: sErr } = await sb
      .from("test_sections")
      .insert({
        test_id: testId,
        title: sec.title,
        position: i,
        draw_count: sec.draw_count ?? null,
        instructions: sec.instructions ?? null,
      })
      .select("id")
      .single();
    if (sErr || !secRow) {
      return NextResponse.json({ error: sErr?.message ?? "Failed section" }, { status: 500 });
    }
    const sectionId = (secRow as { id: string }).id;

    const { data: bankRow, error: bErr } = await sb
      .from("question_banks")
      .insert({ section_id: sectionId })
      .select("id")
      .single();
    if (bErr || !bankRow) {
      return NextResponse.json({ error: bErr?.message ?? "Failed bank" }, { status: 500 });
    }
    const bankId = (bankRow as { id: string }).id;

    const rows = sec.questions.map((q, j) => ({
      bank_id: bankId,
      type: q.type,
      prompt: q.prompt,
      points: q.points ?? 1,
      image_url: q.image_url ?? null,
      youtube_id: q.youtube_id ?? null,
      payload: buildPayload(q),
      position: j,
    }));
    if (rows.length) {
      const { error: qErr } = await sb.from("questions").insert(rows);
      if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ testId });
}

// Reshape the flat question input into the JSONB payload our renderer expects.
function buildPayload(q: z.infer<typeof QuestionInput>) {
  switch (q.type) {
    case "multiple_choice": {
      const options = (q.options ?? []).map(({ id, text }) => ({ id, text }));
      // Accept either correct: string[] (ids) or correct flag on each option.
      let correct: string[] = [];
      if (Array.isArray(q.correct)) correct = q.correct;
      else if (typeof q.correct === "string") correct = [q.correct];
      else correct = (q.options ?? []).filter((o) => o.correct).map((o) => o.id);
      return { options, correct, multi_select: !!q.multi_select };
    }
    case "true_false":
      return { correct: q.correct === true || q.correct === "true" };
    case "short_answer":
      return { accepts: q.accepts ?? [], tolerance: q.tolerance ?? undefined };
    case "long_answer":
      return { rubric: q.rubric ?? "" };
    case "matching":
      return { left: q.left ?? [], right: q.right ?? [], pairs: q.pairs ?? [] };
    case "ordering":
      return { items: q.items ?? [], correct_order: q.correct_order ?? (q.items ?? []).map((i) => i.id) };
  }
}
