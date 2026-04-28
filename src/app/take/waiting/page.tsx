"use client";

// Waiting room — student is admitted by the teacher from the dashboard.
// We poll the session status every 2s; once it flips to in_progress,
// redirect to /take/run.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WaitingRoom() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const r = await fetch("/api/student/session", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      if (!cancelled && j.session?.status === "in_progress") {
        router.replace("/take/run");
      }
    }
    const id = setInterval(tick, 2000);
    tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="h-12 w-12 animate-pulse rounded-full bg-slate-300" />
      <h1 className="mt-6 text-2xl font-bold">Waiting for your teacher</h1>
      <p className="mt-2 text-slate-600">
        Your test will begin once your teacher admits you.
      </p>
    </main>
  );
}
