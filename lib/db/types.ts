export type Cadence = "day" | "week" | "two_weeks" | "month";
export type ChallengeStatus = "open" | "completed";

export interface Challenge {
  id: string;
  creator_id: string;
  name: string;
  cadence: Cadence;
  start_date: string;
  end_date: string;
  length: number;
  amount_cents: number;
  status: ChallengeStatus;
  created_at: string;
}

export interface ChallengeParticipant {
  challenge_id: string;
  user_id: string;
  joined_at: string;
}

export interface CheckIn {
  id: string;
  challenge_id: string;
  user_id: string;
  checked_in_at: string;
}
