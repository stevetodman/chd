import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthApiError } from "@supabase/supabase-js";

import { signIn } from "../lib/auth";
import { Button } from "../components/ui/Button";
import { getErrorMessage, normalizeErrorMessage } from "../lib/utils";
import { supabase } from "../lib/supabaseClient";
import { useI18n } from "../i18n";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [activePanel, setActivePanel] = useState<"reset" | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetSending, setResetSending] = useState(false);
  const resetToggleLabel = t("auth.login.resetToggle", { defaultValue: "Forgot your password?" });
  const resetPanelId = "login-reset-panel";

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
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password?email=${encodeURIComponent(resetEmail)}`
          : undefined;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        resetEmail,
        redirectTo ? { redirectTo } : undefined
      );
      if (resetErr) throw resetErr;
      setResetMessage(
        t("auth.login.resetSuccess", {
          defaultValue: "Password reset email sent to {email}. Check your inbox to continue.",
          email: resetEmail
        })
      );
      setResetEmail("");
    } catch (err) {
      const fallback = t("auth.login.resetErrorFallback", { defaultValue: "Unable to send password reset email" });
      const normalized = normalizeErrorMessage(err);

      if (
        err instanceof AuthApiError &&
        (err.status === 429 || normalized?.includes("rate limit") || normalized?.includes("too many requests"))
      ) {
        setResetError(
          t("auth.login.resetRateLimited", {
            defaultValue: "You're requesting password emails too quickly. Wait a moment and try again."
          })
        );
        return;
      }

      if (err instanceof AuthApiError && err.status >= 500) {
        setResetError(
          t("auth.login.resetServiceUnavailable", {
            defaultValue: "Password reset is temporarily unavailable. Try again in a few minutes."
          })
        );
        return;
      }

      if (normalized?.includes("failed to fetch") || normalized?.includes("network")) {
        setResetError(
          t("auth.login.resetServiceUnavailable", {
            defaultValue: "Password reset is temporarily unavailable. Try again in a few minutes."
          })
        );
        return;
      }

      setResetError(getErrorMessage(err, fallback));
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
      const fallback = t("auth.login.signInError", { defaultValue: "Unable to sign in" });
      const normalized = normalizeErrorMessage(err);

      if (
        err instanceof AuthApiError &&
        (err.status === 429 || normalized?.includes("rate limit") || normalized?.includes("too many requests"))
      ) {
        setError(
          t("auth.login.rateLimited", {
            defaultValue: "Too many sign-in attempts. Wait a moment and try again."
          })
        );
        return;
      }

      if (err instanceof AuthApiError && err.status >= 500) {
        setError(
          t("auth.login.serviceUnavailable", {
            defaultValue: "Sign in is temporarily unavailable. Try again in a few minutes."
          })
        );
        return;
      }

      if (normalized?.includes("invalid login credentials") || normalized?.includes("invalid email") || normalized?.includes("invalid password")) {
        setError(
          t("auth.login.invalidCredentials", {
            defaultValue: "Incorrect email or password. Try again or reset your password."
          })
        );
        return;
      }

      if (normalized?.includes("email not confirmed") || normalized?.includes("email has not been confirmed") || normalized?.includes("confirm your email")) {
        setError(
          t("auth.login.emailNotConfirmed", {
            defaultValue: "Confirm your email from the message we sent before signing in."
          })
        );
        return;
      }

      if (normalized?.includes("failed to fetch") || normalized?.includes("network")) {
        setError(
          t("auth.login.serviceUnavailable", {
            defaultValue: "Sign in is temporarily unavailable. Try again in a few minutes."
          })
        );
        return;
      }

      setError(getErrorMessage(err, fallback));
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-xl font-semibold">{t("auth.login.title", { defaultValue: "Welcome back" })}</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium">
          {t("auth.shared.email", { defaultValue: "Email" })}
          <input
            type="email"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className="block text-sm font-medium">
          {t("auth.shared.password", { defaultValue: "Password" })}
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={signingIn}>
          {signingIn
            ? t("auth.login.signingIn", { defaultValue: "Signing in…" })
            : t("auth.login.submit", { defaultValue: "Sign in" })}
        </Button>
      </form>
      <div className="mt-6 space-y-4 border-t border-neutral-200 pt-4">
        <div>
          <button
            type="button"
            onClick={() => handleTogglePanel("reset")}
            className="flex w-full items-center justify-between text-left text-sm font-semibold text-brand-700"
            aria-expanded={activePanel === "reset"}
            aria-controls={resetPanelId}
            aria-label={resetToggleLabel}
          >
            <span>{resetToggleLabel}</span>
            <span aria-hidden="true">{activePanel === "reset" ? "−" : "+"}</span>
          </button>
          {activePanel === "reset" ? (
            <form id={resetPanelId} className="mt-3 space-y-3" onSubmit={handleSubmitPasswordReset}>
              <p className="text-sm text-neutral-600">
                {t("auth.login.resetDescription", {
                  defaultValue:
                    "Enter the email linked to your account and we'll send a secure password reset link."
                })}
              </p>
              <label className="block text-sm font-medium">
                {t("auth.login.resetEmailLabel", { defaultValue: "Account email" })}
                <input
                  type="email"
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  autoComplete="email"
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
                {resetSending
                  ? t("auth.login.resetSending", { defaultValue: "Sending…" })
                  : t("auth.login.resetSubmit", { defaultValue: "Send reset link" })}
              </Button>
            </form>
          ) : null}
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm text-neutral-600">
        <p>
          {t("auth.login.invitePrompt", { defaultValue: "Need an invite?" })}{" "}
          <Link to="/signup" className="underline">
            {t("auth.login.inviteLink", { defaultValue: "Sign up" })}
          </Link>
        </p>
        <p className="text-xs text-neutral-500">
          {t("auth.login.inviteNote", {
            defaultValue:
              "Invite codes are issued by administrators—reach out to your program lead for the latest credentials before submitting the signup form."
          })}
        </p>
      </div>
    </div>
  );
}
