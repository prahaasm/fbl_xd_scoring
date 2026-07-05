-- The V1 schema.sql created teams.group_name as NOT NULL (with a CHECK
-- restricting it to 'A'/'B'). Singles tournaments have no group at all
-- (players are entered as ungrouped teams-of-one), so inserting one hits
-- that NOT NULL constraint. group_id (added in migrate_v2.sql) is the
-- real, nullable, generalized replacement — this just relaxes the old
-- column so it stops blocking inserts, without dropping it yet (full
-- cleanup, including dropping group_name entirely, stays deferred per
-- migrate_v2.sql's commented-out cleanup section).
--
-- Safe to re-run.

alter table fbl_scoring.teams alter column group_name drop not null;
alter table fbl_scoring.teams drop constraint if exists teams_group_name_check;
