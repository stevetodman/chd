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
    <div className="mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-xl font-semibold">Join CHD QBank</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Invite code
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 uppercase tracking-widest"
            value={form.invite_code}
            onChange={(e) => setForm({ ...form, invite_code: e.target.value })}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Preferred alias (optional)
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            value={form.desired_alias}
            onChange={(e) => setForm({ ...form, desired_alias: e.target.value })}
            placeholder="Brisk-Sparrow-417"
            maxLength={40}
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
        <Button type="submit" className="w-full">
          Request access
        </Button>
      </form>
      <p className="mt-4 text-sm text-neutral-600">
        Already have an account? <Link to="/login" className="underline">Sign in</Link>
      </p>
    </div>
  );
}
