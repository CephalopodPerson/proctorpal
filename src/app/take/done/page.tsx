export default function Done() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="h-12 w-12 rounded-full bg-ok-soft flex items-center justify-center text-ok text-2xl font-bold">
        ✓
      </div>
      <h1 className="mt-6 text-2xl font-bold">Submitted</h1>
      <p className="mt-2 text-slate-600">
        Your responses have been saved. Your teacher will publish results.
      </p>
    </main>
  );
}
