"use client";

// ProctorContext wires the proctoring guards to a single source of truth.
// Children render the test UI. The provider owns:
//   - "armed" state (only enforce after the student clicks "Start")
//   - "paused" state (set by guards on a violation, lifted by the teacher)
//   - platform info captured at mount
//
// On a violation that should pause:
//   1. Set paused=true locally (instantly stops UI interaction)
//   2. Report violation with pauseSession=true to the server
//   3. Server marks the session paused and pushes via realtime
//   4. Teacher resumes from the dashboard, server clears pause, the test
//      page subscribes to that and lifts paused.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  detectPlatform,
  isPwaStandalone,
  isTouchPrimary,
  isFullscreenSupported,
} from "@/lib/proctor/platform";
import { reportViolation } from "@/lib/proctor/violations";
import type { Platform, ViolationType } from "@/types";

interface ProctorState {
  armed: boolean;
  paused: boolean;
  platform: Platform;
  pwaStandalone: boolean;
  touchPrimary: boolean;
  fullscreenSupported: boolean;
  pauseReason: ViolationType | null;
}

interface ProctorApi extends ProctorState {
  arm: () => void;
  setPaused: (reason: ViolationType | null) => void;
  raiseViolation: (
    type: ViolationType,
    details?: Record<string, unknown>,
    opts?: { pause?: boolean }
  ) => void;
}

const Ctx = createContext<ProctorApi | null>(null);

export function ProctorProvider({ children }: { children: React.ReactNode }) {
  const [armed, setArmed] = useState(false);
  const [paused, setPausedState] = useState(false);
  const [pauseReason, setPauseReason] = useState<ViolationType | null>(null);
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [pwa, setPwa] = useState(false);
  const [touch, setTouch] = useState(false);
  const [fsSupported, setFsSupported] = useState(false);
  const armedRef = useRef(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setPwa(isPwaStandalone());
    setTouch(isTouchPrimary());
    setFsSupported(isFullscreenSupported());
  }, []);

  const arm = useCallback(() => {
    armedRef.current = true;
    setArmed(true);
  }, []);

  const setPaused = useCallback((reason: ViolationType | null) => {
    setPausedState(reason !== null);
    setPauseReason(reason);
  }, []);

  const raiseViolation = useCallback<ProctorApi["raiseViolation"]>(
    (type, details, opts) => {
      if (!armedRef.current) return; // ignore events before student starts
      const pause = !!opts?.pause;
      reportViolation(type, details, pause);
      if (pause) setPaused(type);
    },
    [setPaused]
  );

  const value = useMemo<ProctorApi>(
    () => ({
      armed,
      paused,
      pauseReason,
      platform,
      pwaStandalone: pwa,
      touchPrimary: touch,
      fullscreenSupported: fsSupported,
      arm,
      setPaused,
      raiseViolation,
    }),
    [armed, paused, pauseReason, platform, pwa, touch, fsSupported, arm, setPaused, raiseViolation]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProctor() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProctor must be used inside ProctorProvider");
  return ctx;
}
