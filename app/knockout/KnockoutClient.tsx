'use client';

import { useMemo } from 'react';
import { supabasePublic } from '@/lib/supabase/public';
import { useRealtimeMatches } from '@/lib/useRealtimeMatches';
import Badge from '@/components/Badge';
import BackHome from '@/components/BackHome';
import type { Match, Team } from '@/lib/types';

export default function KnockoutClient({
  tournamentId,
  initialMatches,
  teams,
}: {
  tournamentId: string | undefined;
  initialMatches: Match[];
  teams: Team[];
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
  const knockoutMatches = matches.filter((m) => m.stage === 'knockout');

  const rounds = useMemo(() => {
    const byRound = new Map<number, Match[]>();
    for (const m of knockoutMatches) {
      const r = m.round ?? 0;
      byRound.set(r, [...(byRound.get(r) ?? []), m]);
    }
    return [...byRound.entries()].sort(([a], [b]) => a - b);
  }, [knockoutMatches]);

  const totalRounds = rounds.length;

  return (
    <main className="flex-1 mx-auto w-full max-w-md px-4 py-6 pb-10">
      <div className="mb-6">
        <BackHome />
      </div>
      <h1 className="text-2xl font-black text-white mb-6 text-center">Knockout Bracket</h1>
      {knockoutMatches.length === 0 && (
        <p className="text-sm text-slate-500 italic text-center">Bracket not generated yet</p>
      )}
      <div className="space-y-4">
        {rounds.map(([round, ms], i) => {
          const isFinal = i === totalRounds - 1;
          return (
            <div key={round}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                {ms[0].bracket_round}
              </h2>
              <div className="space-y-3">
                {ms.map((match) => {
                  const teamA = match.team_a ? teamMap.get(match.team_a) ?? 'TBD' : 'TBD';
                  const teamB = match.team_b ? teamMap.get(match.team_b) ?? 'TBD' : 'TBD';
                  return (
                    <div
                      key={match.id}
                      className={`rounded-xl border p-4 ${
                        isFinal
                          ? 'border-yellow-500/40 bg-yellow-500/5 shadow-lg shadow-yellow-500/5'
                          : 'border-slate-700 bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-sm font-bold ${isFinal ? 'text-yellow-300' : 'text-white'}`}>
                          {isFinal ? '🏆 ' : ''}
                          {match.bracket_round}
                        </span>
                        <Badge status={match.status} />
                      </div>
                      <TeamLine
                        name={teamA}
                        score={match.score_a}
                        isWinner={!!match.winner && match.winner === match.team_a}
                        showScore={match.status !== 'upcoming'}
                      />
                      <div className="flex items-center gap-2 my-1">
                        <div className="flex-1 border-t border-slate-700/50" />
                        <span className="text-xs text-slate-600 font-bold">VS</span>
                        <div className="flex-1 border-t border-slate-700/50" />
                      </div>
                      <TeamLine
                        name={teamB}
                        score={match.score_b}
                        isWinner={!!match.winner && match.winner === match.team_b}
                        showScore={match.status !== 'upcoming'}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function TeamLine({ name, score, isWinner, showScore }: { name: string; score: number; isWinner: boolean; showScore: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 ${isWinner ? 'text-green-400' : 'text-slate-300'}`}>
      <span className={`text-sm ${isWinner ? 'font-black' : 'font-medium'}`}>
        {isWinner ? '🏆 ' : ''}{name}
      </span>
      {showScore && (
        <span className={`text-xl font-mono font-black tabular-nums ${isWinner ? 'text-green-400' : 'text-slate-400'}`}>
          {score}
        </span>
      )}
    </div>
  );
}
