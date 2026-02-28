"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "ready" | "success" | "error">("loading");
  const [nextUrl, setNextUrl] = useState("/");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next) setNextUrl(next);

    const hash = window.location.hash.slice(1);
    const hashParams = hash ? new URLSearchParams(hash) : null;
    const access_token = hashParams?.get("access_token");
    const refresh_token = hashParams?.get("refresh_token");
    const token_hash = params.get("token_hash");
    const type = params.get("type");

    async function processTokens() {
      const supabase = createClient();

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) {
          setStep("error");
          return;
        }
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        setStep("ready");
        return;
      }

      if (token_hash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: "recovery",
        });
        if (error) {
          setStep("error");
          return;
        }
        setStep("ready");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStep("ready");
        return;
      }

      setStep("error");
    }

    processTokens();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (password.length < 6) {
      setSubmitError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    setStep("success");
    router.push(nextUrl);
    router.refresh();
  }

  if (step === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-4">
        <h1 className="text-xl font-semibold text-gray-900">Invalid or expired link</h1>
        <p className="text-center text-gray-600">
          This password reset link is invalid or has expired. Please request a new one from the sign-in page.
        </p>
        <a href="/" className="text-blue-600 hover:underline">
          Back to sign in
        </a>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-600">Password updated. Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">Set new password</h1>
        <p className="mb-6 text-sm text-gray-600">
          Enter your new password below. You’ll stay logged in after this.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</div>
          )}
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-700">
              New password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded border border-gray-300 px-3 py-2 pr-14 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-gray-700">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
