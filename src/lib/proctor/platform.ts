// Platform / device detection.
//
// We use this to decide which proctoring behaviors are enforceable on the
// current device:
//   - true-fullscreen via Fullscreen API: works on desktop browsers and Android.
//     iOS/iPadOS Safari does NOT support requesting fullscreen on the document.
//     For iPad we fall back to requiring PWA standalone mode.
//   - on-screen keyboard substitution: enabled when the primary pointer is
//     coarse (touch) and there's no detectable physical keyboard.

import type { Platform } from "@/types";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Mac with touch points — sniff that explicitly.
  const isIpad =
    /iPad/i.test(ua) ||
    (/Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
  if (isIpad) return "ipados";
  if (/iPhone|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Win/i.test(ua)) return "windows";
  if (/Mac/i.test(ua)) return "mac";
  if (/Linux/i.test(ua)) return "linux";
  return "unknown";
}

export function isTouchPrimary(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
}

/** True when launched from an installed PWA (home-screen icon, no browser chrome). */
export function isPwaStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS legacy:
  // @ts-expect-error Apple-specific
  if (window.navigator.standalone === true) return true;
  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
}

/** True if the Fullscreen API is supported AND practically usable. */
export function isFullscreenSupported(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as any;
  const has =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen;
  if (!has) return false;
  // iOS Safari exposes webkit prefix on some elements but document fullscreen
  // is broken — treat iPhone/iPad as unsupported and rely on PWA mode.
  const p = detectPlatform();
  if (p === "ios" || p === "ipados") return false;
  return true;
}

export async function enterFullscreen(): Promise<boolean> {
  const el = document.documentElement as any;
  const req =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen;
  if (!req) return false;
  try {
    await req.call(el);
    return true;
  } catch {
    return false;
  }
}

export function isInFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const d = document as any;
  return !!(
    d.fullscreenElement ||
    d.webkitFullscreenElement ||
    d.mozFullScreenElement ||
    d.msFullscreenElement
  );
}
