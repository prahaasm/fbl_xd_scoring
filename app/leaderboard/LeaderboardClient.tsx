'use client';

import { supabasePublic } from '@/lib/supabase/public';
import { useRealtimeMatches } from '@/lib/useRealtimeMatches';
import { computeStandings } from '@/lib/standings';
import StandingsTable from '@/components/StandingsTable';
import BackHome from '@/components/BackHome';
import type { Match, Team } from '@/lib/types';

export default function LeaderboardClient({
  initialMatches,
  teams,
}: {
  initialMatches: Match[];
  teams: Team[];
}) {
  const matches = useRealtimeMatches(initialMatches, () =>
    supabasePublic
      .from('matches')
      .select('*')
      .order('match_number')
      .then((r) => ({ data: r.data as Match[] | null }))
  );

  const standingsA = computeStandings(
    teams.filter((t) => t.group_name === 'A'),
    matches
  );
  const standingsB = computeStandings(
    teams.filter((t) => t.group_name === 'B'),
    matches
  );

  return (
    <main className="flex-1 mx-auto w-full max-w-md px-4 py-6 pb-10">
      <div className="mb-6">
        <BackHome />
      </div>
      <h1 className="text-2xl font-black text-white mb-6 text-center">Leaderboard</h1>
      <div className="space-y-6">
        <StandingsTable title="Group 1" rows={standingsA} />
        <StandingsTable title="Group 2" rows={standingsB} />
      </div>
    </main>
  );
}
