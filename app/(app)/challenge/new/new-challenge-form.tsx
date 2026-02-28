"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const CADENCE_OPTIONS = [
  { value: "day", label: "Every day" },
  { value: "week", label: "Every week" },
  { value: "two_weeks", label: "Every two weeks" },
  { value: "month", label: "Every month" },
] as const;

export default function NewChallengeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [cadence, setCadence] = useState<"day" | "week" | "two_weeks" | "month">("week");
  const [startDate, setStartDate] = useState("");
  const [length, setLength] = useState(4);
  const [amountDollars, setAmountDollars] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const amountCents = Math.round(parseFloat(amountDollars || "0") * 100);
    if (amountCents < 0 || !name || !startDate || length < 1) {
      setError("Please fill all fields and use a positive amount.");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in to create a challenge.");
      setLoading(false);
      return;
    }
    const endDate = computeEndDate(startDate, length, cadence);
    const { data: challenge, error: insertError } = await supabase
      .from("challenges")
      .insert({
        creator_id: user.id,
        name,
        cadence,
        start_date: startDate,
        end_date: endDate,
        length,
        amount_cents: amountCents,
        status: "open",
      })
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }
    if (!challenge) {
      setLoading(false);
      return;
    }
    await supabase.from("challenge_participants").insert({
      challenge_id: challenge.id,
      user_id: user.id,
    });
    setLoading(false);
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4 rounded border border-gray-200 bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
          Challenge name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="e.g. Morning run"
        />
      </div>
      <div>
        <label htmlFor="cadence" className="mb-1 block text-sm font-medium text-gray-700">
          Check-in cadence
        </label>
        <select
          id="cadence"
          value={cadence}
          onChange={(e) => setCadence(e.target.value as typeof cadence)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        >
          {CADENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="start_date" className="mb-1 block text-sm font-medium text-gray-700">
          Start date
        </label>
        <input
          id="start_date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="length" className="mb-1 block text-sm font-medium text-gray-700">
          Length (number of {cadence}s)
        </label>
        <input
          id="length"
          type="number"
          min={1}
          value={length}
          onChange={(e) => setLength(parseInt(e.target.value, 10) || 1)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="amount" className="mb-1 block text-sm font-medium text-gray-700">
          Amount per participant ($)
        </label>
        <input
          id="amount"
          type="number"
          min={0}
          step={0.01}
          value={amountDollars}
          onChange={(e) => setAmountDollars(e.target.value)}
          required
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="0.00"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create"}
        </button>
        <Link
          href="/"
          className="flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function computeEndDate(
  startDateStr: string,
  length: number,
  cadence: "day" | "week" | "two_weeks" | "month"
): string {
  const days: Record<string, number> = {
    day: 1,
    week: 7,
    two_weeks: 14,
    month: 30,
  };
  const d = new Date(startDateStr + "T00:00:00");
  d.setDate(d.getDate() + length * days[cadence] - 1);
  return d.toISOString().slice(0, 10);
}
