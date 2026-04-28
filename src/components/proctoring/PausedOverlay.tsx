"use client";

// Full-cover overlay shown when the proctor has paused the session.
// Blocks all input until the teacher resumes from the dashboard.

import { useProctor } from "./ProctorContext";
import { useT, type TKey } from "@/lib/i18n";

export function PausedOverlay() {
  const { paused, pauseReason } = useProctor();
  const t = useT();
  if (!paused) return null;

  const reasonKey: TKey = pauseReason ? ("paused." + pauseReason) as TKey : "paused.unknown";
  // Fall back to "paused.unknown" if the specific key isn't in the dictionary.
  let msg: string;
  try {
    msg = t(reasonKey);
    // tFor returns the key name if missing; detect that and fall back.
    if (msg === reasonKey) msg = t("paused.unknown");
  } catch {
    msg = t("paused.unknown");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="max-w-md mx-6 rounded-2xl bg-white p-8 shadow-2xl">
        <div className="text-violation text-sm font-semibold uppercase tracking-wide">
          {t("paused.title")}
        </div>
        <p className="mt-2 text-xl font-semibold text-slate-900">{msg}</p>
        <p className="mt-3 text-sm text-slate-600">{t("paused.askTeacher")}</p>
      </div>
    </div>
  );
}
