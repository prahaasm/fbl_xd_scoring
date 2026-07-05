-- FBL Tournament Management System — V1 to V2 in-place migration
--
-- Run this ONCE against the existing deployed database that already has
-- the V1 schema.sql (single tournament, fbl_scoring.teams/matches with
-- group_name/court/knockout_stage columns) applied and populated with
-- live tournament data. It is idempotent (safe to re-run) and does NOT
-- drop or truncate any existing rows.
--
-- After running this and verifying the app works end-to-end against the
-- new columns, run the "cleanup" statements at the bottom (in a separate,
-- deliberate step) to drop the old group_name/court/knockout_stage columns.

create extension if not exists pgcrypto;

-- 1. Create the new tables (safe if they already exist).



create table if not exists fbl_scoring.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue text,
  event_date date,
  reporting_time text,
  event_type text not null check (event_type in ('XD', 'MS', 'WS', 'MD', 'WD')),
  format text not null check (format in ('round_robin', 'single_elim', 'double_elim')),
  num_groups int not null default 1,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'completed')),
  created_at timestamptz not null default now()
);

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

create table if not exists fbl_scoring.players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references fbl_scoring.tournaments(id) on delete cascade,
  team_id text,
  name text not null
);

-- 2. Add new columns to the existing teams/matches tables (existing rows
--    get NULL for these until backfilled in step 4 below).

alter table fbl_scoring.teams add column if not exists tournament_id uuid;
alter table fbl_scoring.teams add column if not exists group_id uuid;

alter table fbl_scoring.matches add column if not exists tournament_id uuid;
alter table fbl_scoring.matches add column if not exists bracket_round text;
alter table fbl_scoring.matches add column if not exists bracket text
  check (bracket in ('winner', 'loser', 'final'));
alter table fbl_scoring.matches add column if not exists group_id uuid;
alter table fbl_scoring.matches add column if not exists court_id uuid;
alter table fbl_scoring.matches add column if not exists next_match_id int
  references fbl_scoring.matches(id);
alter table fbl_scoring.matches add column if not exists next_match_slot text
  check (next_match_slot in ('a', 'b'));
alter table fbl_scoring.matches add column if not exists loser_next_match_id int
  references fbl_scoring.matches(id);
alter table fbl_scoring.matches add column if not exists loser_next_match_slot text
  check (loser_next_match_slot in ('a', 'b'));

-- 3. Seed one tournament row representing the existing live FBL XD
--    tournament, plus its groups and courts, but only if it hasn't
--    already been created by a prior run of this script.

insert into fbl_scoring.tournaments (id, name, venue, event_type, format, num_groups, status)
select gen_random_uuid(), 'FBL XD Tournament', null, 'XD', 'round_robin', 2, 'live'
where not exists (select 1 from fbl_scoring.tournaments where name = 'FBL XD Tournament');

insert into fbl_scoring.groups (tournament_id, name)
select t.id, g.name
from fbl_scoring.tournaments t
cross join (values ('Group 1'), ('Group 2')) as g(name)
where t.name = 'FBL XD Tournament'
  and not exists (
    select 1 from fbl_scoring.groups gr where gr.tournament_id = t.id and gr.name = g.name
  );

insert into fbl_scoring.courts (tournament_id, name, sort_order)
select t.id, c.name, c.sort_order
from fbl_scoring.tournaments t
cross join (values ('Court 1', 1), ('Court 2', 2), ('Court 3', 3)) as c(name, sort_order)
where t.name = 'FBL XD Tournament'
  and not exists (
    select 1 from fbl_scoring.courts co where co.tournament_id = t.id and co.name = c.name
  );

-- 4. Backfill tournament_id/group_id/court_id on the existing teams/matches
--    rows from the tournament/groups/courts rows just created above.
--    (group_name 'A' -> 'Group 1', 'B' -> 'Group 2'; court int 1/2/3 -> the
--    matching Court N row.)

update fbl_scoring.teams t
set tournament_id = tr.id
from fbl_scoring.tournaments tr
where tr.name = 'FBL XD Tournament' and t.tournament_id is null;

update fbl_scoring.teams t
set group_id = g.id
from fbl_scoring.groups g
where g.tournament_id = t.tournament_id
  and t.group_id is null
  and (
    (t.group_name = 'A' and g.name = 'Group 1') or
    (t.group_name = 'B' and g.name = 'Group 2')
  );

update fbl_scoring.matches m
set tournament_id = tr.id
from fbl_scoring.tournaments tr
where tr.name = 'FBL XD Tournament' and m.tournament_id is null;

