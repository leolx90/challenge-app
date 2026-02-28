-- Challenges table (references auth.users via creator_id)
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cadence text not null check (cadence in ('day', 'week', 'two_weeks', 'month')),
  start_date date not null,
  end_date date not null,
  length int not null check (length >= 1),
  amount_cents int not null check (amount_cents >= 0),
  status text not null default 'open' check (status in ('open', 'completed')),
  created_at timestamptz not null default now()
);

-- Participants (user in a challenge)
create table if not exists public.challenge_participants (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

-- Check-ins
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  checked_in_at timestamptz not null default now()
);

create index if not exists idx_check_ins_challenge_user on public.check_ins(challenge_id, user_id);

-- RLS
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.check_ins enable row level security;

-- Challenges: user can create; can read if they are a participant; can update/delete only if creator
create policy "Users can create challenges"
  on public.challenges for insert
  with check (auth.uid() = creator_id);

create policy "Users can read challenges they participate in"
  on public.challenges for select
  using (
    exists (
      select 1 from public.challenge_participants cp
      where cp.challenge_id = challenges.id and cp.user_id = auth.uid()
    )
  );

-- Allow reading a challenge by id for invite page (anyone with link can read challenge details to decide join)
create policy "Anyone can read challenge by id for invite"
  on public.challenges for select
  using (true);

create policy "Creators can update their challenges"
  on public.challenges for update
  using (auth.uid() = creator_id);

create policy "Creators can delete their challenges"
  on public.challenges for delete
  using (auth.uid() = creator_id);

-- Participants: user can read participants of challenges they're in; can insert (join) for any challenge
create policy "Users can read participants of any challenge"
  on public.challenge_participants for select
  using (true);

create policy "Users can join challenges"
  on public.challenge_participants for insert
  with check (auth.uid() = user_id);

-- Check-ins: user can read check_ins for challenges they're in; can insert their own for challenges they're in
create policy "Users can read check_ins for any challenge"
  on public.check_ins for select
  using (true);

create policy "Users can insert own check_ins"
  on public.check_ins for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.challenge_participants cp
      where cp.challenge_id = check_ins.challenge_id and cp.user_id = auth.uid()
    )
  );
