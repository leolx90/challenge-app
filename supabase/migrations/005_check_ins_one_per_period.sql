-- One check-in per user per challenge per cadence period.
-- New rows must set period_start (YYYY-MM-DD of period start); duplicate (challenge_id, user_id, period_start) is rejected.
alter table public.check_ins
  add column if not exists period_start date;

create unique index if not exists idx_check_ins_one_per_period
  on public.check_ins (challenge_id, user_id, period_start)
  where period_start is not null;