update fbl_scoring.matches m
set court_id = c.id
from fbl_scoring.courts c
where c.tournament_id = m.tournament_id
  and m.court_id is null
  and c.name = 'Court ' || m.court;

update fbl_scoring.matches m
set group_id = t.group_id
from fbl_scoring.teams t
where m.stage = 'group'
  and m.group_id is null
  and t.id = m.team_a;

update fbl_scoring.matches m
set bracket_round = m.knockout_stage,
    bracket = 'winner'
where m.stage = 'knockout' and m.bracket_round is null;

-- 5. Reproduce today's hardcoded bracket wiring
--    (QF winner -> SF2.team_b, SF1 winner -> Final.team_a, SF2 winner -> Final.team_b)
--    as real next_match_id/next_match_slot graph edges, so the generic
--    advanceBracket() function produces identical behavior to the old
--    cascadeKnockout().

update fbl_scoring.matches qf
set next_match_id = sf2.id, next_match_slot = 'b'
from fbl_scoring.matches sf2
where qf.knockout_stage = 'QF'
  and sf2.knockout_stage = 'SF2'
  and sf2.tournament_id = qf.tournament_id
  and qf.next_match_id is null;

update fbl_scoring.matches sf1
set next_match_id = f.id, next_match_slot = 'a'
from fbl_scoring.matches f
where sf1.knockout_stage = 'SF1'
  and f.knockout_stage = 'F'
  and f.tournament_id = sf1.tournament_id
  and sf1.next_match_id is null;

update fbl_scoring.matches sf2
set next_match_id = f.id, next_match_slot = 'b'
from fbl_scoring.matches f
where sf2.knockout_stage = 'SF2'
  and f.knockout_stage = 'F'
  and f.tournament_id = sf2.tournament_id
  and sf2.next_match_id is null;

-- 6. New indexes / RLS / grants for the new tables (safe if already present).

create index if not exists tournaments_status_idx on fbl_scoring.tournaments (status);
create index if not exists groups_tournament_idx on fbl_scoring.groups (tournament_id);
create index if not exists courts_tournament_idx on fbl_scoring.courts (tournament_id);
create index if not exists teams_tournament_idx on fbl_scoring.teams (tournament_id);
create index if not exists teams_group_idx on fbl_scoring.teams (group_id);
create index if not exists players_tournament_idx on fbl_scoring.players (tournament_id);
create index if not exists players_team_idx on fbl_scoring.players (team_id);
create index if not exists matches_tournament_idx on fbl_scoring.matches (tournament_id);
create index if not exists matches_court_idx on fbl_scoring.matches (court_id);
create index if not exists matches_next_match_idx on fbl_scoring.matches (next_match_id);
create index if not exists matches_loser_next_match_idx on fbl_scoring.matches (loser_next_match_id);

alter table fbl_scoring.tournaments enable row level security;
alter table fbl_scoring.groups enable row level security;
alter table fbl_scoring.courts enable row level security;
alter table fbl_scoring.players enable row level security;

drop policy if exists "public read tournaments" on fbl_scoring.tournaments;
create policy "public read tournaments" on fbl_scoring.tournaments for select using (true);

drop policy if exists "public read groups" on fbl_scoring.groups;
create policy "public read groups" on fbl_scoring.groups for select using (true);

drop policy if exists "public read courts" on fbl_scoring.courts;
create policy "public read courts" on fbl_scoring.courts for select using (true);

drop policy if exists "public read players" on fbl_scoring.players;
create policy "public read players" on fbl_scoring.players for select using (true);

grant usage on schema fbl_scoring to anon, authenticated, service_role;
grant select on
  fbl_scoring.tournaments, fbl_scoring.groups, fbl_scoring.courts, fbl_scoring.players
  to anon, authenticated;
grant all on
  fbl_scoring.tournaments, fbl_scoring.groups, fbl_scoring.courts, fbl_scoring.players
  to service_role;
grant usage, select on all sequences in schema fbl_scoring to service_role;

-- ---------------------------------------------------------------------
-- CLEANUP (run manually, AFTER verifying the app works against the new
-- columns end-to-end). Not run automatically by this script.
-- ---------------------------------------------------------------------
-- alter table fbl_scoring.teams drop column group_name;
-- alter table fbl_scoring.matches drop column court;
-- alter table fbl_scoring.matches drop column knockout_stage;
-- alter table fbl_scoring.teams alter column tournament_id set not null;
-- alter table fbl_scoring.matches alter column tournament_id set not null;
