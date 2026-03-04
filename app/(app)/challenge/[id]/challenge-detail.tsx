"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { checkInAction, getHasCheckInForPeriodAction } from "./actions";
import { getCurrentPeriodBounds, countPeriods, formatDateForDb, formatDateLocal, CADENCE_DAYS } from "@/lib/cadence";
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
type CheckIn = { id: string; user_id: string; checked_in_at: string; period_start?: string | null };

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
  const [hasCheckInFromDb, setHasCheckInFromDb] = useState<boolean | null>(null);

  const isCreator = challenge.creator_id === currentUserId;
  const isCompleted = challenge.status === "completed";
  const cadence = challenge.cadence as Cadence;

  const { currentPeriodStartStr, currentPeriodStartUtc } = useMemo(() => {
    if (isInviteView) return { currentPeriodStartStr: "", currentPeriodStartUtc: undefined as string | undefined };
    const now = new Date();
    const { start } = getCurrentPeriodBounds(now, cadence, challenge.start_date);
    return {
      currentPeriodStartStr: formatDateLocal(start),
      currentPeriodStartUtc: formatDateForDb(start),
    };
  }, [cadence, isInviteView, challenge.start_date]);

  useEffect(() => {
    if (isInviteView || !currentPeriodStartStr) return;
    let cancelled = false;
    getHasCheckInForPeriodAction(challenge.id, currentPeriodStartStr, currentPeriodStartUtc).then(
      ({ hasCheckIn }) => {
        if (!cancelled) setHasCheckInFromDb(hasCheckIn);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [challenge.id, currentPeriodStartStr, currentPeriodStartUtc, isInviteView]);

  const localAlreadyCheckedInThisPeriod = useMemo(() => {
    if (hasCheckInFromDb !== null) return hasCheckInFromDb;
    if (isInviteView) return false;
    const now = new Date();
    const { start, end } = getCurrentPeriodBounds(now, cadence, challenge.start_date);
    const startMs = start.getTime();
    const endMs = end.getTime();
    const userIns = checkIns.filter((c) => c.user_id === currentUserId);
    return userIns.some((c) => {
      if (c.period_start != null) {
        const normalized = String(c.period_start).trim().slice(0, 10);
        if (normalized.length >= 10 && normalized === currentPeriodStartStr) return true;
      }
      const t = new Date(c.checked_in_at).getTime();
      return t >= startMs && t <= endMs;
    });
  }, [hasCheckInFromDb, cadence, isInviteView, checkIns, currentUserId, challenge.start_date, currentPeriodStartStr]);

  // Check-ins left using user's local period.
  const localCheckInsLeft = useMemo(() => {
    if (isInviteView || !hasStarted) return undefined;
    const startDate = new Date(challenge.start_date + "T00:00:00");
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(challenge.end_date + "T00:00:00");
    endDate.setHours(23, 59, 59, 999);
    const now = new Date();
    const { start: periodStart } = getCurrentPeriodBounds(now, cadence, challenge.start_date);
    const periodDays = CADENCE_DAYS[cadence];
    const nextPeriodStart = new Date(periodStart);
    nextPeriodStart.setDate(nextPeriodStart.getDate() + periodDays);
    return localAlreadyCheckedInThisPeriod
      ? countPeriods(nextPeriodStart, endDate, cadence)
      : countPeriods(periodStart, endDate, cadence);
  }, [cadence, isInviteView, hasStarted, challenge.start_date, challenge.end_date, localAlreadyCheckedInThisPeriod]);

  const hasCheckedInThisPeriod = localAlreadyCheckedInThisPeriod || justCheckedIn;
  const canCheckIn =
    hasStarted && !isCompleted && !hasCheckedInThisPeriod && !isInviteView;
  const effectiveCheckInsLeft =
    localCheckInsLeft !== undefined ? localCheckInsLeft : checkInsLeft;

  // On invite view, compute join eligibility in user's local timezone so the button state matches their calendar.
  const inviteJoinState = useMemo(() => {
    if (!isInviteView) return null;
    const periodDays = CADENCE_DAYS[challenge.cadence as Cadence];
    const [y, m, d] = challenge.start_date.split("-").map(Number);
    const secondPeriodStartDate = new Date(y, m - 1, d + periodDays);
    const today = new Date();
    const todayStr =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0");
    const secondStr =
      secondPeriodStartDate.getFullYear() +
      "-" +
      String(secondPeriodStartDate.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(secondPeriodStartDate.getDate()).padStart(2, "0");
    const joinClosed = todayStr >= secondStr;
    return {
      canJoin: !joinClosed,
      joinDisabledReason: joinClosed ? "Joining closed after the first period." : null,
    };
  }, [isInviteView, challenge.start_date, challenge.cadence]);

  // Total check-ins needed so far (all cadences use local time).
  const totalCheckInsNeededSoFarLocal = useMemo(() => {
    if (isInviteView) return totalCheckInsNeededSoFar;
    const c = challenge.cadence as Cadence;
    const startDate = new Date(challenge.start_date + "T00:00:00");
    startDate.setHours(0, 0, 0, 0);
    const challengeEnd = new Date(challenge.end_date + "T00:00:00");
    challengeEnd.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effectiveEnd = today.getTime() <= challengeEnd.getTime() ? today : challengeEnd;
    return countPeriods(startDate, effectiveEnd, c);
  }, [isInviteView, challenge.start_date, challenge.end_date, challenge.cadence, totalCheckInsNeededSoFar]);

  // Your check-ins so far: count check-ins within first N periods (all cadences use local time).
  const userCheckInCountDisplay = useMemo(() => {
    if (isInviteView) return userCheckInCount;
    const N = totalCheckInsNeededSoFarLocal;
    const c = challenge.cadence as Cadence;
    const periodDays = CADENCE_DAYS[c];
    const startDate = new Date(challenge.start_date + "T00:00:00");
    startDate.setHours(0, 0, 0, 0);
    const challengeEnd = new Date(challenge.end_date + "T00:00:00");
    challengeEnd.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effectiveEnd = today.getTime() <= challengeEnd.getTime() ? today : challengeEnd;
    const effectiveEndMs = effectiveEnd.getTime();
    const validPeriodStarts = new Set<string>();
    for (let i = 0; i < N; i++) {
      const p = new Date(startDate);
      p.setDate(p.getDate() + i * periodDays);
      validPeriodStarts.add(formatDateLocal(p));
    }
    const userIns = checkIns.filter((c) => c.user_id === currentUserId);
    let count = 0;
    for (const check of userIns) {
      if (check.period_start != null) {
        if (validPeriodStarts.has(check.period_start)) count++;
      } else {
        const t = new Date(check.checked_in_at).getTime();
        if (t >= startDate.getTime() && t <= effectiveEndMs) count++;
      }
    }
    return Math.min(count, N);
  }, [isInviteView, checkIns, currentUserId, challenge.start_date, challenge.end_date, challenge.cadence, totalCheckInsNeededSoFarLocal, userCheckInCount]);

  // Per-participant check-in count (same "within first N periods" logic, all local time).
  const participantCheckInCountDisplay = useMemo(() => {
    if (isInviteView) return new Map<string, number>();
    const N = totalCheckInsNeededSoFarLocal;
    const c = challenge.cadence as Cadence;
    const periodDays = CADENCE_DAYS[c];
    const startDate = new Date(challenge.start_date + "T00:00:00");
    startDate.setHours(0, 0, 0, 0);
    const challengeEnd = new Date(challenge.end_date + "T00:00:00");
    challengeEnd.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effectiveEnd = today.getTime() <= challengeEnd.getTime() ? today : challengeEnd;
    const effectiveEndMs = effectiveEnd.getTime();
    const validPeriodStarts = new Set<string>();
    for (let i = 0; i < N; i++) {
      const p = new Date(startDate);
      p.setDate(p.getDate() + i * periodDays);
      validPeriodStarts.add(formatDateLocal(p));
    }
    const map = new Map<string, number>();
    for (const participant of participants) {
      const userIns = checkIns.filter((ci) => ci.user_id === participant.user_id);
      let count = 0;
      for (const ci of userIns) {
        if (ci.period_start != null) {
          if (validPeriodStarts.has(ci.period_start)) count++;
        } else {
          const t = new Date(ci.checked_in_at).getTime();
          if (t >= startDate.getTime() && t <= effectiveEndMs) count++;
        }
      }
      map.set(participant.user_id, Math.min(count, N));
    }
    return map;
  }, [isInviteView, participants, checkIns, challenge.start_date, challenge.end_date, challenge.cadence, totalCheckInsNeededSoFarLocal]);

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
    const endDate = new Date(challenge.end_date + "T00:00:00");
    endDate.setHours(0, 0, 0, 0);
    if (next.getTime() > endDate.getTime()) return "N/A";
    return next.toLocaleDateString(undefined, { dateStyle: "medium" });
  }, [isCompleted, hasStarted, challenge.start_date, challenge.end_date, challenge.cadence]);

  async function doCheckIn() {
    if (!hasStarted || hasCheckedInThisPeriod) return;
    setError(null);
    setCheckingIn(true);
    setJustCheckedIn(true);
    const { start } = getCurrentPeriodBounds(new Date(), cadence, challenge.start_date);
    const periodStartStr = formatDateLocal(start);
    const { error: actionError } = await checkInAction(challenge.id, periodStartStr);
    if (actionError) {
      setJustCheckedIn(false);
      setError(actionError);
    } else {
      setHasCheckInFromDb(true);
      router.refresh();
    }
    setCheckingIn(false);
  }

  // Clear optimistic "just checked in" when refresh shows a check-in for this period.
  useEffect(() => {
    if (justCheckedIn && localAlreadyCheckedInThisPeriod) {
      setJustCheckedIn(false);
    }
  }, [justCheckedIn, localAlreadyCheckedInThisPeriod]);

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
    <div className="space-y-6 rounded border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">{challenge.name}</h1>
        <p className="mt-1 truncate text-sm text-gray-500">
          Status: <span className="font-medium capitalize">{challenge.status}</span>
        </p>
      </div>

      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <dl className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="truncate text-sm text-gray-500">Start date</dt>
          <dd className="truncate font-medium">{challenge.start_date}</dd>
        </div>
        <div className="min-w-0">
          <dt className="truncate text-sm text-gray-500">End date</dt>
          <dd className="truncate font-medium">{challenge.end_date}</dd>
        </div>
        <div className="min-w-0">
          <dt className="truncate text-sm text-gray-500">Check-in cadence</dt>
          <dd className="truncate font-medium">
            {challenge.cadence === "day"
              ? "Daily"
              : challenge.cadence === "week"
                ? "Weekly"
                : challenge.cadence === "two_weeks"
                  ? "Every 2 weeks"
                  : "Monthly"}
          </dd>
        </div>
        {!isInviteView && (
          <>
            <div className="min-w-0">
              <dt className="truncate text-sm text-gray-500">This period</dt>
              <dd className="font-medium">
                {hasCheckedInThisPeriod ? "Already checked in" : "Not yet checked in"}
              </dd>
            </div>
            {effectiveCheckInsLeft !== undefined && (
              <div className="min-w-0">
                <dt className="truncate text-sm text-gray-500">Check-ins left</dt>
                <dd className="truncate font-medium">{effectiveCheckInsLeft}</dd>
              </div>
            )}
            {nextCheckInStartDisplay !== null && (
              <div className="min-w-0">
                <dt className="truncate text-sm text-gray-500">Next check-in starts</dt>
                <dd className="truncate font-medium">{nextCheckInStartDisplay}</dd>
              </div>
            )}
            <div className="min-w-0">
              <dt className="truncate text-sm text-gray-500">Total check-ins needed so far</dt>
              <dd className="truncate font-medium">{totalCheckInsNeededSoFarLocal}</dd>
            </div>
            <div className="min-w-0">
              <dt className="truncate text-sm text-gray-500">Your check-ins so far</dt>
              <dd className="truncate font-medium">{userCheckInCountDisplay + (justCheckedIn ? 1 : 0)}</dd>
            </div>
          </>
        )}
        <div className="min-w-0">
          <dt className="truncate text-sm text-gray-500">Your committed amount</dt>
          <dd className="truncate font-medium">${(challenge.amount_cents / 100).toFixed(2)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="truncate text-sm text-gray-500">Total committed</dt>
          <dd className="truncate font-medium">${(totalCommittedCents / 100).toFixed(2)}</dd>
        </div>
      </dl>

      {isInviteView && (
        <div className="space-y-2 border-t pt-4">
          {inviteJoinState?.joinDisabledReason && (
            <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {inviteJoinState.joinDisabledReason}
            </p>
          )}
          <button
            type="button"
            onClick={handleJoin}
            disabled={joining || !inviteJoinState?.canJoin}
            className={`rounded px-4 py-2 text-sm font-medium text-white ${
              inviteJoinState?.canJoin
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
          {canCheckIn && (
            <p className="my-0 shrink-0 py-0 text-xs leading-tight text-gray-400">
              Fake check-ins? Karma&apos;s keeping score. 😅
            </p>
          )}

          <section className="border-t pt-0">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">Participants</h2>
            <ul className="space-y-2">
              {participants.map((p) => {
                const baseCount = participantCheckInCountDisplay.get(p.user_id) ?? checkIns.filter((c) => c.user_id === p.user_id).length;
                const count = baseCount + (justCheckedIn && p.user_id === currentUserId ? 1 : 0);
                const display = p.username?.trim() || p.email || `${p.user_id.slice(0, 8)}…`;
                return (
                  <li key={p.user_id} className="flex min-w-0 items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-gray-800">{display}</span>
                    <span className="shrink-0 whitespace-nowrap">{count} check-ins</span>
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
                    <li key={user_id} className="flex min-w-0 justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-gray-800">{display}</span>
                      <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
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
