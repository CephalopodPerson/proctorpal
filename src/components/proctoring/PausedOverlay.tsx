"use client";

// Full-cover overlay shown when the proctor has paused the session.
// Blocks all input until the teacher resumes from the dashboard.

import { useProctor } from "./ProctorContext";

const REASON_COPY: Record<string, string> = {
  fullscreen_exit: "You left fullscreen.",
  tab_blur: "You switched to another window.",
  visibility_hidden: "The test page lost focus.",
  paste_attempt: "Pasting is not allowed during this test.",
  copy_attempt: "Copying is not allowed during this test.",
  cut_attempt: "Cutting is not allowed during this test.",
  context_menu: "The right-click menu is disabled during this test.",
  pwa_required: "Open this test from the home-screen icon to continue.",
  device_mismatch: "Your session was started on a different device.",
};

export function PausedOverlay() {
  const { paused, pauseReason } = useProctor();
  if (!paused) return null;
  const msg = (pauseReason && REASON_COPY[pauseReason]) ?? "Your test is paused.";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="max-w-md mx-6 rounded-2xl bg-white p-8 shadow-2xl">
        <div className="text-violation text-sm font-semibold uppercase tracking-wide">
          Test paused
        </div>
        <p className="mt-2 text-xl font-semibold text-slate-900">{msg}</p>
        <p className="mt-3 text-sm text-slate-600">
          Please raise your hand. Your teacher will review the alert and resume
          your test when you&apos;re ready.
        </p>
      </div>
    </div>
  );
}
