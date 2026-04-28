import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">ProctorPal</h1>
      <p className="mt-3 text-slate-600">
        In-classroom online testing with tab-switch detection, copy/paste blocking,
        forced fullscreen, and a custom on-screen keyboard for tablets.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link
          href="/take"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <h2 className="text-xl font-semibold">I&apos;m a student</h2>
          <p className="mt-1 text-sm text-slate-600">
            Enter your access code and student ID to start a test.
          </p>
        </Link>

        <Link
          href="/login"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <h2 className="text-xl font-semibold">I&apos;m a teacher</h2>
          <p className="mt-1 text-sm text-slate-600">
            Build tests, monitor live sessions, grade responses.
          </p>
        </Link>
      </div>
    </main>
  );
}
