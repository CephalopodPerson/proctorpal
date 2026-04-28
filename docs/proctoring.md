# Proctoring — what it catches, what it doesn't

## Detection vs. prevention

Almost everything below is **detection**. The browser sandbox does not
let a website prevent the user from minimizing, alt-tabbing, opening
devtools, or screenshotting. We listen for those events and respond by
pausing the session, which forces the student to call you over to resume.
Pausing-on-violation is a much stronger deterrent than just logging,
because the student can't just try again — they have to talk to you.

Determined cheaters with a second device (phone) cannot be defeated by
any browser-side proctoring, paid or free. You're physically in the room.

## Per-control details

### Fullscreen
- **Enforcement**: Fullscreen API. Required to start when
  `tests.require_fullscreen = true` and the platform supports it.
- **Detection**: `fullscreenchange` event with no fullscreen element
  fires when the student exits.
- **Action**: pause session, log `fullscreen_exit`.
- **Edge case**: video elements going fullscreen also fire
  `fullscreenchange` — we filter to act only when the *document*
  fullscreen element becomes null.
- **Platforms**:
  - Windows / Mac / Linux Chrome, Firefox, Edge: fully supported.
  - Android Chrome: supported on most devices.
  - **iOS / iPadOS Safari: NOT supported.** Apple does not allow web
    pages to enter fullscreen. Use PWA standalone mode (see below) for
    iPad. iPhones should be blocked from taking the test entirely
    (screen too small anyway).

### Tab / focus loss
- **Enforcement**: none — we cannot block alt-tab.
- **Detection**: `visibilitychange` + `document.hidden`, plus `window.blur`,
  with a 250ms grace window to filter out spurious blurs from things like
  the on-screen keyboard popping up on Android.
- **Action**: pause session, log `tab_blur` or `visibility_hidden`.
- **iOS gesture caveat**: swiping up to the home screen or app switcher
  fires `visibilitychange`. We catch it. If the student goes to the home
  screen, the test pauses. They can't avoid this without staying in the
  app the whole time.

### Copy / paste / cut / right-click
- **Enforcement**: `preventDefault` on `copy`, `paste`, `cut`,
  `contextmenu` events scoped to the test container.
- **Detection**: same handlers log violations. Default config pauses
  on paste (high-cheat-signal) and only logs on copy / cut / right-click.
- **Limitation**: doesn't prevent screenshotting, photographing the
  screen, or reading questions aloud to ChatGPT on a phone.

### Devtools detection
- **Best-effort only.** We watch for sudden window.innerWidth/Height
  shrinkage as a heuristic for docked devtools.
- **Action**: log `devtools_open`, do **not** pause (false-positives on
  device rotation).
- **Honest limitation**: a determined student can use detached devtools,
  remote debugging, or a separate browser entirely. Not catchable from
  inside the page.

### Custom on-screen keyboard
- **Why**: on iPad / Android, the system keyboard exposes autocomplete,
  swipe typing, dictionary lookup, and clipboard suggestions. Our keyboard
  has none of those.
- **How**: when `tests.force_virtual_keyboard_on_touch = true` and the
  device is touch-primary (`pointer: coarse`), short-answer inputs render
  as `readOnly` + `inputMode="none"`, suppressing the OS keyboard, and
  a `<VirtualKeyboard />` is rendered next to the input.
- **Long-answer exception**: typing an essay through a button keyboard
  is impractical. Long-answer questions accept the OS keyboard on touch
  devices. This is a documented trade-off.
- **iOS quirk**: under some conditions iOS will still try to show its
  keyboard on focus. We use CSS to keep ours visually on top. Test on
  the actual hardware before relying on it.

### Device lock
- **What**: at session start we capture a fingerprint
  (UA + IP-ish). Subsequent reconnects with a different fingerprint are
  rejected with `device_mismatch`.
- **Limitations**: not cryptographic — a student on the same network
  using the same browser can mostly fake it. Defends against the lazy
  case of "give me your access code so I can take it on my computer
  while you take it on yours."
- **Recovery**: teacher hits "Unlock device" in the monitor; the next
  reconnect from any device wins.

### PWA standalone (iPad path)
- **Why**: iOS doesn't have a Fullscreen API. Installing the page as a
  PWA (Add to Home Screen) and launching from that icon runs without
  Safari chrome — no tabs to switch to, no URL bar to navigate.
- **How**: detect `display-mode: standalone` (and `navigator.standalone`
  legacy). If `require_fullscreen` is on but the iPad isn't in standalone
  mode, refuse to start the test and instruct the student to install the
  app first.
- **Setup**: have students do this once before test day. It takes 10s.

## What's not implemented

- **Webcam / microphone proctoring**: out of scope for in-classroom use.
  Adding it would require explicit consent flow, recording storage,
  privacy policy, parental notification depending on jurisdiction.
- **Lockdown browser shell**: a true exam-mode browser would require
  native installation, which is out of scope.
- **Anti-screenshot**: can't be done from a webpage.

## Recommended classroom setup

1. Walk the room. Software proctoring is for catching the obvious;
   eyes are for catching the rest.
2. Phones face-down on the desk before tests start.
3. If using iPads, make all students install the PWA before test day.
4. Spread students out; randomize question order per student
   (`tests.shuffle_questions = true`) so screen-shoulder-cheating is
   a different question each time.
5. Trust pause-on-violation more than logs. Investigate every pause; it
   tells the student you're paying attention.
