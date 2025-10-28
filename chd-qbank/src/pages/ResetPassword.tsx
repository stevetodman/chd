import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { useI18n } from "../i18n";
import { supabase } from "../lib/supabaseClient";
import { getErrorMessage } from "../lib/utils";

type FlowStatus = "checking" | "ready" | "invalid" | "success";

export default function ResetPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [status, setStatus] = useState<FlowStatus>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let timeout: number | null = null;

    const rawHash = window.location.hash?.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash ?? "";
    const hashParams = new URLSearchParams(rawHash);
    const searchParams = new URLSearchParams(window.location.search ?? "");
    const type = hashParams.get("type") ?? searchParams.get("type");
    const isRecovery = type === "recovery";
    const accessToken = hashParams.get("access_token") ?? searchParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token") ?? searchParams.get("refresh_token");
    const code = hashParams.get("code") ?? searchParams.get("code");
    const tokenHash = hashParams.get("token_hash") ?? searchParams.get("token_hash");
    const token = hashParams.get("token") ?? searchParams.get("token");
    const email = hashParams.get("email") ?? searchParams.get("email");

    if (window.location.hash) {
      const url = new URL(window.location.href);
      url.hash = "";
      window.history.replaceState(null, document.title, url.toString());
    }

    if (!isRecovery) {
      setStatus("invalid");
      return;
    }

    const resolveReady = () => {
      if (cancelled) return;
      if (timeout) {
        window.clearTimeout(timeout);
        timeout = null;
      }
      setStatus("ready");
    };

    const markInvalid = () => {
      if (cancelled) return;
      setStatus("invalid");
    };

    const verifySession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          resolveReady();
          return;
        }
        setStatus("checking");
        timeout = window.setTimeout(markInvalid, 4000);
      } catch {
        markInvalid();
      }
    };

    const attemptSessionFromHash = async () => {
      try {
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (cancelled) return;
          if (!error && data.session) {
            resolveReady();
            return true;
          }
        }

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return false;
          if (!error && data.session) {
            resolveReady();
            return true;
          }
        }

        if (tokenHash) {
          const paramsWithEmail = email ? { type: "recovery" as const, token_hash: tokenHash, email } : null;
          const paramsWithoutEmail = { type: "recovery" as const, token_hash: tokenHash };

          const { data, error } = await supabase.auth.verifyOtp(paramsWithEmail ?? paramsWithoutEmail);
          if (cancelled) return false;
          if (!error && data.session) {
            resolveReady();
            return true;
          }
        }

        if (token) {
          const { data: codeData, error: codeError } = await supabase.auth.exchangeCodeForSession(token);
          if (cancelled) return false;
          if (!codeError && codeData.session) {
            resolveReady();
            return true;
          }

          const paramsWithEmail = email ? { type: "recovery" as const, token, email } : null;
          const { data, error } = await supabase.auth.verifyOtp(paramsWithEmail ?? { type: "recovery" as const, token });
          if (cancelled) return false;
          if (!error && data.session) {
            resolveReady();
            return true;
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to establish session from recovery link", err);
        }
        markInvalid();
        return false;
      }
      return false;
    };

    void (async () => {
      const established = await attemptSessionFromHash();
      if (!established) {
        await verifySession();
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || session) {
        resolveReady();
      }
    });

    return () => {
      cancelled = true;
      if (timeout) {
        window.clearTimeout(timeout);
      }
      listener?.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError(
        t("auth.reset.passwordLength", {
          defaultValue: "Passwords must be at least 12 characters."
        })
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        t("auth.reset.passwordMismatch", {
          defaultValue: "Passwords must match."
        })
      );
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword("");
      setConfirmPassword("");
      setStatus("success");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("auth.reset.error", { defaultValue: "Unable to update password" })
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    if (status === "checking") {
      return (
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">
            {t("auth.reset.loadingTitle", { defaultValue: "Verifying reset link" })}
          </h1>
          <p className="text-sm text-neutral-600">
            {t("auth.reset.loadingDescription", {
              defaultValue: "Hang tight while we confirm your secure password reset link."
            })}
          </p>
        </div>
      );
    }

    if (status === "invalid") {
      return (
        <div className="space-y-5">
          <div className="space-y-3">
            <h1 className="text-xl font-semibold">
              {t("auth.reset.invalidTitle", { defaultValue: "Reset link expired" })}
            </h1>
            <p className="text-sm text-neutral-600">
              {t("auth.reset.invalidDescription", {
                defaultValue: "Request a new password reset email from the login page to continue."
              })}
            </p>
          </div>
          <Button type="button" className="w-full" onClick={() => navigate("/login")}>
            {t("auth.reset.goToLogin", { defaultValue: "Return to login" })}
          </Button>
        </div>
      );
    }

    if (status === "success") {
      return (
        <div className="space-y-5">
          <div className="space-y-3">
            <h1 className="text-xl font-semibold">
              {t("auth.reset.successTitle", { defaultValue: "Password updated" })}
            </h1>
            <p className="text-sm text-neutral-600">
              {t("auth.reset.successDescription", {
                defaultValue: "You can continue to the dashboard with your new password."
              })}
            </p>
          </div>
          <Button type="button" className="w-full" onClick={() => navigate("/dashboard")}>
            {t("auth.reset.goToDashboard", { defaultValue: "Go to dashboard" })}
          </Button>
        </div>
      );
    }

    return (
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <h1 className="text-xl font-semibold">
            {t("auth.reset.title", { defaultValue: "Choose a new password" })}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            {t("auth.reset.description", {
              defaultValue: "Enter and confirm a new password to finish resetting your account."
            })}
          </p>
        </div>

        <label className="block text-sm font-medium">
          {t("auth.reset.passwordLabel", { defaultValue: "New password" })}
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
          {t("auth.reset.confirmPasswordLabel", { defaultValue: "Confirm new password" })}
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            autoComplete="new-password"
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
            ? t("auth.reset.submitting", { defaultValue: "Updating password…" })
            : t("auth.reset.submit", { defaultValue: "Update password" })}
        </Button>
        <p className="text-center text-xs text-neutral-500">
          {t("auth.reset.backToLoginNote", {
            defaultValue: "Changed your mind?"
          })}{" "}
          <Link to="/login" className="underline">
            {t("auth.reset.backToLoginLink", { defaultValue: "Return to login" })}
          </Link>
        </p>
      </form>
    );
  };

  return (
    <div className="mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      {renderContent()}
    </div>
  );
}
