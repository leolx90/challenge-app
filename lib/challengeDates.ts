/**
 * Pure date helpers for challenge lifecycle.
 * - isChallengeNotStartedForUser: used by checkIn (start-date only; no end-date check).
 * - getCompletionCutoffUtc / isCompletionCutoffReached: used by ensureChallengeStatus.
 */

/** True when the user's local date is before the challenge start date. */
export function isChallengeNotStartedForUser(
  clientLocalDate: string,
  startDate: string
): boolean {
  const d = clientLocalDate.trim().slice(0, 10);
  const s = startDate.trim().slice(0, 10);
  return d.length >= 10 && s.length >= 10 && s > d;
}

/**
 * Returns the UTC date (YYYY-MM-DD) that is 2 days after end_date.
 * ensureChallengeStatus marks the challenge completed only when todayUtc >= this cutoff.
 */
export function getCompletionCutoffUtc(endDate: string): string {
  const end = new Date(endDate.trim().slice(0, 10) + "T12:00:00Z");
  end.setUTCDate(end.getUTCDate() + 2);
  return end.toISOString().slice(0, 10);
}

/** True when the server should mark the challenge as completed (todayUtc >= end_date + 2). */
export function isCompletionCutoffReached(todayUtc: string, endDate: string): boolean {
  const cutoff = getCompletionCutoffUtc(endDate);
  return todayUtc >= cutoff;
}
