-- Profiles: store user email for display (e.g. on challenge detail)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text
);

alter table public.profiles enable row level security;

-- Authenticated users can read any profile (to show participant emails on challenge pages)
create policy "Authenticated can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can insert/update their own profile (for backfill when they load the app)
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Sync new signups from auth.users into profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
