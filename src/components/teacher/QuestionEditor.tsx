"use client";

// Inline question editor. Switches form by question type.
// Saves on blur via onChange. Parent owns the data.

import { useT } from "@/lib/i18n";
import type {
  MultipleChoicePayload,
  TrueFalsePayload,
  ShortAnswerPayload,
  LongAnswerPayload,
  MatchingPayload,
  OrderingPayload,
  Question,
  QuestionType,
} from "@/types";

export interface DraftQuestion {
  id?: string;
  type: QuestionType;
  prompt: string;
  payload: any;
  image_url: string | null;
  youtube_id: string | null;
  points: number;
  position: number;
}

export function QuestionEditor({
  q,
  onChange,
  onDelete,
}: {
  q: DraftQuestion;
  onChange: (next: DraftQuestion) => void;
  onDelete: () => void;
}) {
  const t = useT();
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <select
          value={q.type}
          onChange={(e) => onChange({ ...q, type: e.target.value as QuestionType, payload: defaultPayload(e.target.value as QuestionType) })}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
        >
          <option value="multiple_choice">{t("qtype.multiple_choice")}</option>
          <option value="true_false">{t("qtype.true_false")}</option>
          <option value="short_answer">{t("qtype.short_answer")}</option>
          <option value="long_answer">{t("qtype.long_answer")}</option>
          <option value="matching">{t("qtype.matching")}</option>
          <option value="ordering">{t("qtype.ordering")}</option>
        </select>
        <input
          type="number"
          value={q.points}
          onChange={(e) => onChange({ ...q, points: Number(e.target.value) })}
          className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
          min={0}
          step={0.5}
        />
        <button onClick={onDelete} className="text-xs text-violation hover:underline">
          {t("common.delete")}
        </button>
      </div>

      <textarea
        value={q.prompt}
        onChange={(e) => onChange({ ...q, prompt: e.target.value })}
        placeholder={t("qedit.promptPlaceholder")}
        className="mt-3 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
        rows={2}
      />

      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          value={q.image_url ?? ""}
          onChange={(e) => onChange({ ...q, image_url: e.target.value || null })}
          placeholder={t("qedit.imagePlaceholder")}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
        />
        <input
          value={q.youtube_id ?? ""}
          onChange={(e) => onChange({ ...q, youtube_id: e.target.value || null })}
          placeholder={t("qedit.youtubePlaceholder")}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
        />
      </div>

      <div className="mt-3">{renderPayloadEditor(q, onChange)}</div>
    </div>
  );
}

function renderPayloadEditor(q: DraftQuestion, onChange: (n: DraftQuestion) => void) {
  switch (q.type) {
    case "multiple_choice":
      return <MCEditor q={q} onChange={onChange} />;
    case "true_false":
      return <TFEditor q={q} onChange={onChange} />;
    case "short_answer":
      return <ShortEditor q={q} onChange={onChange} />;
    case "long_answer":
      return <LongEditor q={q} onChange={onChange} />;
    case "matching":
      return <MatchEditor q={q} onChange={onChange} />;
    case "ordering":
      return <OrderEditor q={q} onChange={onChange} />;
  }
}

function defaultPayload(type: QuestionType): any {
  switch (type) {
    case "multiple_choice":
      return { options: [{ id: "a", text: "" }, { id: "b", text: "" }], correct: [], multi_select: false } as MultipleChoicePayload;
    case "true_false":
      return { correct: true } as TrueFalsePayload;
    case "short_answer":
      return { accepts: [{ value: "", mode: "ci" }] } as ShortAnswerPayload;
    case "long_answer":
      return { rubric: "" } as LongAnswerPayload;
    case "matching":
      return { left: [], right: [], pairs: [] } as MatchingPayload;
    case "ordering":
      return { items: [], correct_order: [] } as OrderingPayload;
  }
}

