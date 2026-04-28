"use client";

// Ordering — tap-to-rearrange. Each item has up/down buttons.
// Works on every device, no drag-and-drop. The current order is the
// student's answer; if they haven't reordered yet we use the payload's
// items in author-supplied order (which is shuffled at session-start
// per-student so two students don't see the same starting order).

import type { OrderingAnswer, OrderingPayload } from "@/types";

export function Ordering({
  payload,
  answer,
  onChange,
  disabled,
}: {
  payload: OrderingPayload;
  answer: OrderingAnswer | null;
  onChange: (next: OrderingAnswer) => void;
  disabled?: boolean;
}) {
  const order =
    answer?.order && answer.order.length === payload.items.length
      ? answer.order
      : payload.items.map((i) => i.id);

  const byId = new Map(payload.items.map((i) => [i.id, i]));

  function move(idx: number, delta: number) {
    if (disabled) return;
    const target = idx + delta;
    if (target < 0 || target >= order.length) return;
    const next = order.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ order: next });
  }

  return (
    <ul className="space-y-2">
      {order.map((id, idx) => {
        const item = byId.get(id);
        if (!item) return null;
        return (
          <li
            key={id}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold">
              {idx + 1}
            </span>
            <span className="flex-1 text-base">{item.text}</span>
            <button
              type="button"
              disabled={disabled || idx === 0}
              onClick={() => move(idx, -1)}
              className="h-9 w-9 rounded-md border border-slate-200 bg-white text-lg disabled:opacity-30"
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={disabled || idx === order.length - 1}
              onClick={() => move(idx, 1)}
              className="h-9 w-9 rounded-md border border-slate-200 bg-white text-lg disabled:opacity-30"
              aria-label="Move down"
            >
              ↓
            </button>
          </li>
        );
      })}
    </ul>
  );
}
