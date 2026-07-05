-- FBL Tournament Management System — schema (V2, multi-tournament)
-- Run this against a fresh database. For an already-deployed database
-- that has live data in it, use migrate_v2.sql instead (it alters the
-- existing fbl_scoring.teams/matches tables in place and backfills the
-- new columns without dropping data).
--
-- Everything lives in its own schema (fbl_scoring) so it never collides
-- with tables you already have in `public`.

create schema if not exists fbl_scoring;

create extension if not exists pgcrypto;

create table if not exists fbl_scoring.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue text,
  event_date date,
  reporting_time text,
  event_type text not null check (event_type in ('XD', 'MS', 'WS', 'MD', 'WD')),
  format text not null check (format in ('round_robin', 'single_elim', 'double_elim')),
  num_groups int not null default 1,
  -- Fixed bracket size for single/double elimination, reserved at creation
  -- time (before entrants are known). Bracket generation pads with byes
  -- up to this size regardless of how many entrants were actually entered.
  num_players int,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'completed')),
  created_at timestamptz not null default now()
);

-- Only one tournament may be Live at a time.
create unique index if not exists one_live_tournament
  on fbl_scoring.tournaments ((status))
  where status = 'live';

create table if not exists fbl_scoring.groups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references fbl_scoring.tournaments(id) on delete cascade,
  name text not null
);

create table if not exists fbl_scoring.courts (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references fbl_scoring.tournaments(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table if not exists fbl_scoring.teams (
  id text primary key,
  tournament_id uuid not null references fbl_scoring.tournaments(id) on delete cascade,
  group_id uuid references fbl_scoring.groups(id) on delete set null,
  team_name text not null
);

create table if not exists fbl_scoring.players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references fbl_scoring.tournaments(id) on delete cascade,
  team_id text references fbl_scoring.teams(id) on delete cascade,
  name text not null
);

create table if not exists fbl_scoring.matches (
  id serial primary key,
  tournament_id uuid not null references fbl_scoring.tournaments(id) on delete cascade,
  match_number int not null,
  stage text not null default 'group' check (stage in ('group', 'knockout')),
  -- Free-text label for display only (e.g. 'R1', 'QF', 'SF', 'F', 'LB-R2').
  -- Bracket topology itself is carried by next_match_id/next_match_slot below,
  -- not by this label, so it is no longer constrained to a fixed set of values.
  bracket_round text,
  -- Which bracket this match belongs to, for double elimination.
  bracket text check (bracket in ('winner', 'loser', 'final')),
  round int,
  group_id uuid references fbl_scoring.groups(id) on delete set null,
  court_id uuid references fbl_scoring.courts(id) on delete set null,
  team_a text references fbl_scoring.teams(id),
  team_b text references fbl_scoring.teams(id),
  score_a int not null default 0,
  score_b int not null default 0,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'completed')),
  winner text references fbl_scoring.teams(id),
  history jsonb not null default '[]',
  started_at timestamptz,
  completed_at timestamptz,
  -- Bracket graph: where this match's winner (and, for double-elim, loser) goes next.
  next_match_id int references fbl_scoring.matches(id),
  next_match_slot text check (next_match_slot in ('a', 'b')),
  loser_next_match_id int references fbl_scoring.matches(id),
  loser_next_match_slot text check (loser_next_match_slot in ('a', 'b'))
);

create index if not exists tournaments_status_idx on fbl_scoring.tournaments (status);
create index if not exists groups_tournament_idx on fbl_scoring.groups (tournament_id);
create index if not exists courts_tournament_idx on fbl_scoring.courts (tournament_id);
create index if not exists teams_tournament_idx on fbl_scoring.teams (tournament_id);
create index if not exists teams_group_idx on fbl_scoring.teams (group_id);
create index if not exists players_tournament_idx on fbl_scoring.players (tournament_id);
create index if not exists players_team_idx on fbl_scoring.players (team_id);
create index if not exists matches_tournament_idx on fbl_scoring.matches (tournament_id);
create index if not exists matches_court_idx on fbl_scoring.matches (court_id);
create index if not exists matches_stage_idx on fbl_scoring.matches (stage);
create index if not exists matches_match_number_idx on fbl_scoring.matches (match_number);
create index if not exists matches_next_match_idx on fbl_scoring.matches (next_match_id);
create index if not exists matches_loser_next_match_idx on fbl_scoring.matches (loser_next_match_id);

alter table fbl_scoring.tournaments enable row level security;
alter table fbl_scoring.groups enable row level security;
alter table fbl_scoring.courts enable row level security;
alter table fbl_scoring.teams enable row level security;
alter table fbl_scoring.players enable row level security;
alter table fbl_scoring.matches enable row level security;

drop policy if exists "public read tournaments" on fbl_scoring.tournaments;
create policy "public read tournaments" on fbl_scoring.tournaments for select using (true);

drop policy if exists "public read groups" on fbl_scoring.groups;
create policy "public read groups" on fbl_scoring.groups for select using (true);

drop policy if exists "public read courts" on fbl_scoring.courts;
create policy "public read courts" on fbl_scoring.courts for select using (true);

drop policy if exists "public read teams" on fbl_scoring.teams;
create policy "public read teams" on fbl_scoring.teams for select using (true);

drop policy if exists "public read players" on fbl_scoring.players;
create policy "public read players" on fbl_scoring.players for select using (true);

drop policy if exists "public read matches" on fbl_scoring.matches;
create policy "public read matches" on fbl_scoring.matches for select using (true);

-- Writes are performed exclusively via the service role key from API routes,
-- which bypasses RLS, so no insert/update/delete policies are needed here.

-- Let PostgREST (used by the anon/service-role clients) reach this schema.
grant usage on schema fbl_scoring to anon, authenticated, service_role;
grant select on
  fbl_scoring.tournaments, fbl_scoring.groups, fbl_scoring.courts,
  fbl_scoring.teams, fbl_scoring.players, fbl_scoring.matches
  to anon, authenticated;
grant all on
  fbl_scoring.tournaments, fbl_scoring.groups, fbl_scoring.courts,
  fbl_scoring.teams, fbl_scoring.players, fbl_scoring.matches
  to service_role;
grant usage, select on all sequences in schema fbl_scoring to service_role;

-- Enable realtime updates on the matches table
alter publication supabase_realtime add table fbl_scoring.matches;
