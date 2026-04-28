"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";

export default function LoginPage() {
  return (
    <Suspense fallback={<Shell />}>
      <Form />
    </Suspense>
  );
}

function Shell() {
  return <main className="mx-auto max-w-md px-6 py-12"><p className="text-slate-500 text-sm">Loading...</p></main>;
}

function Form() {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/teacher";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const sb = getSupabaseBrowser();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-bold">{t("auth.signInTitle")}</h1>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <Field label={t("common.email")} value={email} onChange={setEmail} type="email" />
        <Field label={t("common.password")} value={password} onChange={setPassword} type="password" />
        {error && <div className="rounded-lg bg-violation-soft p-3 text-sm text-violation">{error}</div>}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 py-3 text-white font-semibold disabled:opacity-60"
        >
          {loading ? t("auth.signingIn") : t("common.signIn")}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        {t("auth.newHere")} <Link href="/signup" className="underline">{t("auth.createAccount")}</Link>
      </p>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
      />
    </div>
  );
}
