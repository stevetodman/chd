import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signIn } from "../lib/auth";
import { Button } from "../components/ui/Button";
import { getErrorMessage } from "../lib/utils";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [activePanel, setActivePanel] = useState<"reset" | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetSending, setResetSending] = useState(false);

  const handleTogglePanel = (panel: "reset") => {
    setActivePanel((current) => (current === panel ? null : panel));
  };

  const handleSubmitPasswordReset = async (event: FormEvent) => {
    event.preventDefault();
    setResetError(null);
    setResetMessage(null);
    if (!resetEmail) return;

    setResetSending(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail);
      if (resetErr) throw resetErr;
      setResetMessage(`Password reset email sent to ${resetEmail}. Check your inbox to continue.`);
      setResetEmail("");
    } catch (err) {
      setResetError(getErrorMessage(err, "Unable to send password reset email"));
    } finally {
      setResetSending(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSigningIn(true);
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to sign in"));
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="relative isolate grid overflow-hidden rounded-3xl border border-neutral-200/70 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur md:grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-12 text-white lg:flex">
          <div className="absolute inset-0 opacity-60 [background:radial-gradient(140%_120%_at_20%_20%,rgba(37,99,235,0.45),transparent),radial-gradient(100%_120%_at_80%_0%,rgba(30,64,175,0.4),transparent)]" />
          <div className="relative space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
              Member Portal
            </span>
            <h2 className="text-3xl font-semibold leading-snug text-white">Confident prep starts here.</h2>
            <p className="max-w-sm text-sm text-white/70">
              Sign in to your personalized workspace to continue mastering high-yield congenital heart disease concepts with
              adaptive practice and real-time analytics.
            </p>
          </div>
          <div className="relative mt-10 space-y-4">
            {["Curated board-style questions", "Performance tracking across cohorts", "Secure access backed by Supabase"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
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
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </span>
              <span>Sign in to pick up where you left off.</span>
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-neutral-900">Welcome back</h1>
              <p className="text-sm text-neutral-600">Enter your credentials to access the CHD QBank dashboard.</p>
            </div>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-neutral-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="block w-full rounded-xl border border-neutral-200 bg-white/90 px-4 py-3 text-sm text-neutral-900 shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus-visible:outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-neutral-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="block w-full rounded-xl border border-neutral-200 bg-white/90 px-4 py-3 text-sm text-neutral-900 shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus-visible:outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full justify-center" disabled={signingIn}>
                {signingIn ? "Signing in…" : "Sign in"}
              </Button>
            </form>
            <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50/80 p-4">
              <button
                type="button"
                onClick={() => handleTogglePanel("reset")}
                className="flex w-full items-center justify-between text-left text-sm font-semibold text-neutral-700"
                aria-expanded={activePanel === "reset"}
              >
                <span>Forgot your password?</span>
                <span aria-hidden="true" className="text-xl leading-none text-neutral-400">
                  {activePanel === "reset" ? "−" : "+"}
                </span>
              </button>
              {activePanel === "reset" ? (
                <form className="mt-4 space-y-4" onSubmit={handleSubmitPasswordReset}>
                  <p className="text-sm text-neutral-600">
                    Enter the email linked to your account and we&apos;ll send a secure password reset link.
                  </p>
                  <div className="space-y-2">
                    <label htmlFor="reset-email" className="text-sm font-medium text-neutral-700">
                      Account email
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      className="block w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus-visible:outline-none"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  {resetError ? (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
                      {resetError}
                    </p>
                  ) : null}
                  {resetMessage ? (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700" role="status">
                      {resetMessage}
                    </p>
                  ) : null}
                  <Button type="submit" className="w-full justify-center" variant="secondary" disabled={resetSending}>
                    {resetSending ? "Sending…" : "Send reset link"}
                  </Button>
                </form>
              ) : null}
            </div>
            <div className="space-y-2 text-sm text-neutral-600">
              <p>
                Need an invite?{' '}
                <Link to="/signup" className="font-semibold text-brand-600 underline underline-offset-4">
                  Request access
                </Link>
              </p>
              <p className="text-xs text-neutral-500">
                Invite codes are issued by administrators—reach out to your program lead for the latest credentials before
                submitting the signup form.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
