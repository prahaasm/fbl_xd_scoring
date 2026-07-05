-- Same issue as migrate_v4_relax_group_name.sql, for matches.court: the V1
-- schema.sql created it as `int not null check (court between 1 and 3)`.
-- court_id (added in migrate_v2.sql) is the real, nullable, generalized
-- replacement, and new code (fixture/bracket generation) only populates
-- court_id, not the old court column — so inserts fail against the old
-- NOT NULL constraint. Relax it without dropping it yet (full cleanup
-- stays deferred per migrate_v2.sql's commented-out cleanup section).
--
-- Safe to re-run.

alter table fbl_scoring.matches alter column court drop not null;
alter table fbl_scoring.matches drop constraint if exists matches_court_check;
