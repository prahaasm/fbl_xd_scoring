'use client';

import { supabasePublic } from '@/lib/supabase/public';
import { useRealtimeMatches } from '@/lib/useRealtimeMatches';
import { computeStandings } from '@/lib/standings';
import StandingsTable from '@/components/StandingsTable';
import BackHome from '@/components/BackHome';
import type { Group, Match, Team } from '@/lib/types';

export default function LeaderboardClient({
  groups,
  teams,
  initialMatches,
}: {
  groups: Group[];
  teams: Team[];
  initialMatches: Match[];
}) {
  const tournamentId = teams[0]?.tournament_id;
  const matches = useRealtimeMatches(initialMatches, () =>
    tournamentId
      ? supabasePublic
          .from('matches')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('match_number')
          .then((r) => ({ data: r.data as Match[] | null }))
      : Promise.resolve({ data: [] })
  );

  return (
    <main className="flex-1 mx-auto w-full max-w-md px-4 py-6 pb-10">
      <div className="mb-6">
        <BackHome />
      </div>
      <h1 className="text-2xl font-black text-white mb-6 text-center">Leaderboard</h1>
      {groups.length === 0 && (
        <p className="text-sm text-slate-500 italic text-center">No live tournament right now</p>
      )}
      <div className="space-y-6">
        {groups.map((g) => (
          <StandingsTable
            key={g.id}
            title={g.name}
            rows={computeStandings(
              teams.filter((t) => t.group_id === g.id),
              matches
            )}
          />
        ))}
      </div>
    </main>
  );
}
