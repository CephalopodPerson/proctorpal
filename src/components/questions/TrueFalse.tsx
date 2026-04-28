"use client";

import type { TFAnswer } from "@/types";

export function TrueFalse({
  answer,
  onChange,
  disabled,
}: {
  answer: TFAnswer | null;
  onChange: (next: TFAnswer) => void;
  disabled?: boolean;
}) {
  const v = answer?.value;
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { key: "true", label: "True", val: true },
        { key: "false", label: "False", val: false },
      ].map((b) => {
        const sel = v === b.val;
        return (
          <button
            key={b.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ value: b.val })}
            className={[
              "py-4 rounded-xl border text-lg font-semibold transition",
              sel
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white hover:border-slate-300",
              disabled && "opacity-60 cursor-not-allowed",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {b.label}
          </button>
        );
      })}
    </div>
  );
}
