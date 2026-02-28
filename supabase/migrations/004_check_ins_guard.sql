create or replace function public.guard_check_ins()
returns trigger
language plpgsql
as $$
declare
  c_start date;
  c_end date;
  c_status text;
begin
  select start_date, end_date, status
    into c_start, c_end, c_status
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

  if current_date > c_end then
    raise exception 'Challenge has already ended';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_check_ins_before_insert on public.check_ins;
create trigger guard_check_ins_before_insert
before insert on public.check_ins
for each row
execute function public.guard_check_ins();

