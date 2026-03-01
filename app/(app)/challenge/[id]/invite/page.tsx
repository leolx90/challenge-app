import { createClient } from "@/lib/supabase/server";
import {
  getChallengeWithParticipantsAndCheckIns,
  ensureChallengeStatus,
  ensureCurrentUserProfile,
  getCurrentUserProfile,
  isParticipant,
} from "@/lib/db/challenges";
import { CADENCE_DAYS } from "@/lib/cadence";
import type { Cadence } from "@/lib/cadence";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import ChallengeDetail from "../challenge-detail";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/?redirectTo=/challenge/${id}/invite`);
  const profile = await getCurrentUserProfile();
  if (!profile?.username?.trim())
    redirect(`/onboarding?redirectTo=/challenge/${id}/invite`);

  await ensureCurrentUserProfile();
  await ensureChallengeStatus(id);
  const { challenge, participants, checkIns, error } =
    await getChallengeWithParticipantsAndCheckIns(id);
  if (error || !challenge) notFound();

  const { isParticipant: userIsParticipant } = await isParticipant(id, user.id);
  if (userIsParticipant) redirect(`/challenge/${id}`);

  const startDate = new Date(challenge.start_date + "T00:00:00");
  startDate.setHours(0, 0, 0, 0);
  const periodDays = CADENCE_DAYS[challenge.cadence as Cadence];
  const secondPeriodStart = new Date(startDate);
  secondPeriodStart.setDate(secondPeriodStart.getDate() + periodDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const joinClosed = today.getTime() >= secondPeriodStart.getTime();
  const totalCommittedCents =
    (challenge.amount_cents ?? 0) * (participants?.length ?? 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-4 inline-block truncate text-sm text-blue-600 hover:underline" title="Back to home">
          ← <span className="hidden sm:inline">Back to home</span><span className="sm:hidden">Back</span>
        </Link>
        <ChallengeDetail
          challenge={challenge}
          participants={participants ?? []}
          checkIns={checkIns ?? []}
          currentUserId={user.id}
          hasStarted={true}
          totalCheckInsNeededSoFar={0}
          userCheckInCount={0}
          alreadyCheckedInThisPeriod={false}
          totalCommittedCents={totalCommittedCents}
          payouts={[]}
          isInviteView={true}
          canJoin={!joinClosed}
          joinDisabledReason={
            joinClosed ? "Joining closed after the first period." : null
          }
        />
      </div>
    </div>
  );
}
