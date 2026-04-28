// Report violations to the API. Debounced and queued so that a flurry of
// blur events (alt-tab + focus several times) doesn't hammer the server,
// and so the report fires once even on poor connections.

import type { ViolationType } from "@/types";

interface PendingViolation {
  type: ViolationType;
  details?: Record<string, unknown>;
  pauseSession: boolean;
  occurredAt: number;
}

let queue: PendingViolation[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Records a violation. Coalesces repeats within 1s. */
export function reportViolation(
  type: ViolationType,
  details?: Record<string, unknown>,
  pauseSession = false
) {
  const now = Date.now();
  const last = queue[queue.length - 1];
  if (last && last.type === type && now - last.occurredAt < 1000) {
    // Coalesce — keep the harsher pause flag.
    last.pauseSession = last.pauseSession || pauseSession;
    last.details = { ...(last.details ?? {}), ...(details ?? {}), repeat: true };
    return;
  }
  queue.push({ type, details, pauseSession, occurredAt: now });
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 250);
}

async function flush() {
  flushTimer = null;
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  try {
    await fetch("/api/session/violations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ violations: batch }),
      keepalive: true, // survive page transitions
    });
  } catch {
    // Re-queue on failure; will retry on next event.
    queue.unshift(...batch);
    if (!flushTimer) flushTimer = setTimeout(flush, 2000);
  }
}

/** Force-flush pending violations (e.g., on submit or unmount). */
export async function flushViolations() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flush();
}
