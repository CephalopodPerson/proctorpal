"use client";

// Test runner page — this is the main student-facing page.
// Composes: ProctorProvider → guards → CopyPasteGuard surface → question UI.
// Owns: question navigation, autosave, server-driven timer, submit flow,
// and a realtime resume channel for when the teacher unpauses.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProctorProvider, useProctor } from "@/components/proctoring/ProctorContext";
import { FullscreenGuard, EnterFullscreenButton } from "@/components/proctoring/FullscreenGuard";
import { FocusGuard } from "@/components/proctoring/FocusGuard";
import { CopyPasteGuard } from "@/components/proctoring/CopyPasteGuard";
import { PausedOverlay } from "@/components/proctoring/PausedOverlay";
import { QuestionRenderer } from "@/components/questions/QuestionRenderer";
import { useAutosave, readLocalAnswer, saveAnswerNow } from "@/lib/autosave";
import { useTimer } from "@/lib/timer";
import { formatDuration } from "@/lib/utils";
import { isInFullscreen } from "@/lib/proctor/platform";
import { flushViolations } from "@/lib/proctor/violations";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { AnswerPayload, Question } from "@/types";

interface SessionData {
  session: {
    id: string;
    status: string;
    started_at: string | null;
    duration_seconds_remaining: number;
    paused_at: string | null;
    submitted_at: string | null;
  };
  test: {
    title: string;
    duration_seconds: number;
    require_fullscreen: boolean;
    block_copy_paste: boolean;
    detect_focus_loss: boolean;
    force_virtual_keyboard_on_touch: boolean;
  };
  questions: Array<{
    session_question_id: string;
    position: number;
    section_id: string;
    question: Question;
    answer: AnswerPayload["data"] | null;
  }>;
}

export default function TestRunPage() {
  return (
    <ProctorProvider>
      <Inner />
    </ProctorProvider>
  );
}

