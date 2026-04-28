"use client";

// Two-tier autosave for in-progress answers:
//   1. IndexedDB write on every keystroke (fast, instant local recovery).
//   2. Debounced server PATCH every ~1s (durable, also drives the live
//      dashboard via realtime).
//
// On reconnect, the server is the source of truth; local cache is the
// fallback if the server fetch fails (e.g., test starts mid-flight).
//
// Critical: the hook flushes on UNMOUNT so a debounced save isn't lost
// when the student navigates to the next question before the timer fires.

import { useCallback, useEffect, useRef } from "react";
import { get as idbGet, set as idbSet } from "idb-keyval";
import type { AnswerPayload } from "@/types";

const SAVE_DELAY_MS = 800;

export function localCacheKey(sessionId: string, sessionQuestionId: string) {
  return `pt:answer:${sessionId}:${sessionQuestionId}`;
}

export async function readLocalAnswer(
  sessionId: string,
  sessionQuestionId: string
): Promise<AnswerPayload["data"] | null> {
  try {
    const v = await idbGet(localCacheKey(sessionId, sessionQuestionId));
    return (v as AnswerPayload["data"]) ?? null;
  } catch {
    return null;
  }
}

/** Imperatively save an answer right now. Used by the submit flow. */
export async function saveAnswerNow(
  sessionQuestionId: string,
  payload: AnswerPayload["data"] | null
) {
  if (!payload) return;
  try {
    await fetch(`/api/student/answer`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionQuestionId, payload }),
      keepalive: true,
    });
  } catch {
    // ignore — IDB cache is the backstop
  }
}

export function useAutosave(
  sessionId: string,
  sessionQuestionId: string,
  payload: AnswerPayload["data"] | null
) {
  const lastSent = useRef<string | null>(null);
  const latestPayload = useRef<AnswerPayload["data"] | null>(payload);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track latest payload in a ref so the unmount flush sees the freshest value.
  useEffect(() => {
    latestPayload.current = payload;
  }, [payload]);

  const flush = useCallback(async () => {
    const p = latestPayload.current;
    if (!p) return;
    const body = JSON.stringify(p);
    if (body === lastSent.current) return;
    lastSent.current = body;
    try {
      await fetch(`/api/student/answer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionQuestionId, payload: p }),
        keepalive: true,
      });
    } catch {
      // Server save failed; rely on IDB cache. Will retry next change.
      lastSent.current = null;
    }
  }, [sessionQuestionId]);

  // Local IDB write on every change.
  useEffect(() => {
    if (!payload) return;
    idbSet(localCacheKey(sessionId, sessionQuestionId), payload).catch(() => void 0);
  }, [payload, sessionId, sessionQuestionId]);

  // Debounced server save when payload changes.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [payload, flush]);

  // Flush on unmount (e.g., user navigates to next question) and on pagehide.
  useEffect(() => {
    function onUnload() {
      flush();
    }
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      // Final flush on unmount.
      flush();
    };
    // Empty deps: we want this exactly once for the lifetime of the hook.
    // `flush` is stable wrt sessionQuestionId; the reference changes only when
    // that does, which itself causes a fresh hook instance for a new question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { flushNow: flush };
}
