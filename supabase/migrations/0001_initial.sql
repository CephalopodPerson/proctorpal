-- ============================================================================
-- ProctorPal — initial schema
-- ----------------------------------------------------------------------------
-- Design notes:
--   * Teachers authenticate through Supabase Auth (auth.users). The "profiles"
--     table stores teacher metadata.
--   * Students do NOT have auth.users rows. They authenticate per-test by
--     entering a class access code + their student ID. The combination of
--     (test_assignment_id, student_id) uniquely identifies a session.
--   * A "session" is a single student's attempt at a test. It survives
--     reconnects: re-entering code+ID resumes the same session.
--   * Question content is stored as JSONB to keep schema flexible across the
--     6 question types. Validation happens in application code with zod.
--   * RLS is enabled everywhere. Teachers see only their own data.
--     Students access their session through a signed session token (see
--     /lib/session-token.ts), so RLS for student-facing reads is permissive
--     on session_id but the API gates which session_id the request can see.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ----------------------------------------------------------------------------
-- Teachers
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email citext not null,
  created_at timestamptz not null default now()
);

create unique index on public.profiles (email);

-- ----------------------------------------------------------------------------
-- Classes (a teacher's class roster)
-- ----------------------------------------------------------------------------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index on public.classes (teacher_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id text not null,           -- school-issued ID; normalized to lowercase, no whitespace
  display_name text not null,
  email text,
  created_at timestamptz not null default now()
);

-- A given student_id is unique within a class.
create unique index on public.students (class_id, student_id);
create index on public.students (class_id);

-- ----------------------------------------------------------------------------
-- Tests
-- ----------------------------------------------------------------------------
create type public.test_status as enum ('draft', 'published', 'archived');

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  status public.test_status not null default 'draft',
  -- Server-enforced settings
  duration_seconds integer not null default 1800,    -- 30 min default
  require_fullscreen boolean not null default true,
  block_copy_paste boolean not null default true,
  detect_focus_loss boolean not null default true,
  force_virtual_keyboard_on_touch boolean not null default true,
  require_teacher_admit boolean not null default false,
  shuffle_questions boolean not null default true,
  -- Display rules
  results_visibility text not null default 'after_publish'
    check (results_visibility in ('immediate', 'after_publish', 'after_close')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.tests (teacher_id);

create table public.test_sections (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  title text not null,
  position integer not null,
  -- "draw_count" semi-random pulls this many questions from the bank for each session.
  -- If null or null, all bank questions are used.
  draw_count integer,
  instructions text,
  created_at timestamptz not null default now()
);

create unique index on public.test_sections (test_id, position);

-- A section's question pool. Each section has exactly one bank in v1.
-- (Splitting bank from section is forward-looking: in v2 a teacher could
-- reuse banks across sections.)
create table public.question_banks (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.test_sections(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index on public.question_banks (section_id);

create type public.question_type as enum (
  'multiple_choice',
  'true_false',
  'short_answer',
  'long_answer',
  'matching',
  'ordering'
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references public.question_banks(id) on delete cascade,
  type public.question_type not null,
  prompt text not null,
  -- Type-specific payload. See /types/index.ts QuestionPayload union.
  -- multiple_choice: { options: [{id, text}], correct: [id...], multi_select: bool }
  -- true_false:      { correct: bool }
  -- short_answer:    { accepts: [{value, mode}], tolerance?: number }
  --                  mode is "exact" | "ci" | "ws" | "contains"
  -- long_answer:     { rubric?: string }
  -- matching:        { left: [{id, text}], right: [{id, text}], pairs: [[leftId,rightId]] }
  -- ordering:        { items: [{id, text}], correct_order: [id...] }
  payload jsonb not null,
  -- Optional media attached to the question.
  image_url text,
  youtube_id text,
  points numeric not null default 1,
  -- Author-set position within the bank. Used as a stable secondary sort.
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.questions (bank_id);

-- ----------------------------------------------------------------------------
-- Assignments (linking a test to a class with an access code)
-- ----------------------------------------------------------------------------
create table public.test_assignments (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  -- Short human-typed access code. Generated server-side, unique per active assignment.
  access_code text not null,
  opens_at timestamptz,
  closes_at timestamptz,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index on public.test_assignments (access_code) where is_open = true;
create index on public.test_assignments (test_id);
create index on public.test_assignments (class_id);

-- ----------------------------------------------------------------------------
-- Sessions: a single student's attempt
-- ----------------------------------------------------------------------------
create type public.session_status as enum (
  'pending_admit',     -- waiting for teacher to admit
  'in_progress',
  'paused',
  'submitted',
  'auto_submitted',    -- timer ran out
  'voided'             -- teacher invalidated
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.test_assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status public.session_status not null default 'pending_admit',
  -- Timer is server-authoritative. started_at + duration_seconds_remaining drives countdown.
  started_at timestamptz,
  -- Stored remaining time when paused; recalculated on resume.
  duration_seconds_remaining integer not null,
  paused_at timestamptz,
  submitted_at timestamptz,
  -- Device fingerprint to enforce one-device-per-session. The teacher can clear this
  -- via the "release device lock" action.
  device_fingerprint text,
  -- Platform info captured at session start (informs proctoring strictness).
  platform text,        -- "windows" | "mac" | "linux" | "ios" | "ipados" | "android"
  is_pwa_standalone boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A student gets at most one session per assignment. Re-entering code+ID resumes.
create unique index on public.sessions (assignment_id, student_id);
create index on public.sessions (assignment_id, status);

-- The specific questions drawn for this session, in their display order.
-- Created at session-start when the teacher admits (or immediately if no admit
-- step). Locked from there: reconnects show identical questions.
create table public.session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  section_id uuid not null references public.test_sections(id) on delete restrict,
  position integer not null,
  created_at timestamptz not null default now()
);

create unique index on public.session_questions (session_id, position);
create index on public.session_questions (session_id);

-- The student's saved answer per session_question.
-- Answer payload shape mirrors the question type:
--   multiple_choice: { selected: [optionId...] }
--   true_false:      { value: bool }
--   short_answer:    { value: string }
--   long_answer:     { value: string }
--   matching:        { pairs: [[leftId, rightId]...] }
--   ordering:        { order: [itemId...] }
create table public.answers (
  session_question_id uuid primary key references public.session_questions(id) on delete cascade,
  payload jsonb,
  -- Auto-grader output. Set when the system evaluates the answer.
  auto_score numeric,
  auto_status text,    -- "correct" | "incorrect" | "needs_review" | null
  -- Manual grader output for short-answer review queue and long-answer.
  manual_score numeric,
  manual_comment text,
  graded_by uuid references public.profiles(id),
  graded_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Proctoring violations
-- ----------------------------------------------------------------------------
create type public.violation_type as enum (
  'fullscreen_exit',
  'tab_blur',
  'visibility_hidden',
  'copy_attempt',
  'paste_attempt',
  'cut_attempt',
  'context_menu',
  'devtools_open',
  'pwa_required',
  'device_mismatch',
  'time_drift',
  'unknown'
);

create table public.violations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  type public.violation_type not null,
  -- Free-form metadata: blurred for ms, key combo, etc.
  details jsonb,
  -- Whether this violation auto-paused the session.
  paused_session boolean not null default false,
  occurred_at timestamptz not null default now()
);

create index on public.violations (session_id, occurred_at desc);

-- ----------------------------------------------------------------------------
-- Grades (final, published)
-- ----------------------------------------------------------------------------
create table public.grades (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  total_score numeric not null,
  total_possible numeric not null,
  published_at timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles            enable row level security;
alter table public.classes             enable row level security;
alter table public.students            enable row level security;
alter table public.tests               enable row level security;
alter table public.test_sections       enable row level security;
alter table public.question_banks      enable row level security;
alter table public.questions           enable row level security;
alter table public.test_assignments    enable row level security;
alter table public.sessions            enable row level security;
alter table public.session_questions   enable row level security;
alter table public.answers             enable row level security;
alter table public.violations          enable row level security;
alter table public.grades              enable row level security;

-- Helper: is the current auth user the teacher who owns this row's test/class?
-- (Inlined as policies; no SECURITY DEFINER functions to keep audit simple.)

-- profiles: a teacher reads/updates only their own profile.
create policy profiles_self on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- classes: teacher owns class
create policy classes_owner on public.classes
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- students: teacher of the class
create policy students_owner on public.students
  for all using (
    exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  );

-- tests: teacher owns
create policy tests_owner on public.tests
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- test_sections, question_banks, questions: through tests
create policy sections_owner on public.test_sections
  for all using (
    exists (select 1 from public.tests t where t.id = test_id and t.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from public.tests t where t.id = test_id and t.teacher_id = auth.uid())
  );

create policy banks_owner on public.question_banks
  for all using (
    exists (
      select 1 from public.test_sections s
      join public.tests t on t.id = s.test_id
      where s.id = section_id and t.teacher_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.test_sections s
      join public.tests t on t.id = s.test_id
      where s.id = section_id and t.teacher_id = auth.uid()
    )
  );

create policy questions_owner on public.questions
  for all using (
    exists (
      select 1 from public.question_banks b
      join public.test_sections s on s.id = b.section_id
      join public.tests t on t.id = s.test_id
      where b.id = bank_id and t.teacher_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.question_banks b
      join public.test_sections s on s.id = b.section_id
      join public.tests t on t.id = s.test_id
      where b.id = bank_id and t.teacher_id = auth.uid()
    )
  );

-- assignments: teacher who owns the test
create policy assignments_owner on public.test_assignments
  for all using (
    exists (select 1 from public.tests t where t.id = test_id and t.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from public.tests t where t.id = test_id and t.teacher_id = auth.uid())
  );

-- sessions: teacher who owns the assignment can read/update.
-- Student-facing reads/writes go through the API using the service-role key,
-- which bypasses RLS, gated by signed session tokens.
create policy sessions_teacher_read on public.sessions
  for select using (
    exists (
      select 1 from public.test_assignments a
      join public.tests t on t.id = a.test_id
      where a.id = assignment_id and t.teacher_id = auth.uid()
    )
  );

create policy sessions_teacher_update on public.sessions
  for update using (
    exists (
      select 1 from public.test_assignments a
      join public.tests t on t.id = a.test_id
      where a.id = assignment_id and t.teacher_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.test_assignments a
      join public.tests t on t.id = a.test_id
      where a.id = assignment_id and t.teacher_id = auth.uid()
    )
  );

-- session_questions, answers, violations: same teacher-read policy.
create policy sq_teacher_read on public.session_questions
  for select using (
    exists (
      select 1 from public.sessions s
      join public.test_assignments a on a.id = s.assignment_id
      join public.tests t on t.id = a.test_id
      where s.id = session_id and t.teacher_id = auth.uid()
    )
  );

create policy answers_teacher_all on public.answers
  for all using (
    exists (
      select 1 from public.session_questions sq
      join public.sessions s on s.id = sq.session_id
      join public.test_assignments a on a.id = s.assignment_id
      join public.tests t on t.id = a.test_id
      where sq.id = session_question_id and t.teacher_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.session_questions sq
      join public.sessions s on s.id = sq.session_id
      join public.test_assignments a on a.id = s.assignment_id
      join public.tests t on t.id = a.test_id
      where sq.id = session_question_id and t.teacher_id = auth.uid()
    )
  );

create policy violations_teacher_read on public.violations
  for select using (
    exists (
      select 1 from public.sessions s
      join public.test_assignments a on a.id = s.assignment_id
      join public.tests t on t.id = a.test_id
      where s.id = session_id and t.teacher_id = auth.uid()
    )
  );

create policy grades_teacher_all on public.grades
  for all using (
    exists (
      select 1 from public.sessions s
      join public.test_assignments a on a.id = s.assignment_id
      join public.tests t on t.id = a.test_id
      where s.id = session_id and t.teacher_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.sessions s
      join public.test_assignments a on a.id = s.assignment_id
      join public.tests t on t.id = a.test_id
      where s.id = session_id and t.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- Auto-update updated_at on row updates
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger tests_touch        before update on public.tests        for each row execute function public.touch_updated_at();
create trigger questions_touch    before update on public.questions    for each row execute function public.touch_updated_at();
create trigger sessions_touch     before update on public.sessions     for each row execute function public.touch_updated_at();
create trigger answers_touch      before update on public.answers      for each row execute function public.touch_updated_at();

-- ============================================================================
-- Auth bootstrap: create a profile row when a teacher signs up
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Realtime: publish session and violation changes for the live monitor.
-- ============================================================================
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.answers;
alter publication supabase_realtime add table public.violations;
