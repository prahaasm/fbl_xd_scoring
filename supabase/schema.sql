-- FBL XD Tournament July 2026 — schema
-- Run this once in the Supabase SQL editor before running seed.sql
--
-- Everything lives in its own schema (fbl_scoring) so it never collides
-- with tables you already have in `public`.

create schema if not exists fbl_scoring;

create table if not exists fbl_scoring.teams (
  id text primary key,
  group_name text not null check (group_name in ('A', 'B')),
  team_name text not null
);

create table if not exists fbl_scoring.matches (
  id serial primary key,
  match_number int not null,
  stage text not null default 'group' check (stage in ('group', 'knockout')),
  knockout_stage text check (knockout_stage in ('SF1', 'QF', 'SF2', 'F')),
  round int,
  court int not null check (court between 1 and 3),
  team_a text references fbl_scoring.teams(id),
  team_b text references fbl_scoring.teams(id),
  score_a int not null default 0,
  score_b int not null default 0,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'completed')),
  winner text references fbl_scoring.teams(id),
  history jsonb not null default '[]',
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists matches_court_idx on fbl_scoring.matches (court);
create index if not exists matches_stage_idx on fbl_scoring.matches (stage);
create index if not exists matches_match_number_idx on fbl_scoring.matches (match_number);

alter table fbl_scoring.teams enable row level security;
alter table fbl_scoring.matches enable row level security;

drop policy if exists "public read teams" on fbl_scoring.teams;
create policy "public read teams" on fbl_scoring.teams for select using (true);

drop policy if exists "public read matches" on fbl_scoring.matches;
create policy "public read matches" on fbl_scoring.matches for select using (true);

-- Writes are performed exclusively via the service role key from API routes,
-- which bypasses RLS, so no insert/update/delete policies are needed here.

-- Let PostgREST (used by the anon/service-role clients) reach this schema.
grant usage on schema fbl_scoring to anon, authenticated, service_role;
grant select on fbl_scoring.teams, fbl_scoring.matches to anon, authenticated;
grant all on fbl_scoring.teams, fbl_scoring.matches to service_role;
grant usage, select on all sequences in schema fbl_scoring to service_role;

-- Enable realtime updates on the matches table
alter publication supabase_realtime add table fbl_scoring.matches;
