"use client";

// Watches fullscreen state. When armed and the document leaves fullscreen,
// raise a violation that pauses the session.
//
// Notes:
//   - We filter out "video element entered fullscreen" cases by only acting
//     when the *document* exits fullscreen (fullscreenElement becomes null).
//   - On iPad we never see fullscreen at all; that platform should rely on
//     PwaGuard instead.

import { useEffect } from "react";
import { useProctor } from "./ProctorContext";
import { enterFullscreen, isInFullscreen } from "@/lib/proctor/platform";

export function FullscreenGuard({ enabled }: { enabled: boolean }) {
  const { armed, raiseViolation, fullscreenSupported } = useProctor();

  useEffect(() => {
    if (!enabled || !fullscreenSupported) return;

    function onChange() {
      if (!armed) return;
      if (!isInFullscreen()) {
        raiseViolation("fullscreen_exit", {}, { pause: true });
      }
    }

    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as EventListener);
    document.addEventListener("mozfullscreenchange", onChange as EventListener);
    document.addEventListener("MSFullscreenChange", onChange as EventListener);

    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange as EventListener);
      document.removeEventListener("mozfullscreenchange", onChange as EventListener);
      document.removeEventListener("MSFullscreenChange", onChange as EventListener);
    };
  }, [enabled, armed, fullscreenSupported, raiseViolation]);

  return null;
}

/** Button users click to enter fullscreen (browsers require a user gesture). */
export function EnterFullscreenButton({
  onEntered,
  className,
  children,
}: {
  onEntered?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const ok = await enterFullscreen();
        if (ok) onEntered?.();
      }}
    >
      {children ?? "Enter fullscreen"}
    </button>
  );
}
