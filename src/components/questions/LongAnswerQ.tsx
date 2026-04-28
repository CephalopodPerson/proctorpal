"use client";

// Long-form free response. On touch devices we still prefer our virtual
// keyboard, but we render a textarea-shaped surface and a larger keyboard
// area below. Implementation note: building a full multi-line virtual
// keyboard is a v1.5 task — for now, on touch devices, we accept the OS
// keyboard for long answer specifically (it's impractical to type an essay
// through a custom keyboard) and accept the leakage risk for that one
// question type. Document this in proctoring.md.

import type { LongAnswer } from "@/types";

export function LongAnswerQ({
  answer,
  onChange,
  disabled,
}: {
  answer: LongAnswer | null;
  onChange: (next: LongAnswer) => void;
  disabled?: boolean;
}) {
  return (
    <textarea
      className="w-full min-h-[220px] rounded-lg border border-slate-300 bg-white p-3 text-base outline-none focus:border-slate-500"
      value={answer?.value ?? ""}
      onChange={(e) => onChange({ value: e.target.value })}
      placeholder="Write your response"
      autoCorrect="off"
      autoCapitalize="sentences"
      spellCheck={false}
      disabled={disabled}
    />
  );
}
