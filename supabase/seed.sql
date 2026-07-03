-- FBL XD Tournament July 2026 — seed data
-- Run this once in the Supabase SQL editor after schema.sql
-- Safe to re-run: it wipes and re-inserts teams/matches.

truncate table fbl_scoring.matches;
truncate table fbl_scoring.teams cascade;

insert into fbl_scoring.teams (id, group_name, team_name) values
  ('g1-1', 'A', 'Phalguni & Rohit'),
  ('g1-2', 'A', 'Vignesh & Ananya'),
  ('g1-3', 'A', 'Nishant & Parul'),
  ('g1-4', 'A', 'Ritik & Amrita'),
  ('g1-5', 'A', 'Vinay & Divya'),
  ('g1-6', 'A', 'Abhik & Srushti'),
  ('g1-7', 'A', 'Peeyush & Diya'),
  ('g2-1', 'B', 'Joshua & Shruthi'),
  ('g2-2', 'B', 'Abhishek & Priya'),
  ('g2-3', 'B', 'Hifza & Justin'),
  ('g2-4', 'B', 'Akhil & Mansa'),
  ('g2-5', 'B', 'Hussain & Ananya'),
  ('g2-6', 'B', 'zee & sharika'),
  ('g2-7', 'B', 'Kishore & Nalini');

insert into fbl_scoring.matches (match_number, stage, round, court, team_a, team_b) values
  -- Round 1
  (1, 'group', 1, 1, 'g1-1', 'g1-6'),
  (2, 'group', 1, 2, 'g1-2', 'g1-5'),
  (3, 'group', 1, 3, 'g1-3', 'g1-4'),
  -- Round 2
  (4, 'group', 2, 1, 'g1-7', 'g1-6'),
  (5, 'group', 2, 2, 'g1-1', 'g1-4'),
  (6, 'group', 2, 3, 'g1-2', 'g1-3'),
  -- Round 3
  (7, 'group', 3, 1, 'g1-7', 'g1-5'),
  (8, 'group', 3, 2, 'g1-6', 'g1-4'),
  (9, 'group', 3, 3, 'g1-1', 'g1-2'),
  -- Round 4
  (10, 'group', 4, 1, 'g2-2', 'g2-7'),
  (11, 'group', 4, 2, 'g2-3', 'g2-6'),
  (12, 'group', 4, 3, 'g2-4', 'g2-5'),
  -- Round 5
  (13, 'group', 5, 1, 'g2-1', 'g2-7'),
  (14, 'group', 5, 2, 'g2-2', 'g2-5'),
  (15, 'group', 5, 3, 'g2-3', 'g2-4'),
  -- Round 6
  (16, 'group', 6, 1, 'g1-7', 'g1-3'),
  (17, 'group', 6, 2, 'g1-4', 'g1-2'),
  (18, 'group', 6, 3, 'g1-5', 'g1-1'),
  -- Round 7
  (19, 'group', 7, 1, 'g2-1', 'g2-5'),
  (20, 'group', 7, 2, 'g2-6', 'g2-4'),
  (21, 'group', 7, 3, 'g2-7', 'g2-3'),
  -- Round 8
  (22, 'group', 8, 1, 'g1-7', 'g1-4'),
  (23, 'group', 8, 2, 'g1-5', 'g1-3'),
  (24, 'group', 8, 3, 'g1-6', 'g1-2'),
  -- Round 9
  (25, 'group', 9, 1, 'g2-1', 'g2-4'),
  (26, 'group', 9, 2, 'g2-5', 'g2-3'),
  (27, 'group', 9, 3, 'g2-6', 'g2-2'),
  -- Round 10
  (28, 'group', 10, 1, 'g1-7', 'g1-2'),
  (29, 'group', 10, 2, 'g1-3', 'g1-1'),
  (30, 'group', 10, 3, 'g1-5', 'g1-6'),
  -- Round 11
  (31, 'group', 11, 1, 'g2-1', 'g2-3'),
  (32, 'group', 11, 2, 'g2-4', 'g2-2'),
  (33, 'group', 11, 3, 'g2-6', 'g2-7'),
  -- Round 12
  (34, 'group', 12, 1, 'g1-7', 'g1-1'),
  (35, 'group', 12, 2, 'g1-3', 'g1-6'),
  (36, 'group', 12, 3, 'g1-4', 'g1-5'),
  -- Round 13
  (37, 'group', 13, 1, 'g2-1', 'g2-2'),
  (38, 'group', 13, 2, 'g2-4', 'g2-7'),
  (39, 'group', 13, 3, 'g2-5', 'g2-6'),
  -- Round 14
  (40, 'group', 14, 1, 'g2-1', 'g2-6'),
  (41, 'group', 14, 2, 'g2-7', 'g2-5'),
  (42, 'group', 14, 3, 'g2-2', 'g2-3');

-- Knockout stage placeholders — team ids are filled in by the
-- "Generate Knockout Bracket" admin action once the group stage completes.
insert into fbl_scoring.matches (match_number, stage, knockout_stage, court, team_a, team_b) values
  (43, 'knockout', 'SF1', 1, null, null),
  (44, 'knockout', 'QF', 2, null, null),
  (45, 'knockout', 'SF2', 3, null, null),
  (46, 'knockout', 'F', 1, null, null);
