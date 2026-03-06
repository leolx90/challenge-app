"use server";

import { ensureOpenChallengesStatusForUser } from "@/lib/db/challenges";

/**
 * Run status ensure for all of the user's open challenges using the viewer's local date.
 * Call from the client on home load so challenges are marked completed when the user's
 * local date is past end_date, then refresh to show updated list.
 */
export async function ensureOpenChallengesStatusAction(clientLocalDate: string): Promise<void> {
  await ensureOpenChallengesStatusForUser(clientLocalDate);
}
