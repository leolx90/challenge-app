-- Enforce one check-in per user per challenge per period in the DB.
-- 1) Compute period_start from challenge cadence and checked_in_at so DB is source of truth.
-- 2) Block insert if this user already has a check-in for the same period (same period_start).

create or replace function public.set_check_in_period_start()
returns trigger
language plpgsql
as $$
declare
  c_start date;
  c_cadence text;
  checked_date date;
  days_since int;
  period_days int;
  period_index int;
begin
  select start_date, cadence into c_start, c_cadence
  from public.challenges
  where id = new.challenge_id;
  if c_start is null then
    raise exception 'Challenge not found for check-in';
  end if;

  checked_date := (new.checked_in_at at time zone 'UTC')::date;

  if c_cadence = 'day' then
    new.period_start := checked_date;
  elsif c_cadence = 'week' then
    period_days := 7;
    days_since := checked_date - c_start;
    period_index := greatest(0, floor(days_since / period_days)::int);
    new.period_start := c_start + (period_index * period_days);
  elsif c_cadence = 'two_weeks' then
    period_days := 14;
    days_since := checked_date - c_start;
    period_index := greatest(0, floor(days_since / period_days)::int);
    new.period_start := c_start + (period_index * period_days);
  elsif c_cadence = 'month' then
    period_days := 30;
    days_since := checked_date - c_start;
    period_index := greatest(0, floor(days_since / period_days)::int);
    new.period_start := c_start + (period_index * period_days);
  else
    new.period_start := checked_date;
  end if;

  return new;
end;
$$;

drop trigger if exists set_check_in_period_start_trigger on public.check_ins;
create trigger set_check_in_period_start_trigger
before insert on public.check_ins
for each row
execute function public.set_check_in_period_start();

-- Block duplicate: if a row already exists for (challenge_id, user_id, period_start), raise.
create or replace function public.guard_check_ins_one_per_period()
returns trigger
language plpgsql
as $$
declare
  existing int;
begin
  if new.period_start is null then
    return new;
  end if;
  select count(*) into existing
  from public.check_ins
  where challenge_id = new.challenge_id
    and user_id = new.user_id
    and period_start = new.period_start;
  if existing > 0 then
    raise exception 'Already checked in for this period'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_check_ins_one_per_period_trigger on public.check_ins;
create trigger guard_check_ins_one_per_period_trigger
before insert on public.check_ins
for each row
execute function public.guard_check_ins_one_per_period();
