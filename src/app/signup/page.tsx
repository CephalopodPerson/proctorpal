"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";

const SIGNUPS_ENABLED = process.env.NEXT_PUBLIC_ALLOW_TEACHER_SIGNUPS !== "false";

export default function SignupPage() {
  if (!SIGNUPS_ENABLED) return <ClosedNotice />;
  return <SignupForm />;
}

function ClosedNotice() {
  const t = useT();
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-bold">{t("auth.inviteOnlyTitle")}</h1>
      <p className="mt-3 text-slate-600">{t("auth.inviteOnlyBody")}</p>
      <Link
        href="/login"
        className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
      >
        {t("auth.goToSignIn")}
      </Link>
    </main>
  );
}

function SignupForm() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const sb = getSupabaseBrowser();
    const { error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/teacher");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-bold">{t("auth.signUpTitle")}</h1>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <Field label={t("auth.yourName")} value={name} onChange={setName} />
        <Field label={t("common.email")} value={email} onChange={setEmail} type="email" />
        <Field label={t("common.password")} value={password} onChange={setPassword} type="password" />
        {error && <div className="rounded-lg bg-violation-soft p-3 text-sm text-violation">{error}</div>}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 py-3 text-white font-semibold disabled:opacity-60"
        >
          {loading ? t("auth.creating") : t("auth.signUpTitle")}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        {t("auth.alreadyRegistered")} <Link href="/login" className="underline">{t("common.signIn")}</Link>
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
