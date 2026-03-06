import { createClient } from "@/lib/supabase/server";
import { computeEndDate, formatDateLocal, getCurrentPeriodBounds, isInPeriod } from "@/lib/cadence";
import { isChallengeNotStartedForUser, isCompletionCutoffReached } from "@/lib/challengeDates";
import type { Cadence } from "@/lib/db/types";

/** Ensure current user has a row in profiles (so their email shows for others). Call when user is loaded. */
export async function ensureCurrentUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return;
  await supabase
    .from("profiles")
    .upsert({ id: user.id, email: user.email }, { onConflict: "id" });
}

/** Get current user's profile (for onboarding check). Returns null if not signed in. */
export async function getCurrentUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, email, username")
    .eq("id", user.id)
    .maybeSingle();
  return data;
}

export async function getChallengesForUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: new Error("Not authenticated") };

  const { data: participants, error: pe } = await supabase
    .from("challenge_participants")
    .select("challenge_id")
    .eq("user_id", user.id);
  if (pe) return { data: [], error: pe };
  if (!participants?.length) return { data: [], error: null };

  const ids = participants.map((p) => p.challenge_id);
  const { data: challenges, error } = await supabase
    .from("challenges")
    .select("*")
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (error) return { data: [], error };
  return { data: challenges ?? [], error: null };
}

export async function getChallengeById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", id)
    .single();
  return { data, error };
}

export async function getChallengeWithParticipantsAndCheckIns(id: string) {
  const supabase = await createClient();
  const { data: challenge, error: ce } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", id)
    .single();
  if (ce || !challenge) return { challenge: null, participants: [], checkIns: [], error: ce };

  const { data: participants, error: pe } = await supabase
    .from("challenge_participants")
    .select("user_id, joined_at")
    .eq("challenge_id", id)
    .order("joined_at", { ascending: true });
  if (pe) return { challenge, participants: [], checkIns: [], error: pe };

  const userIds = (participants ?? []).map((p) => p.user_id);
  const profilesMap: Record<string, { email: string | null; username: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, username")
      .in("id", userIds);
    (profiles ?? []).forEach((row) => {
      profilesMap[row.id] = {
        email: row.email ?? null,
        username: row.username ?? null,
      };
    });
  }

  const participantsWithProfile = (participants ?? []).map((p) => {
    const profile = profilesMap[p.user_id];
    return {
      user_id: p.user_id,
      joined_at: p.joined_at,
      email: profile?.email ?? null,
      username: profile?.username ?? null,
    };
  });

  const { data: checkIns, error: cie } = await supabase
    .from("check_ins")
    .select("id, user_id, checked_in_at, period_start")
    .eq("challenge_id", id)
    .order("checked_in_at", { ascending: false });
  if (cie) return { challenge, participants: participantsWithProfile, checkIns: [], error: cie };

  return {
    challenge,
    participants: participantsWithProfile,
    checkIns: checkIns ?? [],
    error: null,
  };
}

export async function isParticipant(challengeId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenge_participants")
    .select("user_id")
    .eq("challenge_id", challengeId)
    .eq("user_id", userId)
    .maybeSingle();
  return { isParticipant: !!data, error };
}

export async function createChallenge(params: {
  name: string;
  cadence: Cadence;
  start_date: string;
  length: number;
  amount_cents: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Not authenticated") };

  const startDate = new Date(params.start_date + "T00:00:00");
  const endDate = computeEndDate(startDate, params.length, params.cadence);
  const end_date = formatDateLocal(endDate);

  const { data: challenge, error: insertError } = await supabase
    .from("challenges")
    .insert({
      creator_id: user.id,
      name: params.name,
      cadence: params.cadence,
      start_date: params.start_date,
      end_date,
      length: params.length,
      amount_cents: params.amount_cents,
      status: "open",
    })
    .select()
    .single();
  if (insertError) return { data: null, error: insertError };

  const { error: participantError } = await supabase
    .from("challenge_participants")
    .insert({ challenge_id: challenge.id, user_id: user.id });
  if (participantError) {
    await supabase.from("challenges").delete().eq("id", challenge.id);
    return { data: null, error: participantError };
  }
  return { data: challenge, error: null };
}

export async function joinChallenge(challengeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };
  const { error } = await supabase.from("challenge_participants").insert({
    challenge_id: challengeId,
    user_id: user.id,
  });
  return { error };
}

export async function deleteChallenge(challengeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("challenges").delete().eq("id", challengeId);
  return { error };
}

