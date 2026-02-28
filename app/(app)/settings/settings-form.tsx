"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsForm({
  initialUsername,
  initialEmail,
}: {
  initialUsername: string;
  initialEmail: string;
}) {
  const [username, setUsername] = useState(initialUsername);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    const supabase = createClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      setSaving(false);
      setMessage({ type: "error", text: "You must be signed in." });
      return;
    }

    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert({ id: user.id, email: user.email, username }, { onConflict: "id" });
    if (profileErr) {
      setSaving(false);
      setMessage({ type: "error", text: profileErr.message });
      return;
    }

    if (email && email !== (user.email ?? "")) {
      const { error: emailErr } = await supabase.auth.updateUser({ email });
      if (emailErr) {
        setSaving(false);
        setMessage({ type: "error", text: emailErr.message });
        return;
      }
    }

    if (password.trim().length > 0) {
      const { error: passErr } = await supabase.auth.updateUser({ password });
      if (passErr) {
        setSaving(false);
        setMessage({ type: "error", text: passErr.message });
        return;
      }
      setPassword("");
    }

    setSaving(false);
    setMessage({
      type: "success",
      text: "Saved. If you changed email, you may need to confirm it via email.",
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 rounded border border-gray-200 bg-white p-6 shadow-sm">
      {message && (
        <div
          className={`rounded px-3 py-2 text-sm ${
            message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div>
        <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-700">
          User name
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="Your name"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
          New password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="Leave blank to keep current password"
          minLength={6}
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

