"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Tab = "signin" | "signup";

export default function AuthForm() {
  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMessage({ type: "success", text: "Check your email to confirm your account, then sign in." });
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    const emailToUse = forgotPasswordEmail.trim();
    if (!emailToUse) {
      setMessage({ type: "error", text: "Please enter your email address." });
      return;
    }
    setMessage(null);
    setForgotPasswordLoading(true);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(emailToUse, {
      redirectTo: `${origin}/auth/reset-password?next=${encodeURIComponent(redirectTo)}`,
    });
    setForgotPasswordLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMessage({
      type: "success",
      text: "Check your email for a link to reset your password.",
    });
    setForgotPassword(false);
    setForgotPasswordEmail("");
  }

  return (
    <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab("signin")}
          className={`flex-1 py-2 text-sm font-medium ${tab === "signin" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setTab("signup")}
          className={`flex-1 py-2 text-sm font-medium ${tab === "signup" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
        >
          Sign up
        </button>
      </div>
      {message && (
        <div
          className={`mb-4 rounded px-3 py-2 text-sm ${message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
        >
          {message.text}
        </div>
      )}

      {forgotPassword ? (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter your email and we’ll send you a link to reset your password.
          </p>
          <div>
            <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={forgotPasswordLoading}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {forgotPasswordLoading ? "Sending…" : "Send reset link"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForgotPassword(false);
              setForgotPasswordEmail("");
              setMessage(null);
            }}
            className="w-full text-sm text-gray-600 hover:text-gray-900"
          >
            Back to sign in
          </button>
        </form>
      ) : tab === "signin" ? (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label htmlFor="email-in" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email-in"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password-in" className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password-in"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded border border-gray-300 px-3 py-2 pr-16 text-sm"
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
          <button
            type="button"
            onClick={() => setForgotPassword(true)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Forgot password?
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="email-up" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email-up"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password-up" className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password-up"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded border border-gray-300 px-3 py-2 pr-16 text-sm"
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
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Signing up…" : "Sign up"}
          </button>
        </form>
      )}
    </div>
  );
}
