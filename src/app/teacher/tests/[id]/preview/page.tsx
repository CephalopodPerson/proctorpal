"use client";

// Teacher preview mode - walk through a test as if you were a student.
// No real session, no proctoring violations, no autosave, no submit.
// Just lets you see how each question renders and interact with it.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { QuestionRenderer } from "@/components/questions/QuestionRenderer";
import { isTouchPrimary } from "@/lib/proctor/platform";
import type { AnswerPayload, Question } from "@/types";


export default function PreviewPage() {
  const params = useParams<{ id: string }>();
  const testId = params.id;
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerPayload["data"] | null>>({});
  const [touchPrimary, setTouchPrimary] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTouchPrimary(isTouchPrimary());
  }, []);

  const load = useCallback(async () => {
    const sb = getSupabaseBrowser();
    const { data: test } = await sb.from("tests").select("title").eq("id", testId).single();
    if (test) setTitle(test.title);
    const { data: sections } = await sb
      .from("test_sections")
      .select("*, question_banks(id, questions(*))")
      .eq("test_id", testId)
      .order("position");
    const all: Question[] = [];
    for (const s of (sections as any[]) ?? []) {
      const bank = s.question_banks?.[0];
      const qs = (bank?.questions ?? [])
        .slice()
        .sort((a: any, b: any) => a.position - b.position) as Question[];
      // Honor the section's draw_count - take only that many for preview.
      const drawn = s.draw_count != null ? qs.slice(0, s.draw_count) : qs;
      for (const q of drawn) all.push(q);
    }
    setQuestions(all);
    setLoading(false);
  }, [testId]);

  useEffect(() => {
    load();
  }, [load]);

  const current = questions[idx];
  const isLast = idx === questions.length - 1;

  const answeredKeys = useMemo(
    () => Object.keys(answers).filter((k) => answers[k] != null),
    [answers]
  );

  if (loading) {
    return <div className="px-6 py-12 text-slate-500">Loading preview...</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-12 text-center">
        <p className="text-slate-700">This test has no questions yet.</p>
        <Link
          href={`/teacher/tests/${testId}`}
          className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-white"
        >
          Back to editor
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-warn-soft border-b border-warn/30 px-6 py-2 text-sm text-warn flex items-center justify-between">
        <span><strong>Preview mode</strong> &mdash; nothing is saved or recorded. Fullscreen, focus detection, and copy/paste blocking are off.</span>
        <Link
          href={`/teacher/tests/${testId}`}
          className="rounded-md border border-warn/40 bg-white px-3 py-1 text-xs font-medium text-warn hover:bg-warn-soft"
        >
          Exit preview
        </Link>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Test (preview)</div>
            <div className="text-lg font-semibold">{title}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Question {idx + 1}/{questions.length}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
          <QuestionRenderer
            question={current}
            answer={answers[current.id] ?? null}
            onAnswerChange={(next) =>
              setAnswers((prev) => ({ ...prev, [current.id]: next }))
            }
            showVirtualKeyboard={touchPrimary && current.type !== "long_answer"}
          />
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-1">
            {questions.map((q, i) => {
              const a = answeredKeys.includes(q.id);
              const here = i === idx;
              return (
                <button
                  key={q.id}
                  onClick={() => setIdx(i)}
                  className={[
                    "h-8 w-8 rounded-md text-xs font-semibold border",
                    here
                      ? "border-slate-900 bg-slate-900 text-white"
                      : a
                      ? "border-ok bg-ok-soft text-ok"
                      : "border-slate-200 bg-white text-slate-700",
                  ].join(" ")}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 disabled:opacity-50"
            >
              &larr; Previous
            </button>
            {isLast ? (
              <Link
                href={`/teacher/tests/${testId}`}
                className="rounded-lg bg-slate-900 px-6 py-2 text-white font-semibold"
              >
                End preview
              </Link>
            ) : (
              <button
                onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}
                className="rounded-lg bg-slate-900 px-4 py-2 text-white font-semibold"
              >
                Next &rarr;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
