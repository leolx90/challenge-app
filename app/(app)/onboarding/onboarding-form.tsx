"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingForm({
  redirectTo,
}: {
  redirectTo?: string;
}) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim();
    if (!name) {
      setError("Please enter a display name.");
      return;
    }
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in.");
      setLoading(false);
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .upsert(
        { id: user.id, email: user.email ?? undefined, username: name },
        { onConflict: "id" }
      );
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    const target = redirectTo?.trim() && redirectTo.startsWith("/") ? redirectTo : "/";
    router.push(target);
    router.refresh();
    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded border border-gray-200 bg-white p-6 shadow-sm"
    >
      {error && (
        <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-700">
        Display name
      </label>
      <input
        id="username"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Your name"
        required
        className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        autoFocus
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
