"use client";

// Block and report copy/paste/cut/contextmenu within the test surface.
//
// Pauses on paste (high-signal cheat), flags but doesn't pause on copy
// (sometimes accidental, e.g. Ctrl+C reflex). Tune in `tests` row settings.
//
// Wrap the test content in <CopyPasteGuard>...</CopyPasteGuard>; the listener
// is scoped to the wrapped subtree so the dashboard isn't affected.

import { useEffect, useRef } from "react";
import { useProctor } from "./ProctorContext";

export function CopyPasteGuard({
  enabled,
  pauseOnPaste = true,
  children,
}: {
  enabled: boolean;
  pauseOnPaste?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { armed, raiseViolation } = useProctor();

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;

    const handler = (kind: "copy" | "paste" | "cut" | "context") =>
      (e: Event) => {
        if (!armed) return;
        e.preventDefault();
        e.stopPropagation();
        if (kind === "copy") raiseViolation("copy_attempt");
        if (kind === "cut") raiseViolation("cut_attempt");
        if (kind === "context") raiseViolation("context_menu");
        if (kind === "paste") raiseViolation("paste_attempt", {}, { pause: pauseOnPaste });
      };

    const onCopy = handler("copy");
    const onPaste = handler("paste");
    const onCut = handler("cut");
    const onContext = handler("context");

    node.addEventListener("copy", onCopy);
    node.addEventListener("paste", onPaste);
    node.addEventListener("cut", onCut);
    node.addEventListener("contextmenu", onContext);

    // Best-effort devtools detector. Fires when window inner dimensions
    // shrink dramatically (devtools docked) — very rough, sometimes false
    // positive on rotation. We log but don't pause.
    let lastInner = window.innerWidth + window.innerHeight;
    const onResize = () => {
      const inner = window.innerWidth + window.innerHeight;
      if (lastInner - inner > 200 && armed) {
        raiseViolation("devtools_open", { inner, lastInner });
      }
      lastInner = inner;
    };
    window.addEventListener("resize", onResize);

    return () => {
      node.removeEventListener("copy", onCopy);
      node.removeEventListener("paste", onPaste);
      node.removeEventListener("cut", onCut);
      node.removeEventListener("contextmenu", onContext);
      window.removeEventListener("resize", onResize);
    };
  }, [enabled, armed, raiseViolation, pauseOnPaste]);

  return (
    <div ref={ref} className="no-select" data-proctor-surface>
      {children}
    </div>
  );
}
