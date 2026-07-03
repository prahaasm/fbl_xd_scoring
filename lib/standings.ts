import type { Match, Team } from './types';

export interface StandingRow {
  id: string;
  team_name: string;
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
}

export function computeStandings(teams: Team[], matches: Match[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();

  for (const team of teams) {
    rows.set(team.id, {
      id: team.id,
      team_name: team.team_name,
      played: 0,
      won: 0,
      lost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
    });
  }

  for (const match of matches) {
    if (match.stage !== 'group') continue;
    if (match.status !== 'completed' || !match.team_a || !match.team_b) continue;

    const a = rows.get(match.team_a);
    const b = rows.get(match.team_b);
    if (!a || !b) continue;

    a.played += 1;
    b.played += 1;
    a.pointsFor += match.score_a;
    a.pointsAgainst += match.score_b;
    b.pointsFor += match.score_b;
    b.pointsAgainst += match.score_a;

    if (match.winner === a.id) {
      a.won += 1;
      b.lost += 1;
    } else if (match.winner === b.id) {
      b.won += 1;
      a.lost += 1;
    }
  }

  for (const row of rows.values()) {
    row.diff = row.pointsFor - row.pointsAgainst;
  }

  return [...rows.values()].sort(
    (x, y) => y.won - x.won || y.diff - x.diff || y.pointsFor - x.pointsFor
  );
}
