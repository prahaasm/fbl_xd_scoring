export type Role = 'admin' | 'court1' | 'court2' | 'court3';

export interface User {
  username: string;
  password: string;
  role: Role;
}

export type GroupName = 'A' | 'B';

export interface Team {
  id: string;
  group_name: GroupName;
  team_name: string;
}

export type MatchStatus = 'upcoming' | 'live' | 'completed';
export type Stage = 'group' | 'knockout';
export type KnockoutStage = 'SF1' | 'QF' | 'SF2' | 'F';

export interface ScoreSnapshot {
  score_a: number;
  score_b: number;
}

export interface Match {
  id: number;
  match_number: number;
  stage: Stage;
  knockout_stage: KnockoutStage | null;
  round: number | null;
  court: number;
  team_a: string | null;
  team_b: string | null;
  score_a: number;
  score_b: number;
  status: MatchStatus;
  winner: string | null;
  history: ScoreSnapshot[];
  started_at: string | null;
  completed_at: string | null;
}
