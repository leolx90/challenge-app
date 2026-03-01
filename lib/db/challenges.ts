import { createClient } from "@/lib/supabase/server";
import { computeEndDate, formatDateForDb, getCurrentPeriodBounds, isInPeriod } from "@/lib/cadence";
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
  const end_date = formatDateForDb(endDate);

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

export async function checkIn(challengeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  const { data: challenge, error: ce } = await supabase
    .from("challenges")
    .select("cadence, status, start_date")
    .eq("id", challengeId)
    .single();
  if (ce || !challenge) return { error: ce ?? new Error("Challenge not found") };
  if (challenge.status === "completed") return { error: new Error("Challenge already completed") };
  const today = new Date().toISOString().slice(0, 10);
  if (challenge.start_date > today) return { error: new Error("Challenge has not started yet") };

  const now = new Date();
  const { start, end } = getCurrentPeriodBounds(
    now,
    challenge.cadence as Cadence,
    challenge.start_date
  );
  const periodStartDate = formatDateForDb(start);

  const { data: existing } = await supabase
    .from("check_ins")
    .select("checked_in_at, period_start")
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id);
  const alreadyCheckedIn = (existing ?? []).some((row) =>
    row.period_start != null
      ? row.period_start === periodStartDate
      : isInPeriod(new Date(row.checked_in_at), start, end)
  );
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
 * Mark challenge as completed if end_date has passed. Call when loading detail.
 */
export async function ensureChallengeStatus(challengeId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("challenges")
    .update({ status: "completed" })
    .eq("id", challengeId)
    .lt("end_date", today)
    .eq("status", "open");
}