function Inner() {
  const [data, setData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const r = await fetch("/api/student/session", { cache: "no-store" });
    if (!r.ok) {
      setError("Could not load test. Please re-enter your access code.");
      return;
    }
    const j = (await r.json()) as SessionData;
    setData(j);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Realtime: subscribe to changes on this session row so we react to
  // teacher-driven pause/resume/add-time without polling.
  useEffect(() => {
    if (!data?.session.id) return;
    const sb = getSupabaseBrowser();
    const ch = sb
      .channel(`session:${data.session.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${data.session.id}` },
        () => reload()
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [data?.session.id, reload]);

  if (error) return <ErrorScreen msg={error} />;
  if (!data) return <Loading />;

  // If the student landed here before the teacher admitted them, bounce to
  // the waiting room. The runner can only render once questions are drawn.
  if (data.session.status === "pending_admit" || data.questions.length === 0) {
    if (typeof window !== "undefined") window.location.replace("/take/waiting");
    return <Loading />;
  }

  // If they've already submitted (e.g., back-button shenanigans), go to done.
  if (data.session.status === "submitted" || data.session.status === "auto_submitted") {
    if (typeof window !== "undefined") window.location.replace("/take/done");
    return <Loading />;
  }

  return <Loaded data={data} reload={reload} />;
}

function Loaded({ data, reload }: { data: SessionData; reload: () => void }) {
  const router = useRouter();
  const proctor = useProctor();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerPayload["data"] | null>>(() => {
    const seed: Record<string, AnswerPayload["data"] | null> = {};
    for (const q of data.questions) seed[q.session_question_id] = q.answer ?? null;
    return seed;
  });
  const [submitting, setSubmitting] = useState(false);

  // Hydrate from local IDB if the server has no answer (e.g., last save lost).
  useEffect(() => {
    (async () => {
      const next = { ...answers };
      let touched = false;
      for (const q of data.questions) {
        if (next[q.session_question_id] == null) {
          const local = await readLocalAnswer(data.session.id, q.session_question_id);
          if (local) {
            next[q.session_question_id] = local;
            touched = true;
          }
        }
      }
      if (touched) setAnswers(next);
    })();
    // Intentional: only run on initial mount when data first arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.session.id]);

  const sync = useMemo(
    () => ({
      startedAt: data.session.started_at,
      remainingSeconds: data.session.duration_seconds_remaining,
      paused: data.session.status !== "in_progress",
    }),
    [data.session]
  );

  const onExpire = useCallback(async () => {
    await fetch("/api/student/submit", { method: "POST" });
    router.replace("/take/done");
  }, [router]);

  const secondsLeft = useTimer(sync, onExpire);

  // Apply paused state from server status to the proctor context.
  useEffect(() => {
    if (data.session.status === "paused") {
      proctor.setPaused((proctor.pauseReason ?? "unknown") as any);
    } else if (data.session.status === "in_progress") {
      proctor.setPaused(null);
    }
  }, [data.session.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const showVK =
    data.test.force_virtual_keyboard_on_touch &&
    proctor.touchPrimary &&
    // We don't try to suppress the OS keyboard for long-answer; see LongAnswerQ.
    data.questions[idx]?.question.type !== "long_answer";

  const current = data.questions[idx];
  if (!current) {
    return <ErrorScreen msg="No questions in this test." />;
  }

  return (
    <>
      {data.test.require_fullscreen && proctor.fullscreenSupported && (
        <FullscreenGuard enabled={true} />
      )}
      {data.test.detect_focus_loss && <FocusGuard enabled={true} />}

      <div className="mx-auto max-w-3xl px-4 py-4">
        <Header
          title={data.test.title}
          secondsLeft={secondsLeft}
          position={idx + 1}
          total={data.questions.length}
        />

        {!proctor.armed ? (
          <StartGate
            requireFullscreen={data.test.require_fullscreen && proctor.fullscreenSupported}
            onArm={() => proctor.arm()}
          />
        ) : (
          <CopyPasteGuard
            enabled={data.test.block_copy_paste}
            pauseOnPaste={true}
          >
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
              <QuestionBlock
                sessionId={data.session.id}
                sq={current}
                answer={answers[current.session_question_id] ?? null}
                onChange={(next) =>
                  setAnswers((prev) => ({ ...prev, [current.session_question_id]: next }))
                }
                showVK={showVK}
                disabled={proctor.paused}
              />
            </div>

            <Nav
              idx={idx}
              total={data.questions.length}
              answered={Object.keys(answers).filter((k) => answers[k] != null)}
              questionIds={data.questions.map((q) => q.session_question_id)}
              onPrev={() => setIdx((i) => Math.max(0, i - 1))}
              onNext={() => setIdx((i) => Math.min(data.questions.length - 1, i + 1))}
              onJump={(i) => setIdx(i)}
              onSubmit={async () => {
                setSubmitting(true);
                await flushViolations();
                // Force-save every answer before submitting so nothing in
                // the debounce window is lost.
                await Promise.all(
                  Object.entries(answers).map(([sqId, payload]) =>
                    saveAnswerNow(sqId, payload)
                  )
                );
                await fetch("/api/student/submit", { method: "POST" });
                router.replace("/take/done");
              }}
              submitting={submitting}
            />
          </CopyPasteGuard>
        )}
      </div>

      <PausedOverlay />
      {/* If the server flips us back to in_progress, refresh the data so the
          paused overlay clears via React-state. */}
      <Resumer status={data.session.status} reload={reload} />
    </>
  );
}

function Resumer({ status, reload }: { status: string; reload: () => void }) {
  useEffect(() => {
    if (status === "in_progress") reload();
  }, [status, reload]);
  return null;
}

function Header({
  title,
  secondsLeft,
  position,
  total,
}: {
  title: string;
  secondsLeft: number;
  position: number;
  total: number;
}) {
  const low = secondsLeft < 60;
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">Test</div>
        <div className="text-lg font-semibold">{title}</div>
      </div>
      <div className="text-right">
        <div className="text-xs uppercase tracking-wide text-slate-500">
          Question {position}/{total}
        </div>
        <div className={`font-mono text-2xl ${low ? "text-violation" : "text-slate-900"}`}>
          {formatDuration(secondsLeft)}
        </div>
      </div>
    </div>
  );
}

function StartGate({
  requireFullscreen,
  onArm,
}: {
  requireFullscreen: boolean;
  onArm: () => void;
}) {
  const [ready, setReady] = useState(!requireFullscreen);
  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-semibold">Before you start</h2>
      <ul className="mt-3 space-y-1 text-sm text-slate-700 list-disc pl-5">
        <li>Close every other tab and app.</li>
        <li>Put your phone face-down on the desk.</li>
        <li>Do not switch tabs, copy, or paste.</li>
        <li>If anything happens, raise your hand.</li>
      </ul>
      {requireFullscreen && (
        <div className="mt-5">
          <EnterFullscreenButton
            onEntered={() => {
              if (isInFullscreen()) setReady(true);
            }}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 py-3 font-semibold"
          >
            Enter fullscreen to begin
          </EnterFullscreenButton>
        </div>
      )}
      <button
        disabled={!ready}
        onClick={onArm}
        className="mt-4 w-full rounded-lg bg-slate-900 py-3 text-white font-semibold disabled:opacity-50"
      >
        Start test
      </button>
    </div>
  );
}

function QuestionBlock({
  sessionId,
  sq,
  answer,
  onChange,
  showVK,
  disabled,
}: {
  sessionId: string;
  sq: SessionData["questions"][number];
  answer: AnswerPayload["data"] | null;
  onChange: (next: AnswerPayload["data"]) => void;
  showVK: boolean;
  disabled: boolean;
}) {
  useAutosave(sessionId, sq.session_question_id, answer);
  return (
    <QuestionRenderer
      question={sq.question}
      answer={answer}
      onAnswerChange={onChange}
      showVirtualKeyboard={showVK}
      disabled={disabled}
    />
  );
}

function Nav({
  idx,
  total,
  answered,
  questionIds,
  onPrev,
  onNext,
  onJump,
  onSubmit,
  submitting,
}: {
  idx: number;
  total: number;
  answered: string[];
  questionIds: string[];
  onPrev: () => void;
  onNext: () => void;
  onJump: (i: number) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const isLast = idx === total - 1;
  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-1">
        {questionIds.map((id, i) => {
          const a = answered.includes(id);
          const here = i === idx;
          return (
            <button
              key={id}
              onClick={() => onJump(i)}
              className={[
                "h-8 w-8 rounded-md text-xs font-semibold border",
                here
                  ? "border-slate-900 bg-slate-900 text-white"
                  : a
                  ? "border-ok bg-ok-soft text-ok"
                  : "border-slate-200 bg-white text-slate-700",
              ].join(" ")}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between">
        <button
          onClick={onPrev}
          disabled={idx === 0}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 disabled:opacity-50"
        >
          ← Previous
        </button>
        {isLast ? (
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-lg bg-slate-900 px-6 py-2 text-white font-semibold disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit test"}
          </button>
        ) : (
          <button
            onClick={onNext}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white font-semibold"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center text-slate-600">
      Loading test…
    </div>
  );
}

function ErrorScreen({ msg }: { msg: string }) {
  return (
    <div className="mx-auto max-w-md px-6 py-12 text-center">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-slate-600">{msg}</p>
    </div>
  );
}
