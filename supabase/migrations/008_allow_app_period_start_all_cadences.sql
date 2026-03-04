-- Allow the app to set period_start for all cadences (user's local time).
-- When period_start is already set on insert, keep it; otherwise compute from checked_in_at.

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

  if new.period_start is not null then
    -- App sent period_start (user local); keep it.
    return new;
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
