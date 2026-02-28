"use server";

import { checkIn as dbCheckIn } from "@/lib/db/challenges";

export async function checkInAction(challengeId: string): Promise<{ error: string | null }> {
  const { error } = await dbCheckIn(challengeId);
  return { error: error?.message ?? null };
}
