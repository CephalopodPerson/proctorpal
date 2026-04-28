"use client";

import type { ShortAnswer } from "@/types";
import { VKInput } from "../proctoring/VirtualKeyboard";

export function ShortAnswerQ({
  answer,
  onChange,
  showVirtualKeyboard,
  numeric,
  disabled,
}: {
  answer: ShortAnswer | null;
  onChange: (next: ShortAnswer) => void;
  showVirtualKeyboard: boolean;
  numeric?: boolean;
  disabled?: boolean;
}) {
  const v = answer?.value ?? "";
  return (
    <div className={disabled ? "opacity-60 pointer-events-none" : ""}>
      <VKInput
        value={v}
        onChange={(next) => onChange({ value: next })}
        showKeyboard={showVirtualKeyboard}
        mode={numeric ? "numeric" : "alpha"}
        placeholder="Type your answer"
      />
    </div>
  );
}
