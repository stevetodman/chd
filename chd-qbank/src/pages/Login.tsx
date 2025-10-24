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
    <div className="mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-xl font-semibold">Welcome back</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={signingIn}>
          {signingIn ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <div className="mt-6 space-y-4 border-t border-neutral-200 pt-4">
        <div>
          <button
            type="button"
            onClick={() => handleTogglePanel("reset")}
            className="flex w-full items-center justify-between text-left text-sm font-semibold text-brand-700"
            aria-expanded={activePanel === "reset"}
          >
            <span>Forgot your password?</span>
            <span aria-hidden="true">{activePanel === "reset" ? "−" : "+"}</span>
          </button>
          {activePanel === "reset" ? (
            <form className="mt-3 space-y-3" onSubmit={handleSubmitPasswordReset}>
              <p className="text-sm text-neutral-600">
                Enter the email linked to your account and we&apos;ll send a secure password reset link.
              </p>
              <label className="block text-sm font-medium">
                Account email
                <input
                  type="email"
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </label>
              {resetError ? (
                <p className="text-xs text-red-600" role="alert">
                  {resetError}
                </p>
              ) : null}
              {resetMessage ? (
                <p className="text-xs text-emerald-600" role="status">
                  {resetMessage}
                </p>
              ) : null}
              <Button type="submit" className="w-full" variant="secondary" disabled={resetSending}>
                {resetSending ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          ) : null}
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm text-neutral-600">
        <p>
          Need an invite? <Link to="/signup" className="underline">Sign up</Link>
        </p>
        <p className="text-xs text-neutral-500">
          Invite codes are issued by administrators—reach out to your program lead for the latest credentials before
          submitting the signup form.
        </p>
      </div>
    </div>
  );
}
