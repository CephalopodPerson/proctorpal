"use client";

// Server-authoritative timer.
//
// The server returns started_at + duration_seconds_remaining at session
// start. We compute the local end time as: started_at + remaining, and
// re-sync every 30 seconds against the server in case the teacher added
// time or paused/resumed.
//
// On pause: end time is "frozen" — we stop counting down. On resume,
// the server returns a fresh remaining and a new started_at.

import { useEffect, useState } from "react";

export interface TimerSync {
  startedAt: string | null;       // ISO
  remainingSeconds: number;       // at startedAt
  paused: boolean;
}

export function useTimer(sync: TimerSync, onExpire: () => void) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (sync.paused) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [sync.paused]);

  let secondsLeft = sync.remainingSeconds;
  if (sync.startedAt && !sync.paused) {
    const elapsed = (now - new Date(sync.startedAt).getTime()) / 1000;
    secondsLeft = Math.max(0, Math.floor(sync.remainingSeconds - elapsed));
  }

  useEffect(() => {
    if (!sync.paused && sync.startedAt && secondsLeft <= 0) {
      onExpire();
    }
  }, [secondsLeft, sync.paused, sync.startedAt, onExpire]);

  return secondsLeft;
}
