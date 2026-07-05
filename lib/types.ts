export type Role = 'admin' | `court${number}`;

export function isCourtRole(role: string): role is `court${number}` {
  return /^court\d+$/.test(role);
}

export interface User {
  username: string;
  password: string;
  role: Role;
}

export type TournamentEventType = 'XD' | 'MS' | 'WS' | 'MD' | 'WD';
export type TournamentFormat = 'round_robin' | 'single_elim' | 'double_elim';
export type TournamentStatus = 'upcoming' | 'live' | 'completed';

export interface Tournament {
  id: string;
  name: string;
  venue: string | null;
  event_date: string | null;
  reporting_time: string | null;
  event_type: TournamentEventType;
  format: TournamentFormat;
  num_groups: number;
  num_players: number | null;
  status: TournamentStatus;
  created_at: string;
}

export interface Group {
  id: string;
  tournament_id: string;
  name: string;
}

export interface Court {
  id: string;
  tournament_id: string;
  name: string;
  sort_order: number;
}

export interface Team {
  id: string;
  tournament_id: string;
  group_id: string | null;
  team_name: string;
}

export interface Player {
  id: string;
  tournament_id: string;
  team_id: string | null;
  name: string;
}

export type MatchStatus = 'upcoming' | 'live' | 'completed';
export type Stage = 'group' | 'knockout';
export type Bracket = 'winner' | 'loser' | 'final';
export type MatchSlot = 'a' | 'b';

export interface ScoreSnapshot {
  score_a: number;
  score_b: number;
}

export interface Match {
  id: number;
  tournament_id: string;
  match_number: number;
  stage: Stage;
  bracket_round: string | null;
  bracket: Bracket | null;
  round: number | null;
  group_id: string | null;
  court_id: string | null;
  team_a: string | null;
  team_b: string | null;
  score_a: number;
  score_b: number;
  status: MatchStatus;
  winner: string | null;
  history: ScoreSnapshot[];
  started_at: string | null;
  completed_at: string | null;
  next_match_id: number | null;
  next_match_slot: MatchSlot | null;
  loser_next_match_id: number | null;
  loser_next_match_slot: MatchSlot | null;
}
