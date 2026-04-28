"use client";

// Custom on-screen keyboard for touch devices.
//
// Why: On iPad / Android, the system keyboard exposes a bunch of leakage
// channels we don't want during a test — autocomplete suggestions over the
// keyboard, swipe-typing, copy/paste menus, dictionary lookup, etc. By
// rendering our own keys and putting `inputMode="none"` + `readOnly` on the
// answer field, the OS keyboard stays hidden and the student must type
// through our buttons.
//
// Two modes:
//   - "alpha": full QWERTY with shift, space, backspace, return
//   - "numeric": digits + decimal, for numeric short answers
//
// Use via the <VKInput> wrapper which composes the input + keyboard, or
// drop in <VirtualKeyboard onKey={...}/> if you need bare control.

import { useState } from "react";

const ROWS_LOWER = [
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["z","x","c","v","b","n","m"],
];
const ROWS_UPPER = ROWS_LOWER.map(r => r.map(k => k.toUpperCase()));

const ROWS_NUM = [
  ["1","2","3"],
  ["4","5","6"],
  ["7","8","9"],
  [".","0","-"],
];

export interface VirtualKeyboardProps {
  mode?: "alpha" | "numeric";
  onKey: (key: string) => void;
  onBackspace: () => void;
  onSubmit?: () => void;
}

export function VirtualKeyboard({
  mode = "alpha",
  onKey,
  onBackspace,
  onSubmit,
}: VirtualKeyboardProps) {
  const [shift, setShift] = useState(false);

  if (mode === "numeric") {
    return (
      <div className="select-none rounded-xl bg-slate-100 p-3">
        {ROWS_NUM.map((row, i) => (
          <div key={i} className="flex justify-center gap-1.5 mb-1.5 last:mb-0">
            {row.map(k => (
              <Key key={k} label={k} onPress={() => onKey(k)} wide />
            ))}
          </div>
        ))}
        <div className="flex justify-center gap-1.5">
          <Key label="⌫" onPress={onBackspace} wide />
          {onSubmit && <Key label="Done" onPress={onSubmit} accent wide />}
        </div>
      </div>
    );
  }

  const rows = shift ? ROWS_UPPER : ROWS_LOWER;
  return (
    <div className="select-none rounded-xl bg-slate-100 p-3">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-1 mb-1.5 last:mb-0">
          {i === 2 && (
            <Key
              label={shift ? "⇧" : "⇧"}
              onPress={() => setShift(s => !s)}
              accent={shift}
              flex={1.5}
            />
          )}
          {row.map(k => (
            <Key key={k} label={k} onPress={() => onKey(k)} />
          ))}
          {i === 2 && (
            <Key label="⌫" onPress={onBackspace} accent flex={1.5} />
          )}
        </div>
      ))}
      <div className="flex justify-center gap-1">
        <Key label="space" onPress={() => onKey(" ")} flex={5} />
        {onSubmit && <Key label="Done" onPress={onSubmit} accent flex={2} />}
      </div>
    </div>
  );
}

function Key({
  label,
  onPress,
  accent,
  wide,
  flex = 1,
}: {
  label: string;
  onPress: () => void;
  accent?: boolean;
  wide?: boolean;
  flex?: number;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      style={{ flex }}
      className={[
        "min-h-[44px] rounded-md text-base font-medium px-2",
        wide && "min-w-[44px]",
        accent
          ? "bg-slate-900 text-white"
          : "bg-white text-slate-900 border border-slate-200 active:bg-slate-50",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </button>
  );
}

/** Composed input + virtual keyboard for short-answer fields. */
export function VKInput({
  value,
  onChange,
  mode = "alpha",
  placeholder,
  showKeyboard,
}: {
  value: string;
  onChange: (next: string) => void;
  mode?: "alpha" | "numeric";
  placeholder?: string;
  showKeyboard: boolean;
}) {
  return (
    <div className="space-y-3">
      <input
        className="virtual-only-input w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg outline-none focus:border-slate-500"
        value={value}
        onChange={(e) => {
          // Only allow programmatic changes from our keyboard when on touch
          // device. On desktop (no virtual keyboard), accept native typing.
          if (!showKeyboard) onChange(e.target.value);
        }}
        readOnly={showKeyboard}
        inputMode={showKeyboard ? "none" : mode === "numeric" ? "decimal" : "text"}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder={placeholder}
      />
      {showKeyboard && (
        <VirtualKeyboard
          mode={mode}
          onKey={(k) => onChange(value + k)}
          onBackspace={() => onChange(value.slice(0, -1))}
        />
      )}
    </div>
  );
}
