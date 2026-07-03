'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabasePublic } from '@/lib/supabase/public';
import { useRealtimeMatches } from '@/lib/useRealtimeMatches';
import Badge from '@/components/Badge';
import ConfettiWinner from '@/components/ConfettiWinner';
import { playGoldenPointBeep, playWinnerBeep } from '@/lib/sound';
import type { Match, Team } from '@/lib/types';

export default function CourtClient({
  court,
  initialMatches,
  teams,
}: {
  court: number;
  initialMatches: Match[];
  teams: Team[];
}) {
  const matches = useRealtimeMatches(initialMatches, () =>
    supabasePublic
      .from('matches')
      .select('*')
      .eq('court', court)
      .order('match_number')
      .then((r) => ({ data: r.data as Match[] | null }))
  );
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t.team_name])), [teams]);

  const [activeId, setActiveId] = useState<number | null>(
    initialMatches.find((m) => m.status === 'live')?.id ??
      initialMatches.find((m) => m.status === 'upcoming')?.id ??
      null
  );
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState<Match | null>(null);
  const goldenAnnounced = useRef(new Set<number>());
  const celebratedIds = useRef(new Set<number>());

  const active = matches.find((m) => m.id === activeId) ?? null;

  useEffect(() => {
    if (!active) return;
    if (active.score_a === 20 && active.score_b === 20 && !goldenAnnounced.current.has(active.id)) {
      goldenAnnounced.current.add(active.id);
      playGoldenPointBeep();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.score_a, active?.score_b, active?.id]);

  useEffect(() => {
    if (!active) return;
    if (active.status === 'completed' && active.winner && !celebratedIds.current.has(active.id)) {
      celebratedIds.current.add(active.id);
      playWinnerBeep();
      setCelebrate(active);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.status, active?.winner, active?.id]);

  async function callAction(action: string, extra?: Record<string, unknown>) {
    if (!active || busy) return;
    setBusy(true);
    try {
      await fetch(`/api/matches/${active.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
    } finally {
      setBusy(false);
    }
  }

  function goToNextMatch() {
    const upcoming = matches
      .filter((m) => m.status === 'upcoming' && m.id !== active?.id)
      .sort((a, b) => a.match_number - b.match_number);
    setActiveId(upcoming[0]?.id ?? null);
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  if (!active) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-slate-400">No matches scheduled for Court {court}.</p>
        <button onClick={logout} className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition">
          Logout
        </button>
      </main>
    );
  }

  const teamA = active.team_a ? teamMap.get(active.team_a) ?? 'TBD' : 'TBD';
  const teamB = active.team_b ? teamMap.get(active.team_b) ?? 'TBD' : 'TBD';
  const progressLabel =
    active.stage === 'knockout'
      ? active.knockout_stage
      : `Round ${active.round} · Match ${active.match_number} / 42`;

  return (
    <main className="flex-1 flex flex-col mx-auto w-full max-w-md px-4 py-4 pb-8">
      <header className="flex items-center justify-between mb-4 px-1">
        <div>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Court {court}</p>
          <p className="text-sm font-bold text-slate-200">{progressLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge status={active.status} />
          <button onClick={logout} className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition">
            Logout
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <TeamScore
          name={teamA}
          score={active.score_a}
          onInc={() => callAction('increment', { team: 'a' })}
          onDec={() => callAction('decrement', { team: 'a' })}
          disabled={busy || active.status !== 'live'}
        />
        <TeamScore
          name={teamB}
          score={active.score_b}
          onInc={() => callAction('increment', { team: 'b' })}
          onDec={() => callAction('decrement', { team: 'b' })}
          disabled={busy || active.status !== 'live'}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {active.status === 'upcoming' && (
          <button className="btn-primary col-span-2" disabled={busy} onClick={() => callAction('start')}>
            Start Match
          </button>
        )}
        {active.status === 'live' && (
          <button className="btn-primary col-span-2" disabled={busy} onClick={() => callAction('finish')}>
            Finish Match
          </button>
        )}
        {active.status === 'completed' && (
          <button className="btn-primary col-span-2" disabled={busy} onClick={goToNextMatch}>
            Next Match →
          </button>
        )}
        <button className="btn-secondary" disabled={busy} onClick={() => callAction('undo')}>
          Undo
        </button>
        <button className="btn-secondary" disabled={busy} onClick={() => callAction('reset')}>
          Reset
        </button>
      </div>

      {celebrate && (
        <ConfettiWinner
          teamName={celebrate.winner === celebrate.team_a ? teamA : teamB}
          scoreA={celebrate.score_a}
          scoreB={celebrate.score_b}
          onDone={() => {
            setCelebrate(null);
            goToNextMatch();
          }}
        />
      )}
    </main>
  );
}

function TeamScore({
  name,
  score,
  onInc,
  onDec,
  disabled,
}: {
  name: string;
  score: number;
  onInc: () => void;
  onDec: () => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 flex flex-col items-center">
      <p className="text-sm font-bold text-center text-slate-200 mb-3 line-clamp-2 h-10 leading-5">{name}</p>
      <p className="text-6xl font-black mb-4 tabular-nums text-white">{score}</p>
      <div className="flex gap-2 w-full">
        <button
          className="score-btn flex-1 h-16 text-slate-900 font-black disabled:opacity-40"
          style={{ background: disabled ? undefined : 'linear-gradient(135deg, #22c55e, #16a34a)' }}
          disabled={disabled}
          onClick={onInc}
        >
          +
        </button>
        <button
          className="score-btn flex-1 h-16 bg-slate-700 text-slate-200 disabled:opacity-40"
          disabled={disabled}
          onClick={onDec}
        >
          −
        </button>
      </div>
    </div>
  );
}
