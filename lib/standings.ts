import type { Match, Team } from './types';

export interface StandingRow {
  id: string;
  team_name: string;
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  leaguePoints: number;
}

function leaguePointsForResult(winnerScore: number, loserScore: number): { winner: number; loser: number } {
  if (loserScore >= 14) return { winner: 3, loser: 1 };
  return { winner: 4, loser: 0 };
}

function buildRows(teams: Team[], matches: Match[]): Map<string, StandingRow> {
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
      leaguePoints: 0,
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
      const pts = leaguePointsForResult(match.score_a, match.score_b);
      a.leaguePoints += pts.winner;
      b.leaguePoints += pts.loser;
    } else if (match.winner === b.id) {
      b.won += 1;
      a.lost += 1;
      const pts = leaguePointsForResult(match.score_b, match.score_a);
      b.leaguePoints += pts.winner;
      a.leaguePoints += pts.loser;
    }
  }

  return rows;
}

/**
 * Ranks teams per the official tie-break rules:
 * 1. Wins (desc)
 * 2. For exactly 2 tied teams: head-to-head winner (if they played and it's decisive)
 * 3. League points (desc)
 * 4. For 3+ tied teams: points scored among just the tied teams (desc)
 * 5. Total points for (desc)
 * 6. Team name (asc) as final deterministic fallback
 */
export function rankTeams(teams: Team[], matches: Match[]): StandingRow[] {
  const rows = buildRows(teams, matches);
  const completedGroupMatches = matches.filter(
    (m) => m.stage === 'group' && m.status === 'completed' && m.team_a && m.team_b
  );

  const winsGroups = new Map<number, StandingRow[]>();
  for (const row of rows.values()) {
    const group = winsGroups.get(row.won) ?? [];
    group.push(row);
    winsGroups.set(row.won, group);
  }

  const rankedGroups: StandingRow[][] = [];

  for (const wins of [...winsGroups.keys()].sort((a, b) => b - a)) {
    const group = winsGroups.get(wins)!;

    if (group.length === 2) {
      const [x, y] = group;
      const headToHead = completedGroupMatches.find(
        (m) =>
          (m.team_a === x.id && m.team_b === y.id) || (m.team_a === y.id && m.team_b === x.id)
      );

      if (headToHead && headToHead.winner) {
        rankedGroups.push(headToHead.winner === x.id ? [x, y] : [y, x]);
        continue;
      }

      rankedGroups.push(
        [...group].sort(
          (a, b) =>
            b.leaguePoints - a.leaguePoints ||
            b.pointsFor - a.pointsFor ||
            a.team_name.localeCompare(b.team_name)
        )
      );
      continue;
    }

    if (group.length >= 3) {
      const tiedIds = new Set(group.map((r) => r.id));
      const pointsAmongTied = new Map<string, number>();
      for (const row of group) pointsAmongTied.set(row.id, 0);

      for (const match of completedGroupMatches) {
        if (!tiedIds.has(match.team_a!) || !tiedIds.has(match.team_b!)) continue;
        pointsAmongTied.set(match.team_a!, (pointsAmongTied.get(match.team_a!) ?? 0) + match.score_a);
        pointsAmongTied.set(match.team_b!, (pointsAmongTied.get(match.team_b!) ?? 0) + match.score_b);
      }

      rankedGroups.push(
        [...group].sort(
          (a, b) =>
            (pointsAmongTied.get(b.id) ?? 0) - (pointsAmongTied.get(a.id) ?? 0) ||
            b.leaguePoints - a.leaguePoints ||
            b.pointsFor - a.pointsFor ||
            a.team_name.localeCompare(b.team_name)
        )
      );
      continue;
    }

    rankedGroups.push(group);
  }

  return rankedGroups.flat();
}

export function computeStandings(teams: Team[], matches: Match[]): StandingRow[] {
  return rankTeams(teams, matches);
}
