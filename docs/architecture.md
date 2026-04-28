# Architecture

## Stack

- **Next.js 14 (App Router)** — server components for teacher pages,
  client components everywhere proctoring or realtime is involved.
- **Supabase** — Postgres + Auth + Realtime + Storage. Free tier handles
  ~30 concurrent students per test comfortably.
- **Tailwind CSS** — utility classes only, no component library to keep
  bundle small and review-friendly.

## Auth model

Two distinct identity tracks:

1. **Teachers** are Supabase Auth users. Cookie-based sessions handled by
   `@supabase/ssr`. RLS policies on every table restrict reads/writes to
   the owning teacher.

2. **Students** are roster rows (no Auth user). At test time they enter
   `accessCode + studentId`. The server validates against
   `test_assignments` + `students`, finds-or-creates a `sessions` row,
   and returns an HMAC-signed token in an httpOnly cookie. All
   `/api/student/*` and `/api/session/*` routes verify the token and
   resolve `session_id` from it. RLS is bypassed for these routes via
   the service-role client; the token is the access control.

## Data model (high level)

```
profiles ──< classes ──< students
                ↓
         test_assignments  ──< sessions ──< session_questions ──┐
              ↑                    │                            │
            tests ──< test_sections ──< question_banks ──< questions
                                     │
                                     └─ each session_question has at most 1 answer
                                                                 │
                                              answers (auto + manual scoring)
                                              violations
                                              grades (per session, on publish)
```

Question payload, answer payload, and violation details are JSONB.
Application-level zod schemas validate at the API boundary.

## Per-student question selection

`session_questions` is the contract. When a session is admitted (or
auto-started), we walk the test's sections, pull each section's bank,
seeded-shuffle on `${sessionId}:${sectionId}`, take `draw_count` items,
and write rows. The same student reconnecting gets the same questions
back (the rows are already there). Question order is the row position.

Two students get different question subsets because the seed includes
their session id.

## Proctoring loop

1. `ProctorProvider` initializes platform/PWA/touch info on mount.
2. The student clicks "Start", which arms the provider.
3. Mounted guards (`FullscreenGuard`, `FocusGuard`, `CopyPasteGuard`)
   listen for their respective events.
4. On violation: `raiseViolation()` posts to `/api/session/violations`
   (debounced, batched). If `pause: true`, the provider also flips local
   state so the UI freezes immediately.
5. The server marks the session paused, which fires through Supabase
   Realtime to the teacher's monitor and back to the student's runner.
6. Teacher resumes from the dashboard; the server flips back, realtime
   pushes again, the runner unpauses.

## Timer

Server-authoritative. The runner gets `started_at` and
`duration_seconds_remaining`. Locally we count down from `now` minus
`started_at`. On pause the server snapshots remaining and clears
`started_at`; on resume it sets a new `started_at` and unchanged remaining.
+time mutations adjust `duration_seconds_remaining`.

The client-side countdown is purely cosmetic — submission decisions
(auto-submit on expiry) are confirmed against the server.

## Autosave

Two layers:
- **IndexedDB** write on every keystroke (`idb-keyval`). Survives reloads,
  bad wifi, power loss.
- **Debounced server PATCH** every ~800ms via `fetch({ keepalive: true })`.
  Updates `answers.updated_at` so the live monitor can reflect typing.

On runner mount, server is the source of truth; if a server answer is
missing, we fall back to local IDB.

## Realtime

`supabase_realtime` publication has `sessions`, `answers`, `violations`.
- Student runner subscribes to its own `sessions` row → reacts to
  pause/resume/+time set by the teacher.
- Teacher monitor subscribes to broad changes on those three tables for
  this test's assignments → updates progress and violation counts live.

## Why no drag-and-drop

Matching and Ordering use tap-to-select / move-button interactions instead
of drag-and-drop. This:
- Works identically on desktop, iPad, Android.
- Keeps the components small (no DnD library).
- Avoids touch-vs-mouse pointer-event coordination bugs that DnD libs
  notoriously have.
