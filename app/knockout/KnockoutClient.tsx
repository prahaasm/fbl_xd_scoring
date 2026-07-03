'use client';

import { useMemo } from 'react';
import { supabasePublic } from '@/lib/supabase/public';
import { useRealtimeMatches } from '@/lib/useRealtimeMatches';
import Badge from '@/components/Badge';
import BackHome from '@/components/BackHome';
import type { KnockoutStage, Match, Team } from '@/lib/types';

const ORDER: KnockoutStage[] = ['SF1', 'QF', 'SF2', 'F'];
const LABELS: Record<KnockoutStage, string> = {
  SF1: 'Semi Final 1',
  QF: 'Quarter Final',
  SF2: 'Semi Final 2',
  F: 'Final',
};

const ACCENTS: Record<KnockoutStage, string> = {
  SF1: 'border-slate-700 bg-slate-800/60',
  QF: 'border-slate-700 bg-slate-800/60',
  SF2: 'border-slate-700 bg-slate-800/60',
  F: 'border-yellow-500/40 bg-yellow-500/5 shadow-lg shadow-yellow-500/5',
};

export default function KnockoutClient({
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
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t.team_name])), [teams]);
  const knockoutMatches = matches.filter((m) => m.stage === 'knockout');

  return (
    <main className="flex-1 mx-auto w-full max-w-md px-4 py-6 pb-10">
      <div className="mb-6">
        <BackHome />
      </div>
      <h1 className="text-2xl font-black text-white mb-6 text-center">Knockout Bracket</h1>
      {knockoutMatches.length === 0 && (
        <p className="text-sm text-slate-500 italic text-center">Bracket not generated yet</p>
      )}
      <div className="space-y-3">
        {ORDER.map((stage) => {
          const match = knockoutMatches.find((m) => m.knockout_stage === stage);
          if (!match) return null;
          const teamA = match.team_a ? teamMap.get(match.team_a) ?? 'TBD' : 'TBD';
          const teamB = match.team_b ? teamMap.get(match.team_b) ?? 'TBD' : 'TBD';
          const isFinal = stage === 'F';
          return (
            <div key={stage} className={`rounded-xl border p-4 ${ACCENTS[stage]}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-bold ${isFinal ? 'text-yellow-300' : 'text-white'}`}>
                  {isFinal ? '🏆 ' : ''}{LABELS[stage]}
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
