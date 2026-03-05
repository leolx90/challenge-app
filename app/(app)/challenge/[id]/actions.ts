"use server";

import { checkIn as dbCheckIn, hasCheckInForPeriod as dbHasCheckInForPeriod } from "@/lib/db/challenges";

export async function checkInAction(
  challengeId: string,
  clientLocalDate: string,
  periodStartFromClient?: string
): Promise<{ error: string | null }> {
  const { error } = await dbCheckIn(challengeId, clientLocalDate, periodStartFromClient);
  return { error: error?.message ?? null };
}

/** Returns whether the current user has a check-in for this challenge and period. Pass local + UTC period (YYYY-MM-DD) so we find rows stored in either format. */
export async function getHasCheckInForPeriodAction(
  challengeId: string,
  periodStartStrLocal: string,
  periodStartStrUtc?: string
): Promise<{ hasCheckIn: boolean; error: string | null }> {
  const { hasCheckIn, error } = await dbHasCheckInForPeriod(
    challengeId,
    periodStartStrLocal,
    periodStartStrUtc
  );
  return { hasCheckIn, error: error?.message ?? null };
}
