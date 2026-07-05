'use client';

import { useMemo } from 'react';
import { supabasePublic } from '@/lib/supabase/public';
import { useRealtimeMatches } from '@/lib/useRealtimeMatches';
import Badge from '@/components/Badge';
import BackHome from '@/components/BackHome';
import type { Court, Match, Team } from '@/lib/types';

export default function LiveClient({
  tournamentId,
  initialMatches,
  teams,
  courts,
}: {
  tournamentId?: string;
  initialMatches: Match[];
  teams: Team[];
  courts: Court[];
}) {
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
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t.team_name])), [teams]);

  if (!tournamentId) {
    return (
      <main className="flex-1 mx-auto w-full max-w-md px-4 py-6 pb-10">
        <div className="mb-6">
          <BackHome />
        </div>
        <p className="text-sm text-slate-500 italic text-center">No live tournament right now</p>
      </main>
    );
  }

  return (
    <main className="flex-1 mx-auto w-full max-w-md px-4 py-6 pb-10">
      <div className="mb-6">
        <BackHome />
      </div>
      <h1 className="text-2xl font-black text-white mb-6 text-center">Live Scores</h1>
      <div className="space-y-3">
        {courts.map((court) => {
          const courtMatches = matches.filter((m) => m.court_id === court.id);
          const current =
            courtMatches.find((m) => m.status === 'live') ??
            courtMatches.find((m) => m.status === 'upcoming') ??
            [...courtMatches].reverse().find((m) => m.status === 'completed');
          const isLive = current?.status === 'live';
          return (
            <div
              key={court.id}
              className={`rounded-xl border p-4 transition ${
                isLive
                  ? 'border-blue-500/40 bg-blue-500/5 shadow-lg shadow-blue-500/5'
                  : 'border-slate-700 bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white">{court.name}</span>
                {current && <Badge status={current.status} />}
              </div>
              {!current && <p className="text-sm text-slate-500 italic">No matches</p>}
              {current && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">
                    {current.stage === 'knockout' ? current.bracket_round : `Round ${current.round}`}
                  </p>
                  <ScoreLine
                    team={current.team_a ? teamMap.get(current.team_a) ?? 'TBD' : 'TBD'}
                    score={current.score_a}
                    highlight={!!current.winner && current.winner === current.team_a}
                  />
                  <div className="border-t border-slate-700/50 my-1" />
                  <ScoreLine
                    team={current.team_b ? teamMap.get(current.team_b) ?? 'TBD' : 'TBD'}
                    score={current.score_b}
                    highlight={!!current.winner && current.winner === current.team_b}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function ScoreLine({ team, score, highlight }: { team: string; score: number; highlight: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${highlight ? 'text-green-400' : 'text-slate-300'}`}>
      <span className={`text-sm ${highlight ? 'font-black' : 'font-medium'}`}>
        {team}
        {highlight ? ' 🏆' : ''}
      </span>
      <span className={`text-3xl font-mono font-black tabular-nums ${highlight ? 'text-green-400' : 'text-white'}`}>
        {score}
      </span>
    </div>
  );
}
