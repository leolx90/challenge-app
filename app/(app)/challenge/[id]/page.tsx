import { createClient } from "@/lib/supabase/server";
import {
  getChallengeWithParticipantsAndCheckIns,
  ensureChallengeStatus,
  ensureCurrentUserProfile,
  getCurrentUserProfile,
  isParticipant,
} from "@/lib/db/challenges";
import { countPeriods, formatDateForDb, getCurrentPeriodBounds, isInPeriod, CADENCE_DAYS } from "@/lib/cadence";
import type { Cadence } from "@/lib/cadence";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import ChallengeDetail from "./challenge-detail";

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/?redirectTo=/challenge/${id}`);
  const profile = await getCurrentUserProfile();
  if (!profile?.username?.trim())
    redirect(`/onboarding?redirectTo=/challenge/${id}`);

  await ensureCurrentUserProfile();
  await ensureChallengeStatus(id);
  const { challenge, participants, checkIns, error } =
    await getChallengeWithParticipantsAndCheckIns(id);
  if (error || !challenge) notFound();

  const { isParticipant: userIsParticipant } = await isParticipant(id, user.id);
  if (!userIsParticipant) redirect(`/challenge/${id}/invite`);

  const startDate = new Date(challenge.start_date + "T00:00:00");
  const startDate0 = new Date(startDate);
  startDate0.setHours(0, 0, 0, 0);
  const endDate = new Date(challenge.end_date + "T00:00:00");
  const today = new Date();
  const today0 = new Date(today);
  today0.setHours(0, 0, 0, 0);
  const hasStarted = today0.getTime() >= startDate0.getTime();
  const effectiveEnd =
    today < endDate ? today : endDate;
  const totalCheckInsNeededSoFar = countPeriods(
    startDate,
    effectiveEnd,
    challenge.cadence as Cadence
  );
  const userCheckIns = (checkIns ?? []).filter((c) => c.user_id === user.id);
  const { start: periodStart, end: periodEnd } = getCurrentPeriodBounds(
    today,
    challenge.cadence as Cadence,
    challenge.start_date
  );
  const currentPeriodStartStr = formatDateForDb(periodStart);
  const alreadyCheckedInThisPeriod = userCheckIns.some((c) =>
    c.period_start != null
      ? c.period_start === currentPeriodStartStr
      : isInPeriod(new Date(c.checked_in_at), periodStart, periodEnd)
  );
  const cadence = challenge.cadence as Cadence;
  const periodDays = CADENCE_DAYS[cadence];
  const nextPeriodStart =
    periodDays > 0
      ? (() => {
          const next = new Date(periodStart);
          next.setDate(next.getDate() + periodDays);
          return next;
        })()
      : null;
  const endDate0 = new Date(endDate);
  endDate0.setHours(23, 59, 59, 999);
  const checkInsLeft = hasStarted
    ? alreadyCheckedInThisPeriod && nextPeriodStart
      ? countPeriods(nextPeriodStart, endDate0, cadence)
      : countPeriods(periodStart, endDate0, cadence)
    : countPeriods(startDate, endDate0, cadence);
  const nextCheckInStartDate =
    challenge.status === "completed"
      ? null
      : !hasStarted
        ? challenge.start_date
        : nextPeriodStart
          ? nextPeriodStart.toISOString().slice(0, 10)
          : null;
  const totalCommittedCents =
    (challenge.amount_cents ?? 0) * (participants?.length ?? 0);
  const totalCheckInCount = checkIns?.length ?? 0;
  const payouts =
    challenge.status === "completed" && participants
      ? participants.map((p) => {
          const count = checkIns?.filter((c) => c.user_id === p.user_id).length ?? 0;
          const payoutCents =
            totalCheckInCount > 0
              ? Math.round((count / totalCheckInCount) * totalCommittedCents)
              : 0;
          return { user_id: p.user_id, count, payoutCents };
        })
      : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to home
        </Link>
        <ChallengeDetail
          challenge={challenge}
          participants={participants ?? []}
          checkIns={checkIns ?? []}
          currentUserId={user.id}
          hasStarted={hasStarted}
          totalCheckInsNeededSoFar={totalCheckInsNeededSoFar}
          userCheckInCount={userCheckIns.length}
          alreadyCheckedInThisPeriod={alreadyCheckedInThisPeriod}
          totalCommittedCents={totalCommittedCents}
          payouts={payouts}
          isInviteView={false}
          checkInsLeft={checkInsLeft}
          nextCheckInStartDate={nextCheckInStartDate}
        />
      </div>
    </div>
  );
}
