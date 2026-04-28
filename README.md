# ProctorPal

In-classroom online testing with proctoring. Students log in with a per-test
access code + their student ID. The runner enforces fullscreen on supported
platforms, blocks copy/paste, detects tab and focus loss, and substitutes
a custom on-screen keyboard for tablets. Auto-grading runs at submit; the
teacher reviews short-answer needs-review and grades long-answer responses
in-app, then publishes results.

## Quick start

```bash
# 1. Install
npm install

# 2. Set up a Supabase project
#    - Go to https://supabase.com → new project (free tier is fine)
#    - Settings → API: copy URL, anon key, service_role key
cp .env.example .env.local
#    Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
#    SUPABASE_SECRET_KEY, SESSION_SIGNING_SECRET (random 32+ chars).

# 3. Apply the schema
#    Easiest path: open Supabase SQL editor, paste supabase/migrations/0001_initial.sql, run.
#    Or with the supabase CLI:
#    supabase link --project-ref YOUR_REF
#    supabase db push

# 4. Run
npm run dev
# Visit http://localhost:3000 → "I'm a teacher" → Sign up
```

## Deploy

- **Frontend**: Vercel. Set the same env vars in the project settings.
- **DB / Auth / Storage**: Supabase (already set up).

## Documentation

- `docs/architecture.md` — high-level design and data model
- `docs/proctoring.md` — what each proctoring control catches, what it can't,
  and per-platform behavior
- `docs/runbook.md` — local dev tips, common debug paths

## Repo layout

```
src/
  app/                Next.js App Router pages
    take/             Student flow (entry → waiting → run → done)
    teacher/          Teacher portal (classes, tests, monitor, grade)
    api/              Route handlers (student/, teacher/, session/)
  components/
    proctoring/       Fullscreen, focus, copy/paste, virtual keyboard, paused overlay
    questions/        One component per question type + renderer
    teacher/          Test/question editor pieces
  lib/
    supabase/         Browser, server, admin clients
    proctor/          Platform detection, violation reporter
    grading/          Auto-grader
    autosave.ts       Two-tier (IDB + server) autosave
    timer.ts          Server-authoritative countdown
    session-token.ts  HMAC-signed student session tokens
    session-context.ts  Reads cookie → session payload
    utils.ts          Misc helpers (access codes, ID normalization, shuffle)
  types/
    index.ts          Domain types
supabase/
  migrations/         SQL schema + RLS + triggers
```

## Status

This is an MVP. See the verification report (printed at end of build) for
known gaps. The proctoring engine, schema, student/teacher flows, live
monitor, and grading are all in place. Polish, accessibility, multi-class
ergonomics, and analytics are forward-looking.
