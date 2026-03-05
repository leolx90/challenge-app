-- Option 1: Remove end-date check from the check_ins guard.
-- The app enforces "challenge has already ended" using the user's local date.
-- DB only enforces: challenge exists, status is open, and not before start_date.

create or replace function public.guard_check_ins()
returns trigger
language plpgsql
as $$
declare
  c_start date;
  c_status text;
begin
  select start_date, status
    into c_start, c_status
  from public.challenges
  where id = new.challenge_id;

  if c_start is null then
    raise exception 'Challenge not found for check-in';
  end if;

  if c_status <> 'open' then
    raise exception 'Cannot check in to a completed challenge';
  end if;

  if current_date < c_start then
    raise exception 'Challenge has not started yet';
  end if;

  return new;
end;
$$;