// ---------- Multiple choice ----------
function MCEditor({ q, onChange }: { q: DraftQuestion; onChange: (n: DraftQuestion) => void }) {
  const t = useT();
  const p = q.payload as MultipleChoicePayload;
  const update = (next: MultipleChoicePayload) => onChange({ ...q, payload: next });
  const correct = new Set(p.correct);
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={p.multi_select}
          onChange={(e) => update({ ...p, multi_select: e.target.checked, correct: [] })}
        />
        {t("qedit.allowMultiCorrect")}
      </label>
      {p.options.map((opt, i) => (
        <div key={opt.id} className="flex items-center gap-2">
          <input
            type={p.multi_select ? "checkbox" : "radio"}
            checked={correct.has(opt.id)}
            onChange={() => {
              if (p.multi_select) {
                const next = correct.has(opt.id)
                  ? p.correct.filter((c) => c !== opt.id)
                  : [...p.correct, opt.id];
                update({ ...p, correct: next });
              } else {
                update({ ...p, correct: [opt.id] });
              }
            }}
          />
          <input
            value={opt.text}
            onChange={(e) => {
              const next = p.options.slice();
              next[i] = { ...opt, text: e.target.value };
              update({ ...p, options: next });
            }}
            className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            placeholder={t("qedit.option", { n: i + 1 })}
          />
          <button
            onClick={() => update({ ...p, options: p.options.filter((o) => o.id !== opt.id), correct: p.correct.filter((c) => c !== opt.id) })}
            className="text-xs text-slate-400 hover:text-violation"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => {
          const id = String.fromCharCode(97 + p.options.length);
          update({ ...p, options: [...p.options, { id, text: "" }] });
        }}
        className="text-xs text-slate-600 hover:underline"
      >
        {t("qedit.addOption")}
      </button>
    </div>
  );
}

// ---------- True/False ----------
function TFEditor({ q, onChange }: { q: DraftQuestion; onChange: (n: DraftQuestion) => void }) {
  const t = useT();
  const p = q.payload as TrueFalsePayload;
  return (
    <label className="text-sm">
      {t("qedit.correctAnswer")}:{" "}
      <select
        value={p.correct ? "true" : "false"}
        onChange={(e) => onChange({ ...q, payload: { correct: e.target.value === "true" } })}
        className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
      >
        <option value="true">{t("common.yes")}</option>
        <option value="false">{t("common.no")}</option>
      </select>
    </label>
  );
}

// ---------- Short answer ----------
function ShortEditor({ q, onChange }: { q: DraftQuestion; onChange: (n: DraftQuestion) => void }) {
  const t = useT();
  const p = q.payload as ShortAnswerPayload;
  const update = (next: ShortAnswerPayload) => onChange({ ...q, payload: next });
  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-600">{t("qedit.acceptedAnswers")}</div>
      {p.accepts.map((a, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={a.value}
            onChange={(e) => {
              const next = p.accepts.slice();
              next[i] = { ...a, value: e.target.value };
              update({ ...p, accepts: next });
            }}
            className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
          />
          <select
            value={a.mode}
            onChange={(e) => {
              const next = p.accepts.slice();
              next[i] = { ...a, mode: e.target.value as any };
              update({ ...p, accepts: next });
            }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
          >
            <option value="exact">{t("qedit.modeExact")}</option>
            <option value="ci">{t("qedit.modeCi")}</option>
            <option value="ws">{t("qedit.modeWs")}</option>
            <option value="contains">{t("qedit.modeContains")}</option>
          </select>
          <button
            onClick={() => update({ ...p, accepts: p.accepts.filter((_, j) => j !== i) })}
            className="text-xs text-slate-400 hover:text-violation"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => update({ ...p, accepts: [...p.accepts, { value: "", mode: "ci" }] })}
        className="text-xs text-slate-600 hover:underline"
      >
        {t("qedit.addAccepted")}
      </button>
      <label className="block text-xs text-slate-600">
        {t("qedit.tolerance")}
        <input
          type="number"
          value={p.tolerance ?? ""}
          onChange={(e) =>
            update({ ...p, tolerance: e.target.value === "" ? undefined : Number(e.target.value) })
          }
          className="ml-2 w-24 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
          step="any"
        />
      </label>
    </div>
  );
}

// ---------- Long answer ----------
function LongEditor({ q, onChange }: { q: DraftQuestion; onChange: (n: DraftQuestion) => void }) {
  const t = useT();
  const p = q.payload as LongAnswerPayload;
  return (
    <div>
      <div className="text-xs text-slate-600 mb-1">{t("qedit.rubric")}</div>
      <textarea
        value={p.rubric ?? ""}
        onChange={(e) => onChange({ ...q, payload: { rubric: e.target.value } })}
        rows={3}
        className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm"
      />
    </div>
  );
}

// ---------- Matching ----------
function MatchEditor({ q, onChange }: { q: DraftQuestion; onChange: (n: DraftQuestion) => void }) {
  const t = useT();
  const p = q.payload as MatchingPayload;
  const update = (next: MatchingPayload) => onChange({ ...q, payload: next });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Side
        label={t("qedit.leftItems")}
        items={p.left}
        onAdd={() => update({ ...p, left: [...p.left, { id: rand(), text: "" }] })}
        onChange={(items) => update({ ...p, left: items })}
      />
      <Side
        label={t("qedit.rightItems")}
        items={p.right}
        onAdd={() => update({ ...p, right: [...p.right, { id: rand(), text: "" }] })}
        onChange={(items) => update({ ...p, right: items })}
      />
      <div className="sm:col-span-2">
        <div className="text-xs text-slate-600 mb-1">{t("qedit.correctPairs")}</div>
        <div className="space-y-2">
          {p.left.map((l) => {
            const pair = p.pairs.find(([lid]) => lid === l.id);
            return (
              <div key={l.id} className="flex items-center gap-2">
                <span className="flex-1 truncate text-sm">{l.text || t("qedit.unnamed")}</span>
                <span className="text-slate-400">→</span>
                <select
                  value={pair?.[1] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    const others = p.pairs.filter(([lid]) => lid !== l.id);
                    update({ ...p, pairs: v ? [...others, [l.id, v]] : others });
                  }}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                >
                  <option value="">{t("qedit.pickOne")}</option>
                  {p.right.map((r) => (
                    <option key={r.id} value={r.id}>{r.text || t("qedit.unnamed")}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Side({
  label,
  items,
  onAdd,
  onChange,
}: {
  label: string;
  items: { id: string; text: string }[];
  onAdd: () => void;
  onChange: (items: { id: string; text: string }[]) => void;
}) {
  const t = useT();
  return (
    <div>
      <div className="text-xs text-slate-600 mb-1">{label}</div>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-1">
            <input
              value={item.text}
              onChange={(e) => {
                const next = items.slice();
                next[i] = { ...item, text: e.target.value };
                onChange(next);
              }}
              className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            />
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-xs text-slate-400 hover:text-violation"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button onClick={onAdd} className="mt-1 text-xs text-slate-600 hover:underline">
        {t("common.add")}
      </button>
    </div>
  );
}

// ---------- Ordering ----------
function OrderEditor({ q, onChange }: { q: DraftQuestion; onChange: (n: DraftQuestion) => void }) {
  const t = useT();
  const p = q.payload as OrderingPayload;
  const update = (next: OrderingPayload) => onChange({ ...q, payload: next });
  return (
    <div>
      <div className="text-xs text-slate-600 mb-1">{t("qedit.itemsInOrder")}</div>
      <div className="space-y-1">
        {p.items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-1">
            <span className="w-6 text-right text-xs text-slate-400">{i + 1}.</span>
            <input
              value={item.text}
              onChange={(e) => {
                const next = p.items.slice();
                next[i] = { ...item, text: e.target.value };
                update({ ...p, items: next, correct_order: next.map((x) => x.id) });
              }}
              className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            />
            <button
              onClick={() => i > 0 && update({ ...p, items: swap(p.items, i, i - 1), correct_order: swap(p.items, i, i - 1).map((x) => x.id) })}
              disabled={i === 0}
              className="text-xs text-slate-500 disabled:opacity-30"
            >
              ↑
            </button>
            <button
              onClick={() => i < p.items.length - 1 && update({ ...p, items: swap(p.items, i, i + 1), correct_order: swap(p.items, i, i + 1).map((x) => x.id) })}
              disabled={i === p.items.length - 1}
              className="text-xs text-slate-500 disabled:opacity-30"
            >
              ↓
            </button>
            <button
              onClick={() => {
                const next = p.items.filter((_, j) => j !== i);
                update({ ...p, items: next, correct_order: next.map((x) => x.id) });
              }}
              className="text-xs text-slate-400 hover:text-violation"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => {
          const next = [...p.items, { id: rand(), text: "" }];
          update({ ...p, items: next, correct_order: next.map((x) => x.id) });
        }}
        className="mt-1 text-xs text-slate-600 hover:underline"
      >
        {t("qedit.addItem")}
      </button>
    </div>
  );
}

function rand() {
  return Math.random().toString(36).slice(2, 8);
}
function swap<T>(arr: T[], i: number, j: number): T[] {
  const next = arr.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export type { Question };
