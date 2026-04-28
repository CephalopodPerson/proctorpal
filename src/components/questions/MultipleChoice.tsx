"use client";

// Multiple choice — handles both single-select (radio) and multi-select
// (checkbox) modes via the question payload.

import type { MCAnswer, MultipleChoicePayload } from "@/types";

export function MultipleChoice({
  payload,
  answer,
  onChange,
  disabled,
}: {
  payload: MultipleChoicePayload;
  answer: MCAnswer | null;
  onChange: (next: MCAnswer) => void;
  disabled?: boolean;
}) {
  const selected = new Set(answer?.selected ?? []);
  const isMulti = payload.multi_select;

  function toggle(id: string) {
    if (disabled) return;
    if (isMulti) {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange({ selected: Array.from(next) });
    } else {
      onChange({ selected: [id] });
    }
  }

  return (
    <ul className="space-y-2">
      {payload.options.map((opt) => {
        const isSel = selected.has(opt.id);
        return (
          <li key={opt.id}>
            <button
              type="button"
              onClick={() => toggle(opt.id)}
              disabled={disabled}
              className={[
                "w-full text-left px-4 py-3 rounded-lg border text-base transition",
                isSel
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white hover:border-slate-300",
                disabled && "opacity-60 cursor-not-allowed",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span
                className={[
                  "inline-flex items-center justify-center mr-3 h-5 w-5 rounded-full text-xs font-bold",
                  isMulti ? "rounded-md" : "rounded-full",
                  isSel ? "bg-white text-slate-900" : "border border-slate-300 text-transparent",
                ].join(" ")}
              >
                {isSel ? "✓" : "·"}
              </span>
              {opt.text}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
