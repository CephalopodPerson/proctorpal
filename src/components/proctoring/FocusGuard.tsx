"use client";

// Detect tab switches, app switches, and window blurs.
//
// Two complementary signals:
//   - "visibilitychange" + document.hidden — fires for tab switch, minimize,
//     iOS app switcher, screen lock.
//   - window "blur" — fires when focus leaves the window even if visibility
//     hasn't changed (e.g., student clicked a different window on top).
//
// We treat either as a violation that pauses the session. Both can briefly
// fire when the user opens the on-screen keyboard on some Android devices,
// so we add a small grace period of 250ms before pausing.

import { useEffect, useRef } from "react";
import { useProctor } from "./ProctorContext";

export function FocusGuard({ enabled }: { enabled: boolean }) {
  const { armed, raiseViolation } = useProctor();
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function clearGrace() {
      if (graceTimer.current) {
        clearTimeout(graceTimer.current);
        graceTimer.current = null;
      }
    }

    function onVisibility() {
      if (!armed) return;
      if (document.hidden) {
        clearGrace();
        graceTimer.current = setTimeout(() => {
          if (document.hidden) {
            raiseViolation("visibility_hidden", {}, { pause: true });
          }
        }, 250);
      } else {
        clearGrace();
      }
    }

    function onBlur() {
      if (!armed) return;
      clearGrace();
      graceTimer.current = setTimeout(() => {
        // If still not focused after grace, treat as a real blur.
        if (!document.hasFocus()) {
          raiseViolation("tab_blur", {}, { pause: true });
        }
      }, 250);
    }

    function onFocus() {
      clearGrace();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      clearGrace();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, armed, raiseViolation]);

  return null;
}
