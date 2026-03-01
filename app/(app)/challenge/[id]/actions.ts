"use server";

import { checkIn as dbCheckIn } from "@/lib/db/challenges";

export async function checkInAction(
  challengeId: string,
  periodStartForDaily?: string
): Promise<{ error: string | null }> {
  const { error } = await dbCheckIn(challengeId, periodStartForDaily);
  return { error: error?.message ?? null };
}
