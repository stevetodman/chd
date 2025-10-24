import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Button } from "../components/ui/Button";
import { getErrorMessage } from "../lib/utils";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", invite_code: "", desired_alias: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      // Supabase Edge Function validates invite code and seeds alias server-side.
      const { data, error: fnError } = await supabase.functions.invoke("signup-with-code", {
        body: form,
        headers: { "Idempotency-Key": idempotencyKey }
      });
      if (fnError) throw fnError;
      if (!data?.ok) throw new Error(data?.error ?? "Failed to create account");
      setSuccess("Account created. Please sign in.");
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to sign up"));
    } finally {
      setIdempotencyKey(crypto.randomUUID());
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="relative isolate grid overflow-hidden rounded-3xl border border-neutral-200/70 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur md:grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-12 text-white lg:flex">
          <div className="absolute inset-0 opacity-60 [background:radial-gradient(140%_120%_at_20%_20%,rgba(37,99,235,0.45),transparent),radial-gradient(100%_120%_at_80%_0%,rgba(30,64,175,0.4),transparent)]" />
          <div className="relative space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
              Secure onboarding
            </span>
            <h2 className="text-3xl font-semibold leading-snug text-white">Invitation-only access built for teams.</h2>
            <p className="max-w-sm text-sm text-white/70">
              Use your program-issued invite code to activate curated practice, collaborative analytics, and modern admin
              tooling—all designed for congenital heart disease training programs.
            </p>
          </div>
          <div className="relative mt-10 space-y-4">
            {["Verified cohort management", "Analytics-ready from day one", "Privacy-first architecture"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex flex-col justify-center px-6 py-10 sm:px-10">
          <div className="lg:hidden">
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/80 px-4 py-3 text-sm font-medium text-brand-700">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600">
                <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </span>
              <span>Submit your program credentials to unlock access.</span>
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-neutral-900">Request access to CHD QBank</h1>
              <p className="text-sm text-neutral-600">
                Enter your invite code and program email to set up your secure training environment in minutes.
              </p>
            </div>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="signup-email" className="text-sm font-medium text-neutral-700">
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  className="block w-full rounded-xl border border-neutral-200 bg-white/90 px-4 py-3 text-sm text-neutral-900 shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus-visible:outline-none"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="signup-password" className="text-sm font-medium text-neutral-700">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  className="block w-full rounded-xl border border-neutral-200 bg-white/90 px-4 py-3 text-sm text-neutral-900 shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus-visible:outline-none"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="invite-code" className="text-sm font-medium text-neutral-700">
                  Invite code
                </label>
                <input
                  id="invite-code"
                  type="text"
                  className="block w-full rounded-xl border border-neutral-200 bg-white/90 px-4 py-3 text-sm uppercase tracking-[0.5em] text-neutral-900 shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus-visible:outline-none"
                  value={form.invite_code}
                  onChange={(e) => setForm({ ...form, invite_code: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="desired-alias" className="text-sm font-medium text-neutral-700">
                  Preferred alias <span className="text-neutral-400">(optional)</span>
                </label>
                <input
                  id="desired-alias"
                  type="text"
                  className="block w-full rounded-xl border border-neutral-200 bg-white/90 px-4 py-3 text-sm text-neutral-900 shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus-visible:outline-none"
                  value={form.desired_alias}
                  onChange={(e) => setForm({ ...form, desired_alias: e.target.value })}
                  placeholder="Brisk-Sparrow-417"
                  maxLength={40}
                />
              </div>
              {error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700" role="alert">
                  {error}
                </p>
              ) : null}
              {success ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700" role="status">
                  {success}
                </p>
              ) : null}
              <Button type="submit" className="w-full justify-center">
                Request access
              </Button>
            </form>
            <p className="text-sm text-neutral-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand-600 underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
