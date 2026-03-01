"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { checkInAction } from "./actions";
import { getCurrentPeriodBounds, CADENCE_DAYS } from "@/lib/cadence";
import type { Cadence } from "@/lib/cadence";

type Challenge = {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  amount_cents: number;
  creator_id: string;
  cadence: string;
};
type Participant = {
  user_id: string;
  joined_at: string;
  email?: string | null;
  username?: string | null;
};
type CheckIn = { id: string; user_id: string; checked_in_at: string };

export default function ChallengeDetail({
  challenge,
  participants,
  checkIns,
  currentUserId,
  hasStarted,
  totalCheckInsNeededSoFar,
  userCheckInCount,
  alreadyCheckedInThisPeriod,
  totalCommittedCents,
  payouts,
  isInviteView,
  canJoin,
  joinDisabledReason,
  checkInsLeft,
  nextCheckInStartDate,
}: {
  challenge: Challenge;
  participants: Participant[];
  checkIns: CheckIn[];
  currentUserId: string;
  hasStarted: boolean;
  totalCheckInsNeededSoFar: number;
  userCheckInCount: number;
  alreadyCheckedInThisPeriod: boolean;
  totalCommittedCents: number;
  payouts: { user_id: string; count: number; payoutCents: number }[];
  isInviteView: boolean;
  canJoin?: boolean;
  joinDisabledReason?: string | null;
  checkInsLeft?: number;
  nextCheckInStartDate?: string | null;
}) {
  const router = useRouter();
  const [checkingIn, setCheckingIn] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [joining, setJoining] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreator = challenge.creator_id === currentUserId;
  const isCompleted = challenge.status === "completed";
  const hasCheckedInThisPeriod = alreadyCheckedInThisPeriod || justCheckedIn;
  const canCheckIn =
    hasStarted && !isCompleted && !hasCheckedInThisPeriod && !isInviteView;

  // On invite view, compute join eligibility in user's local timezone so the button state matches their calendar (avoids server-UTC closing join too early).
  const inviteJoinState = useMemo(() => {
    if (!isInviteView) return null;
    const startDate = new Date(challenge.start_date + "T00:00:00");
    startDate.setHours(0, 0, 0, 0);
    const periodDays = CADENCE_DAYS[challenge.cadence as Cadence];
    const secondPeriodStart = new Date(startDate);
    secondPeriodStart.setDate(secondPeriodStart.getDate() + periodDays);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const joinClosed = today.getTime() >= secondPeriodStart.getTime();
    return {
      canJoin: !joinClosed,
      joinDisabledReason: joinClosed ? "Joining closed after the first period." : null,
    };
  }, [isInviteView, challenge.start_date, challenge.cadence]);

  // Compute next check-in start in user's local timezone so it matches their calendar (avoids server-UTC off-by-one for daily).
  const nextCheckInStartDisplay = useMemo(() => {
    if (isCompleted) return null;
    if (!hasStarted)
      return new Date(challenge.start_date + "T00:00:00").toLocaleDateString(
        undefined,
        { dateStyle: "medium" }
      );
    const now = new Date();
    const { start: periodStart } = getCurrentPeriodBounds(
      now,
      challenge.cadence as Cadence,
      challenge.start_date
    );
    const periodDays = CADENCE_DAYS[challenge.cadence as Cadence];
    if (periodDays <= 0) return null;
    const next = new Date(periodStart);
    next.setDate(next.getDate() + periodDays);
    return next.toLocaleDateString(undefined, { dateStyle: "medium" });
  }, [isCompleted, hasStarted, challenge.start_date, challenge.cadence]);

  async function doCheckIn() {
    if (!hasStarted || hasCheckedInThisPeriod) return;
    setError(null);
    setCheckingIn(true);
    const { error: actionError } = await checkInAction(challenge.id);
    if (actionError) setError(actionError);
    else {
      setJustCheckedIn(true);
      router.refresh();
    }
    setCheckingIn(false);
  }

  async function handleJoin() {
    const allowed = isInviteView ? inviteJoinState?.canJoin : canJoin;
    if (!allowed) return;
    setError(null);
    setJoining(true);
    const supabase = createClient();
    const { error: e } = await supabase.from("challenge_participants").insert({
      challenge_id: challenge.id,
      user_id: currentUserId,
    });
    if (e) setError(e.message);
    else {
      router.push(`/challenge/${challenge.id}`);
      router.refresh();
    }
    setJoining(false);
  }

  async function handleDelete() {
    if (!isCreator || !confirm("Delete this challenge? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: e } = await supabase.from("challenges").delete().eq("id", challenge.id);
    if (e) setError(e.message);
    else {
      router.push("/");
      router.refresh();
    }
    setDeleting(false);
  }

  function copyInvite() {
    if (typeof window !== "undefined" && navigator.clipboard) {
      const url = `${window.location.origin}/challenge/${challenge.id}/invite`;
      navigator.clipboard.writeText(url);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    }
  }


  return (
    <div className="space-y-6 rounded border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{challenge.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Status: <span className="font-medium capitalize">{challenge.status}</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-gray-500">Start date</dt>
          <dd className="font-medium">{challenge.start_date}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-500">End date</dt>
          <dd className="font-medium">{challenge.end_date}</dd>
        </div>
        {!isInviteView && (
          <>
            <div>
              <dt className="text-sm text-gray-500">Check-in cadence</dt>
              <dd className="font-medium">
                {challenge.cadence === "day"
                  ? "Daily"
                  : challenge.cadence === "week"
                    ? "Weekly"
                    : challenge.cadence === "two_weeks"
                      ? "Every 2 weeks"
                      : "Monthly"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">This period</dt>
              <dd className="font-medium">
                {hasCheckedInThisPeriod ? "Already checked in" : "Not yet checked in"}
              </dd>
            </div>
            {checkInsLeft !== undefined && (
              <div>
                <dt className="text-sm text-gray-500">Check-ins left</dt>
                <dd className="font-medium">{checkInsLeft}</dd>
              </div>
            )}
            {nextCheckInStartDisplay !== null && (
              <div>
                <dt className="text-sm text-gray-500">Next check-in starts</dt>
                <dd className="font-medium">{nextCheckInStartDisplay}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500">Total check-ins needed so far</dt>
              <dd className="font-medium">{totalCheckInsNeededSoFar}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Your check-ins so far</dt>
              <dd className="font-medium">{userCheckInCount}</dd>
            </div>
          </>
        )}
        <div>
          <dt className="text-sm text-gray-500">Your committed amount</dt>
          <dd className="font-medium">${(challenge.amount_cents / 100).toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-500">Total committed</dt>
          <dd className="font-medium">${(totalCommittedCents / 100).toFixed(2)}</dd>
        </div>
      </dl>

      {isInviteView && (inviteJoinState ?? canJoin !== undefined) && (
        <div className="border-t pt-4 space-y-2">
          {(inviteJoinState?.joinDisabledReason ?? joinDisabledReason) && (
            <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {inviteJoinState?.joinDisabledReason ?? joinDisabledReason}
            </p>
          )}
          <button
            type="button"
            onClick={handleJoin}
            disabled={joining || !(inviteJoinState?.canJoin ?? canJoin)}
            className={`rounded px-4 py-2 text-sm font-medium text-white ${
              (inviteJoinState?.canJoin ?? canJoin)
                ? "bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                : "cursor-not-allowed bg-gray-300 text-gray-500"
            }`}
          >
            {joining ? "Joining…" : "Join challenge"}
          </button>
        </div>
      )}

      {!isInviteView && (
        <>
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <button
              type="button"
              onClick={copyInvite}
              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {inviteCopied ? "Copied!" : "Invite"}
            </button>
            {canCheckIn && (
              <button
                type="button"
                onClick={doCheckIn}
                disabled={checkingIn}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {checkingIn ? "Checking in…" : "Check in"}
              </button>
            )}
            {!canCheckIn && !isCompleted && !isInviteView && hasCheckedInThisPeriod && (
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded bg-gray-300 px-4 py-2 text-sm font-medium text-gray-500"
              >
                Checked in
              </button>
            )}
            {!canCheckIn && !isCompleted && !isInviteView && !hasStarted && (
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded bg-gray-300 px-4 py-2 text-sm font-medium text-gray-500"
              >
                Check in (challenge hasn’t started yet)
              </button>
            )}
            {isCreator && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete challenge"}
              </button>
            )}
          </div>

          <section className="border-t pt-4">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">Participants</h2>
            <ul className="space-y-2">
              {participants.map((p) => {
                const count = checkIns.filter((c) => c.user_id === p.user_id).length;
                const display = p.username?.trim() || p.email || `${p.user_id.slice(0, 8)}…`;
                return (
                  <li key={p.user_id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800">{display}</span>
                    <span>{count} check-ins</span>
                  </li>
                );
              })}
            </ul>
          </section>

          {isCompleted && payouts.length > 0 && (
            <section className="border-t pt-4">
              <h2 className="mb-3 text-lg font-semibold text-gray-800">Payouts</h2>
              <ul className="space-y-2">
                {payouts.map(({ user_id, payoutCents }) => {
                  const p = participants.find((x) => x.user_id === user_id);
                  const display =
                    p?.username?.trim() || p?.email || `${user_id.slice(0, 8)}…`;
                  const committedCents = challenge.amount_cents;
                  const deltaCents = payoutCents - committedCents;
                  const deltaFormatted =
                    deltaCents >= 0
                      ? `+ $${(deltaCents / 100).toFixed(2)}`
                      : `- $${Math.abs(deltaCents / 100).toFixed(2)}`;
                  return (
                    <li key={user_id} className="flex justify-between text-sm">
                      <span className="text-gray-800">{display}</span>
                      <span className="flex items-center gap-2">
                        <span>${(payoutCents / 100).toFixed(2)}</span>
                        <span
                          className={
                            deltaCents > 0
                              ? "text-green-600"
                              : deltaCents < 0
                                ? "text-red-600"
                                : "text-gray-500"
                          }
                        >
                          ({deltaFormatted})
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}

      {isInviteView && participants.length > 0 && (
        <section className="border-t pt-4">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">Participants</h2>
          <ul className="space-y-2">
            {participants.map((p) => {
              const count = checkIns.filter((c) => c.user_id === p.user_id).length;
              const display =
                p.username?.trim() || p.email || `${p.user_id.slice(0, 8)}…`;
              return (
                <li key={p.user_id} className="flex justify-between text-sm">
                  <span className="text-gray-800">{display}</span>
                  <span>{count} check-ins</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
