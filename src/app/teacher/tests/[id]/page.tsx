"use client";

// Test editor: settings, sections, questions (per section), publish.
// Single-page editor — auto-saves on each field blur to keep the round-trip
// model simple. This is the heaviest screen in the app.

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { QuestionEditor, type DraftQuestion } from "@/components/teacher/QuestionEditor";
import type { QuestionType } from "@/types";

interface Test {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  duration_seconds: number;
  require_fullscreen: boolean;
  block_copy_paste: boolean;
  detect_focus_loss: boolean;
  force_virtual_keyboard_on_touch: boolean;
  require_teacher_admit: boolean;
  shuffle_questions: boolean;
  results_visibility: "immediate" | "after_publish" | "after_close";
}

interface Section {
  id: string;
  test_id: string;
  title: string;
  position: number;
  draw_count: number | null;
  instructions: string | null;
  bank_id: string;
  questions: DraftQuestion[];
}

export default function TestEdit() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const sb = getSupabaseBrowser();

  const [test, setTest] = useState<Test | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [classId, setClassId] = useState<string>("");
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [{ data: t }, { data: secList }, { data: cls }] = await Promise.all([
      sb.from("tests").select("*").eq("id", id).single(),
      sb
        .from("test_sections")
        .select("*, question_banks(id, questions(*))")
        .eq("test_id", id)
        .order("position"),
      sb.from("classes").select("id,name").order("name"),
    ]);
    setTest(t as Test);
    setClasses((cls as any[]) ?? []);
    if (cls && cls.length && !classId) setClassId(cls[0].id);
    const built = ((secList as any[]) ?? []).map((s) => {
      const bank = s.question_banks?.[0];
      const questions = (bank?.questions ?? [])
        .slice()
        .sort((a: any, b: any) => a.position - b.position)
        .map((q: any) => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          payload: q.payload,
          image_url: q.image_url,
          youtube_id: q.youtube_id,
          points: q.points,
          position: q.position,
        }));
      return {
        id: s.id,
        test_id: s.test_id,
        title: s.title,
        position: s.position,
        draw_count: s.draw_count,
        instructions: s.instructions,
        bank_id: bank?.id ?? "",
        questions,
      } as Section;
    });
    setSections(built);
  }, [id, sb, classId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function patchTest(patch: Partial<Test>) {
    if (!test) return;
    setTest({ ...test, ...patch });
    await sb.from("tests").update(patch).eq("id", id);
  }

  async function addSection() {
    const pos = sections.length;
    const { data: section } = await sb
      .from("test_sections")
      .insert({ test_id: id, title: `Section ${pos + 1}`, position: pos })
      .select("*")
      .single();
    if (!section) return;
    await sb.from("question_banks").insert({ section_id: section.id });
    refresh();
  }

  async function patchSection(s: Section, patch: Partial<Section>) {
    setSections((arr) => arr.map((x) => (x.id === s.id ? { ...x, ...patch } : x)));
    await sb.from("test_sections").update(patch).eq("id", s.id);
  }

  async function removeSection(s: Section) {
    if (!confirm("Delete this section and all its questions?")) return;
    await sb.from("test_sections").delete().eq("id", s.id);
    refresh();
  }

  async function addQuestion(s: Section, type: QuestionType) {
    const position = s.questions.length;
    const { data } = await sb
      .from("questions")
      .insert({
        bank_id: s.bank_id,
        type,
        prompt: "",
        payload: defaultPayload(type),
        position,
      })
      .select("*")
      .single();
    if (data) refresh();
  }

  async function patchQuestion(q: DraftQuestion) {
    if (!q.id) return;
    await sb
      .from("questions")
      .update({
        type: q.type,
        prompt: q.prompt,
        payload: q.payload,
        image_url: q.image_url,
        youtube_id: q.youtube_id,
        points: q.points,
      })
      .eq("id", q.id);
  }

  async function deleteQuestion(q: DraftQuestion) {
    if (!q.id) return;
    if (!confirm("Delete this question?")) return;
    await sb.from("questions").delete().eq("id", q.id);
    refresh();
  }

  async function publish() {
    setPublishMessage(null);
    if (!classId) {
      setPublishMessage("Pick a class first.");
      return;
    }
    const r = await fetch(`/api/teacher/tests/${id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId }),
    });
    const j = await r.json();
    if (!r.ok) {
      setPublishMessage(j.error ?? "Could not publish");
      return;
    }
    setPublishMessage(`Published. Access code: ${j.accessCode}`);
    refresh();
  }

  if (!test) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <input
          value={test.title}
          onChange={(e) => patchTest({ title: e.target.value })}
          className="text-2xl font-bold bg-transparent border-b border-transparent focus:border-slate-300 focus:outline-none"
        />
        <div className="flex gap-2">
          <Link
            href={`/teacher/tests/${id}/monitor`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:border-slate-400"
          >
            Live monitor →
          </Link>
          <Link
            href={`/teacher/tests/${id}/grade`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:border-slate-400"
          >
            Grade →
          </Link>
        </div>
      </div>

      {/* Basics */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Basics</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <NumField
            label="Duration (minutes)"
            value={Math.floor(test.duration_seconds / 60)}
            onChange={(v) => patchTest({ duration_seconds: v * 60 })}
          />
          <SelectField
            label="Results visibility"
            value={test.results_visibility}
            onChange={(v) => patchTest({ results_visibility: v as Test["results_visibility"] })}
            options={[
              { v: "after_publish", label: "After I publish them" },
              { v: "immediate", label: "Immediately on submit" },
              { v: "after_close", label: "After test closes" },
            ]}
          />
          <div className="flex items-end">
            <Toggle
              label="Shuffle question order per student"
              v={test.shuffle_questions}
              onChange={(v) => patchTest({ shuffle_questions: v })}
            />
          </div>
        </div>
      </section>

      {/* Proctoring */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Proctoring</h2>
            <p className="text-xs text-slate-500">
              Toggle individual rules below, or pick a preset. Use{" "}
              <span className="font-semibold">Practice mode</span> to QA the test
              without fullscreen, focus, or paste blocking getting in your way.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PresetButton
              label="Practice mode"
              hint="Everything off — for testing"
              onClick={() =>
                patchTest({
                  require_fullscreen: false,
                  block_copy_paste: false,
                  detect_focus_loss: false,
                  force_virtual_keyboard_on_touch: false,
                  require_teacher_admit: false,
                })
              }
            />
            <PresetButton
              label="Standard"
              hint="Recommended classroom defaults"
              onClick={() =>
                patchTest({
                  require_fullscreen: true,
                  block_copy_paste: true,
                  detect_focus_loss: true,
                  force_virtual_keyboard_on_touch: true,
                  require_teacher_admit: false,
                })
              }
            />
            <PresetButton
              label="Strict"
              hint="High-stakes / final exam"
              onClick={() =>
                patchTest({
                  require_fullscreen: true,
                  block_copy_paste: true,
                  detect_focus_loss: true,
                  force_virtual_keyboard_on_touch: true,
                  require_teacher_admit: true,
                })
              }
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ToggleRow
            label="Require fullscreen"
            description="Test won't start until the student enters fullscreen. Pause on exit. iPads must use PWA mode instead."
            v={test.require_fullscreen}
            onChange={(v) => patchTest({ require_fullscreen: v })}
          />
          <ToggleRow
            label="Block copy / paste"
            description="Prevents copy, cut, paste, and the right-click menu inside the test."
            v={test.block_copy_paste}
            onChange={(v) => patchTest({ block_copy_paste: v })}
          />
          <ToggleRow
            label="Detect tab / focus loss"
            description="Pause the session when the student switches tabs, minimizes, or loses window focus."
            v={test.detect_focus_loss}
            onChange={(v) => patchTest({ detect_focus_loss: v })}
          />
          <ToggleRow
            label="On-screen keyboard for tablets"
            description="Replaces the OS keyboard on touch devices to suppress autocomplete and clipboard suggestions."
            v={test.force_virtual_keyboard_on_touch}
            onChange={(v) => patchTest({ force_virtual_keyboard_on_touch: v })}
          />
          <ToggleRow
            label="Teacher admit"
            description="Each student waits in a holding room until you click Admit on the live monitor."
            v={test.require_teacher_admit}
            onChange={(v) => patchTest({ require_teacher_admit: v })}
          />
        </div>
      </section>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((s) => (
          <SectionBlock
            key={s.id}
            s={s}
            onPatch={(p) => patchSection(s, p)}
            onDelete={() => removeSection(s)}
            onAddQuestion={(type) => addQuestion(s, type)}
            onChangeQuestion={(qid, next) => {
              setSections((arr) =>
                arr.map((sx) =>
                  sx.id === s.id
                    ? {
                        ...sx,
                        questions: sx.questions.map((q) => (q.id === qid ? next : q)),
                      }
                    : sx
                )
              );
              patchQuestion(next);
            }}
            onDeleteQuestion={deleteQuestion}
          />
        ))}
        <button
          onClick={addSection}
          className="w-full rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600 hover:border-slate-400"
        >
          + Add section
        </button>
      </div>

      {/* Publish */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Publish to class</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={publish}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Publish
          </button>
        </div>
        {publishMessage && <p className="mt-3 text-sm">{publishMessage}</p>}
      </div>
    </div>
  );
}

function SectionBlock({
  s,
  onPatch,
  onDelete,
  onAddQuestion,
  onChangeQuestion,
  onDeleteQuestion,
}: {
  s: Section;
  onPatch: (p: Partial<Section>) => void;
  onDelete: () => void;
  onAddQuestion: (type: QuestionType) => void;
  onChangeQuestion: (qid: string, next: DraftQuestion) => void;
  onDeleteQuestion: (q: DraftQuestion) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <input
          value={s.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1 font-semibold"
        />
        <label className="text-xs text-slate-600">
          Draw
          <input
            type="number"
            value={s.draw_count ?? ""}
            onChange={(e) => onPatch({ draw_count: e.target.value ? Number(e.target.value) : null })}
            className="ml-2 w-16 rounded-md border border-slate-200 bg-white px-2 py-1"
            placeholder="all"
          />
          <span className="ml-1">of {s.questions.length}</span>
        </label>
        <button onClick={onDelete} className="text-xs text-violation hover:underline">
          Delete section
        </button>
      </div>
      <textarea
        value={s.instructions ?? ""}
        onChange={(e) => onPatch({ instructions: e.target.value })}
        placeholder="Section instructions (optional)"
        rows={1}
        className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
      />

      <div className="mt-4 space-y-3">
        {s.questions.map((q) => (
          <QuestionEditor
            key={q.id}
            q={q}
            onChange={(next) => onChangeQuestion(q.id!, next)}
            onDelete={() => onDeleteQuestion(q)}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["multiple_choice", "true_false", "short_answer", "long_answer", "matching", "ordering"] as QuestionType[]).map((t) => (
          <button
            key={t}
            onClick={() => onAddQuestion(t)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs hover:border-slate-400"
          >
            + {labelForType(t)}
          </button>
        ))}
      </div>
    </section>
  );
}

function labelForType(t: QuestionType) {
  return {
    multiple_choice: "Multiple choice",
    true_false: "True/False",
    short_answer: "Short answer",
    long_answer: "Long answer",
    matching: "Matching",
    ordering: "Ordering",
  }[t];
}

function defaultPayload(type: QuestionType): any {
  switch (type) {
    case "multiple_choice":
      return { options: [{ id: "a", text: "" }, { id: "b", text: "" }], correct: [], multi_select: false };
    case "true_false":
      return { correct: true };
    case "short_answer":
      return { accepts: [{ value: "", mode: "ci" }] };
    case "long_answer":
      return { rubric: "" };
    case "matching":
      return { left: [], right: [], pairs: [] };
    case "ordering":
      return { items: [], correct_order: [] };
  }
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-700">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 block w-32 rounded-md border border-slate-300 bg-white px-2 py-1"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <label className="block text-sm">
      <span className="text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  v,
  onChange,
}: {
  label: string;
  v: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={v} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function ToggleRow({
  label,
  description,
  v,
  onChange,
}: {
  label: string;
  description: string;
  v: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 hover:border-slate-300">
      <input
        type="checkbox"
        checked={v}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1"
      />
      <span className="flex-1">
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-600">{description}</span>
      </span>
      <span
        className={[
          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
          v ? "bg-ok-soft text-ok" : "bg-slate-200 text-slate-600",
        ].join(" ")}
      >
        {v ? "On" : "Off"}
      </span>
    </label>
  );
}

function PresetButton({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:border-slate-400"
    >
      {label}
    </button>
  );
}
