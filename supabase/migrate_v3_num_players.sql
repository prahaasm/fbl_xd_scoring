-- Adds num_players to tournaments (fixed bracket-slot count for
-- single/double elimination, reserved at creation time). Additive only,
-- safe to re-run.

alter table fbl_scoring.tournaments add column if not exists num_players int;