/** Check in for the current period. Validates: authenticated, challenge exists, not started yet, not already checked in. No end-date check. */
export async function checkIn(
  challengeId: string,
  clientLocalDate: string,
  periodStartFromClient?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  const { data: challenge, error: ce } = await supabase
    .from("challenges")
    .select("cadence, start_date, end_date")
    .eq("id", challengeId)
    .single();
  if (ce || !challenge) return { error: ce ?? new Error("Challenge not found") };

  const todayLocal =
    (clientLocalDate ?? "").trim().slice(0, 10) ||
    (periodStartFromClient ?? "").trim().slice(0, 10) ||
    formatDateLocal(new Date());
  const startDateNorm = (challenge.start_date ?? "").trim().slice(0, 10);
  const endDateNorm = (challenge.end_date ?? "").trim().slice(0, 10);
  if (isChallengeNotStartedForUser(todayLocal, startDateNorm)) return { error: new Error("Challenge has not started yet") };
  if (endDateNorm.length >= 10 && todayLocal > endDateNorm) return { error: new Error("Challenge has already ended") };

  const now = new Date();
  const { start, end } = getCurrentPeriodBounds(
    now,
    challenge.cadence as Cadence,
    challenge.start_date
  );
  const periodStartDate =
    periodStartFromClient != null && periodStartFromClient.trim() !== ""
      ? periodStartFromClient.trim()
      : formatDateLocal(start);

  const { data: existing } = await supabase
    .from("check_ins")
    .select("checked_in_at, period_start")
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id);
  const periodStartNorm = periodStartDate.slice(0, 10);
  const useClientPeriod = periodStartFromClient != null && periodStartFromClient.trim() !== "";
  const alreadyCheckedIn = (existing ?? []).some((row) => {
    if (row.period_start != null) {
      const rowNorm = String(row.period_start).trim().slice(0, 10);
      if (rowNorm.length >= 10 && rowNorm === periodStartNorm) return true;
    }
    if (!useClientPeriod)
      return isInPeriod(new Date(row.checked_in_at), start, end);
    return false;
  });
  if (alreadyCheckedIn) return { error: new Error("Already checked in for this period") };

  const { error } = await supabase.from("check_ins").insert({
    challenge_id: challengeId,
    user_id: user.id,
    period_start: periodStartDate,
  });
  if (error) {
    if (error.code === "23505" || /already checked in for this period/i.test(error.message))
      return { error: new Error("Already checked in for this period") };
    return { error };
  }
  return { error: undefined };
}

/**
 * Single source of truth: does the current user have a check_ins row for this challenge and period_start?
 * Accepts both local and UTC period strings so we find rows stored in either format (legacy trigger used UTC).
 */
export async function hasCheckInForPeriod(
  challengeId: string,
  periodStartStrLocal: string,
  periodStartStrUtc?: string
): Promise<{ hasCheckIn: boolean; error?: Error }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hasCheckIn: false, error: new Error("Not authenticated") };
  const localNorm = periodStartStrLocal.trim().slice(0, 10);
  if (localNorm.length < 10) return { hasCheckIn: false };
  const candidates = [localNorm];
  if (periodStartStrUtc != null) {
    const utcNorm = periodStartStrUtc.trim().slice(0, 10);
    if (utcNorm.length >= 10 && !candidates.includes(utcNorm)) candidates.push(utcNorm);
  }
  const { data, error } = await supabase
    .from("check_ins")
    .select("id")
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id)
    .in("period_start", candidates)
    .limit(1)
    .maybeSingle();
  if (error) return { hasCheckIn: false, error };
  return { hasCheckIn: data != null };
}

/**
 * Mark challenge as completed when either:
 * - clientLocalDate is provided and clientLocalDate > end_date (user's local date past last day), or
 * - Server UTC date is at least end_date + 2 (so all timezones have had end_date and the day after).
 */
export async function ensureChallengeStatus(
  challengeId: string,
  clientLocalDate?: string
) {
  const supabase = await createClient();
  const { data: challenge } = await supabase
    .from("challenges")
    .select("end_date")
    .eq("id", challengeId)
    .eq("status", "open")
    .single();
  if (!challenge?.end_date) return;
  const endNorm = challenge.end_date.trim().slice(0, 10);
  const shouldCompleteByClient =
    clientLocalDate != null &&
    clientLocalDate.trim().slice(0, 10).length >= 10 &&
    clientLocalDate.trim().slice(0, 10) > endNorm;
  const todayUtc = new Date().toISOString().slice(0, 10);
  const shouldCompleteByUtc = isCompletionCutoffReached(todayUtc, challenge.end_date);
  if (!shouldCompleteByClient && !shouldCompleteByUtc) return;
  await supabase
    .from("challenges")
    .update({ status: "completed" })
    .eq("id", challengeId)
    .eq("status", "open");
}

/**
 * Run ensureChallengeStatus for every open challenge the current user participates in.
 * When clientLocalDate is provided, uses it so challenges are marked completed as soon as
 * the user's local date is past end_date (not only when UTC reaches end_date + 2).
 */
export async function ensureOpenChallengesStatusForUser(clientLocalDate?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: participants } = await supabase
    .from("challenge_participants")
    .select("challenge_id")
    .eq("user_id", user.id);
  if (!participants?.length) return;

  const ids = participants.map((p) => p.challenge_id);
  const { data: openChallenges } = await supabase
    .from("challenges")
    .select("id")
    .in("id", ids)
    .eq("status", "open");
  if (!openChallenges?.length) return;

  await Promise.all(
    openChallenges.map((c) => ensureChallengeStatus(c.id, clientLocalDate))
  );
}
