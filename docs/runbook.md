# Runbook

## Local dev

```bash
npm install
npm run dev      # http://localhost:3000
npm run typecheck
npm run lint
```

If you change the schema:

```bash
# Edit supabase/migrations/0001_initial.sql or add a 0002_*.sql
# Then in the Supabase SQL editor, paste & run the new migration.
```

## First-time data flow (smoke test)

1. Sign up at `/signup` as a teacher.
2. `/teacher/classes` → "Add" → name your class.
3. Click the class → upload a CSV with at least 1 student row.
   Format: `student_id,display_name,email`
   Example:
   ```
   student_id,display_name,email
   100001,Maria Lopez,maria@example.com
   100002,Tom Chen,tom@example.com
   ```
4. `/teacher/tests` → New test.
5. Add a section → add a few questions of different types → fill in
   prompts and correct answers.
6. At the bottom, pick the class, click Publish. Note the access code.
7. Open an incognito window → `/take` → enter the access code +
   one of the student IDs.
8. Go through the start gate. The test runs.
9. From the teacher tab, go to the test → Live monitor. You should
   see the session and any violations.
10. Submit the test. Go to `/teacher/tests/<id>/grade` to grade and
    publish.

## Common issues

- **"Invalid access code"**: the assignment is closed or the code is
  wrong. Check `test_assignments.is_open`.
- **Student sees "Student ID not found"**: verify they're on the
  uploaded roster for the class linked to this assignment, and the ID
  matches after lowercase + whitespace strip.
- **Fullscreen doesn't work on iPad**: expected. See `docs/proctoring.md`.
- **Teacher's monitor doesn't update live**: confirm the realtime
  publication includes the tables (it should from the migration). In
  Supabase: Database → Replication → publications.
- **Type errors after schema changes**: regenerate types with
  `npm run db:types` once you set up the local Supabase CLI link.

## Scaling notes

- 30 students per test fits well within Supabase free tier.
- For 100+ concurrent students per test, Supabase Pro and a careful look
  at the monitor's per-row count queries (currently does N+1 fetches).
  An RPC or a materialized view of `(session_id, answered_count, violation_count)`
  would replace the N+1.

## Production checklist (when ready)

- [ ] Set strong `SESSION_SIGNING_SECRET` (32+ random chars)
- [ ] `NEXT_PUBLIC_BASE_URL` env var for production logout redirect
- [ ] Set `ALLOWED_TEACHER_EMAIL_DOMAINS` if locking signups
- [ ] Add Supabase storage bucket for question images (currently relies
      on hotlinking; add bucket + signed URLs for privacy)
- [ ] Backup policy on Supabase (Dashboard → Database → Backups)
- [ ] Sentry or similar for client-side error tracking on the runner
