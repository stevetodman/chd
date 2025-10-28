import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import config from "../config";
import { useI18n } from "../i18n";
import { getErrorMessage, normalizeErrorMessage } from "../lib/utils";
import { signUpWithInvite, SignupServiceUnavailableError } from "../lib/signUpWithInvite";

export default function Signup() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [alias, setAlias] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await signUpWithInvite(email, password, inviteCode, alias || undefined);
      setSuccessMessage(
        result.message ??
          t("auth.signup.success", {
            defaultValue: "Account created. Check your email to confirm before signing in."
          })
      );
      setEmail("");
      setPassword("");
      setInviteCode("");
      setAlias("");
    } catch (err) {
      if (err instanceof SignupServiceUnavailableError) {
        setError(
          t("auth.signup.serviceUnavailable", {
            defaultValue: "Signup is temporarily unavailable. Try again in a few minutes."
          })
        );
        return;
      }
      const fallback = t("auth.signup.submitError", {
        defaultValue: "Unable to sign up"
      });
      const normalized = normalizeErrorMessage(err);
      const derived = getErrorMessage(err, fallback);

      if (derived === "SIGNUP_FAILED") {
        setError(fallback);
        return;
      }

      if (
        normalized?.includes("failed to fetch") ||
        normalized?.includes("network request failed") ||
        normalized?.includes("network error")
      ) {
        setError(
          t("auth.signup.serviceUnavailable", {
            defaultValue: "Signup is temporarily unavailable. Try again in a few minutes."
          })
        );
        return;
      }

      if (
        normalized?.includes("already registered") ||
        normalized?.includes("already exists") ||
        normalized?.includes("duplicate") ||
        normalized?.includes("conflict")
      ) {
        setError(
          t("auth.signup.accountExists", {
            defaultValue: "An account already exists for that email. Sign in instead."
          })
        );
        return;
      }

      if (normalized?.includes("invite code required")) {
        setError(
          t("auth.signup.inviteRequired", {
            defaultValue: "Enter the invite code provided by your program lead."
          })
        );
        return;
      }

      if (normalized?.includes("invalid invite code")) {
        setError(
          t("auth.signup.inviteInvalid", {
            defaultValue: "That invite code isn’t recognized. Double-check the latest code."
          })
        );
        return;
      }

      if (normalized?.includes("invite expired")) {
        setError(
          t("auth.signup.inviteExpired", {
            defaultValue: "That invite code has expired. Request a fresh invite before signing up."
          })
        );
        return;
      }

      if (normalized?.includes("rate limit") || normalized?.includes("too many requests")) {
        setError(
          t("auth.signup.serviceUnavailable", {
            defaultValue: "Signup is temporarily unavailable. Try again in a few minutes."
          })
        );
        return;
      }

      setError(derived);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-xl font-semibold">
        {t("auth.signup.title", {
          defaultValue: "Join {app}",
          app: config.appName
        })}
      </h1>

      {successMessage ? (
        <div className="space-y-5">
          <p className="text-sm text-emerald-600" role="status" aria-live="polite">
            {successMessage}
          </p>
          <Button type="button" className="w-full" onClick={() => navigate("/login")}>
            {t("auth.signup.signInLink", { defaultValue: "Sign in" })}
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            {t("auth.shared.email", { defaultValue: "Email" })}
            <input
              type="email"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              disabled={submitting}
            />
          </label>

          <label className="block text-sm font-medium">
            {t("auth.shared.password", { defaultValue: "Password" })}
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="new-password"
              disabled={submitting}
            />
          </label>

          <label className="block text-sm font-medium">
            {t("auth.signup.inviteCode", { defaultValue: "Invite code" })}
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              required
              autoComplete="one-time-code"
              disabled={submitting}
            />
          </label>

          <label className="block text-sm font-medium">
            {t("auth.signup.aliasLabel", { defaultValue: "Preferred alias (optional)" })}
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              placeholder={t("auth.signup.aliasPlaceholder", {
                defaultValue: "Brisk-Sparrow-417"
              })}
              autoComplete="nickname"
              disabled={submitting}
            />
          </label>

          {error ? (
            <p className="text-sm text-red-600" role="alert" aria-live="assertive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? t("auth.signup.submitting", { defaultValue: "Requesting access…" })
              : t("auth.signup.submit", { defaultValue: "Request access" })}
          </Button>
        </form>
      )}

      <div className="mt-4 space-y-2 text-sm text-neutral-600">
        <p>
          {t("auth.signup.hasAccount", { defaultValue: "Already have an account?" })}{" "}
          <Link to="/login" className="underline">
            {t("auth.signup.signInLink", { defaultValue: "Sign in" })}
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
