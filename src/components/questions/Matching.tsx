"use client";

// Matching — tap-to-select interaction. Designed to work identically on
// desktop, iPad, and Android. No drag-and-drop.
//
// Flow:
//   1. Student taps a left item (highlights).
//   2. Student taps a right item — pair recorded, both items now show their
//      pair number.
//   3. Tapping a paired item again unpairs it.

import { useMemo, useState } from "react";
import type { MatchingAnswer, MatchingPayload } from "@/types";

export function Matching({
  payload,
  answer,
  onChange,
  disabled,
}: {
  payload: MatchingPayload;
  answer: MatchingAnswer | null;
  onChange: (next: MatchingAnswer) => void;
  disabled?: boolean;
}) {
  const [activeLeft, setActiveLeft] = useState<string | null>(null);
  const pairs = answer?.pairs ?? [];

  const leftToRight = useMemo(() => new Map(pairs), [pairs]);
  const rightToLeft = useMemo(
    () => new Map(pairs.map(([l, r]) => [r, l] as [string, string])),
    [pairs]
  );

  // Stable display number for a pair (1-indexed in the order pairs were added).
  const pairIndex = useMemo(() => {
    const m = new Map<string, number>();
    pairs.forEach(([l, r], i) => {
      m.set(`L:${l}`, i + 1);
      m.set(`R:${r}`, i + 1);
    });
    return m;
  }, [pairs]);

  function tapLeft(id: string) {
    if (disabled) return;
    if (leftToRight.has(id)) {
      // Unpair
      onChange({ pairs: pairs.filter(([l]) => l !== id) });
      setActiveLeft(null);
      return;
    }
    setActiveLeft(activeLeft === id ? null : id);
  }

  function tapRight(id: string) {
    if (disabled) return;
    if (rightToLeft.has(id)) {
      // Unpair
      onChange({ pairs: pairs.filter(([, r]) => r !== id) });
      return;
    }
    if (!activeLeft) return;
    // Replace any existing pair on either side, then add this pair.
    const next = pairs.filter(([l, r]) => l !== activeLeft && r !== id);
    next.push([activeLeft, id]);
    onChange({ pairs: next });
    setActiveLeft(null);
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <ul className="space-y-2">
        {payload.left.map((item) => {
          const num = pairIndex.get(`L:${item.id}`);
          const isActive = activeLeft === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => tapLeft(item.id)}
                className={btnClass(isActive, !!num)}
              >
                <Badge num={num} active={isActive} />
                {item.text}
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="space-y-2">
        {payload.right.map((item) => {
          const num = pairIndex.get(`R:${item.id}`);
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={disabled || (!num && !activeLeft)}
                onClick={() => tapRight(item.id)}
                className={btnClass(false, !!num)}
              >
                <Badge num={num} />
                {item.text}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function btnClass(active: boolean, paired: boolean) {
  return [
    "w-full text-left px-4 py-3 rounded-lg border text-base transition",
    active
      ? "border-blue-500 bg-blue-50"
      : paired
      ? "border-slate-900 bg-slate-50"
      : "border-slate-200 bg-white hover:border-slate-300",
    "disabled:opacity-60",
  ].join(" ");
}

function Badge({ num, active }: { num?: number; active?: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center justify-center mr-3 h-6 w-6 rounded-full text-xs font-bold",
        num
          ? "bg-slate-900 text-white"
          : active
          ? "bg-blue-500 text-white"
          : "border border-slate-300 text-slate-400",
      ].join(" ")}
    >
      {num ?? ""}
    </span>
  );
}
