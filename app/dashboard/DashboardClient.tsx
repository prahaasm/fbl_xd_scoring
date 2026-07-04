'use client';

import { useMemo, useState } from 'react';
import { supabasePublic } from '@/lib/supabase/public';
import { useRealtimeMatches } from '@/lib/useRealtimeMatches';
import { computeStandings } from '@/lib/standings';
import Badge from '@/components/Badge';
import StandingsTable from '@/components/StandingsTable';
import type { Match, Team } from '@/lib/types';

const KNOCKOUT_LABELS: Record<string, string> = {
  SF1: 'Semi Final 1',
  QF: 'Quarter Final',
  SF2: 'Semi Final 2',
  F: 'Final',
};

export default function DashboardClient({
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
  const [tab, setTab] = useState<'courts' | 'standings' | 'knockout'>('courts');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [knockoutError, setKnockoutError] = useState('');

  const groupMatches = matches.filter((m) => m.stage === 'group');
  const knockoutMatches = matches.filter((m) => m.stage === 'knockout');
  const groupComplete = groupMatches.length > 0 && groupMatches.every((m) => m.status === 'completed');

  const standingsA = computeStandings(
    teams.filter((t) => t.group_name === 'A'),
    matches
  );
  const standingsB = computeStandings(
    teams.filter((t) => t.group_name === 'B'),
    matches
  );

  async function callAction(matchId: number, action: string, extra?: Record<string, unknown>) {
    setBusyId(matchId);
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { error: data.error as string | undefined };
      }
      return { error: undefined };
    } finally {
      setBusyId(null);
    }
  }

  async function generateKnockout() {
    setKnockoutError('');
    const res = await fetch('/api/knockout/generate', { method: 'POST' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setKnockoutError(data.error ?? 'Failed to generate bracket');
    }
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <main className="flex-1 mx-auto w-full max-w-md px-4 py-4 pb-10">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black text-white">Admin Dashboard</h1>
          <p className="text-xs text-slate-500">FBL XD Tournament</p>
        </div>
        <button onClick={logout} className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition">
          Logout
        </button>
      </header>

      <div className="grid grid-cols-3 gap-2 mb-5">
        <TabButton active={tab === 'courts'} onClick={() => setTab('courts')}>
          Courts
        </TabButton>
        <TabButton active={tab === 'standings'} onClick={() => setTab('standings')}>
          Standings
        </TabButton>
        <TabButton active={tab === 'knockout'} onClick={() => setTab('knockout')}>
          Knockout
        </TabButton>
      </div>

      {tab === 'courts' && (
        <div className="space-y-5">
          {[1, 2, 3].map((court) => (
            <div key={court}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Court {court}</h2>
              <div className="space-y-2">
                {matches
                  .filter((m) => m.court === court)
                  .map((m) => (
                    <AdminMatchRow
                      key={m.id}
                      match={m}
                      teamMap={teamMap}
                      busy={busyId === m.id}
                      onAction={callAction}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'standings' && (
        <div className="space-y-6">
          <StandingsTable title="Group 1" rows={standingsA} />
          <StandingsTable title="Group 2" rows={standingsB} />
        </div>
      )}

      {tab === 'knockout' && (
        <div className="space-y-3">
          {!groupComplete && (
            <p className="text-xs text-slate-500 mb-2">Group stage must finish before generating the bracket.</p>
          )}
          <button className="btn-primary disabled:opacity-40" disabled={!groupComplete} onClick={generateKnockout}>
            Generate Knockout Bracket
          </button>
          {knockoutError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2">
              <p className="text-red-400 text-xs font-medium">{knockoutError}</p>
            </div>
          )}
          {knockoutMatches.map((m) => (
            <div key={m.id}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                {KNOCKOUT_LABELS[m.knockout_stage ?? '']}
              </h2>
              <AdminMatchRow match={m} teamMap={teamMap} busy={busyId === m.id} onAction={callAction} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl py-2.5 text-xs font-bold transition ${
        active
          ? 'bg-green-500 text-slate-900 shadow-lg shadow-green-500/20'
          : 'bg-slate-800 border border-slate-700 text-slate-400'
      }`}
    >
      {children}
    </button>
  );
}

function AdminMatchRow({
  match,
  teamMap,
  busy,
  onAction,
}: {
  match: Match;
  teamMap: Map<string, string>;
  busy: boolean;
  onAction: (
    id: number,
    action: string,
    extra?: Record<string, unknown>
  ) => Promise<{ error?: string } | undefined>;
}) {
  const teamA = match.team_a ? teamMap.get(match.team_a) ?? 'TBD' : 'TBD';
  const teamB = match.team_b ? teamMap.get(match.team_b) ?? 'TBD' : 'TBD';
  const scoreDisabled = busy || match.status !== 'live';

  const [manualEdit, setManualEdit] = useState<{ a: string; b: string } | null>(null);
  const [manualError, setManualError] = useState('');
  const manualA = manualEdit ? manualEdit.a : String(match.score_a);
  const manualB = manualEdit ? manualEdit.b : String(match.score_b);

  async function submitManualScore(finish: boolean) {
    const score_a = Number(manualA);
    const score_b = Number(manualB);

    if (manualA.trim() === '' || manualB.trim() === '' || !Number.isInteger(score_a) || !Number.isInteger(score_b)) {
      setManualError('Enter valid whole-number scores for both teams.');
      return;
    }
    if (score_a < 0 || score_b < 0) {
      setManualError('Scores cannot be negative.');
      return;
    }
    if (score_a > 21 || score_b > 21) {
      setManualError('Scores cannot exceed 21.');
      return;
    }
    if (finish) {
      const validFinish = score_a !== score_b && Math.max(score_a, score_b) === 21 && Math.min(score_a, score_b) <= 20;
      if (!validFinish) {
        setManualError('Invalid final score. One team must reach exactly 21 (20-20 is Golden Point).');
        return;
      }
    }

    setManualError('');
    const result = await onAction(match.id, 'setScore', { score_a, score_b, finish });
    if (result?.error) setManualError(result.error);
    else setManualEdit(null);
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">
          {match.stage === 'knockout' ? match.knockout_stage : `R${match.round} · #${match.match_number}`}
        </span>
        <Badge status={match.status} />
      </div>
      <div className="flex items-center justify-between text-sm font-semibold mb-3 text-slate-200">
        <span className="flex-1 text-left">{teamA}</span>
        <span className="font-mono font-black text-white px-3">
          {match.score_a} – {match.score_b}
        </span>
        <span className="flex-1 text-right">{teamB}</span>
      </div>
      <div className="grid grid-cols-2 gap-1 mb-2">
        <div className="flex gap-1">
          <button
            disabled={scoreDisabled}
            className="flex-1 rounded-lg bg-green-500 text-slate-900 py-1.5 text-xs font-black disabled:opacity-40"
            onClick={() => onAction(match.id, 'increment', { team: 'a' })}
          >
            A +
          </button>
          <button
            disabled={scoreDisabled}
            className="flex-1 rounded-lg bg-slate-700 text-slate-300 py-1.5 text-xs font-bold disabled:opacity-40"
            onClick={() => onAction(match.id, 'decrement', { team: 'a' })}
          >
            A −
          </button>
        </div>
        <div className="flex gap-1">
          <button
            disabled={scoreDisabled}
            className="flex-1 rounded-lg bg-green-500 text-slate-900 py-1.5 text-xs font-black disabled:opacity-40"
            onClick={() => onAction(match.id, 'increment', { team: 'b' })}
          >
            B +
          </button>
          <button
            disabled={scoreDisabled}
            className="flex-1 rounded-lg bg-slate-700 text-slate-300 py-1.5 text-xs font-bold disabled:opacity-40"
            onClick={() => onAction(match.id, 'decrement', { team: 'b' })}
          >
            B −
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-2 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Manual Entry</p>
        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={21}
            value={manualA}
            disabled={busy}
            onChange={(e) => setManualEdit({ a: e.target.value, b: manualEdit ? manualEdit.b : manualB })}
            className="rounded-lg bg-slate-900 border border-slate-700 text-white text-center text-sm font-bold py-1"
          />
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={21}
            value={manualB}
            disabled={busy}
            onChange={(e) => setManualEdit({ a: manualEdit ? manualEdit.a : manualA, b: e.target.value })}
            className="rounded-lg bg-slate-900 border border-slate-700 text-white text-center text-sm font-bold py-1"
          />
        </div>
        {manualError && <p className="text-red-400 text-[10px] font-medium mb-1.5">{manualError}</p>}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            disabled={busy}
            className="rounded-lg bg-slate-700 text-slate-200 py-1 text-xs font-bold disabled:opacity-40"
            onClick={() => submitManualScore(false)}
          >
            Save Score
          </button>
          <button
            disabled={busy}
            className="rounded-lg bg-green-500 text-slate-900 py-1 text-xs font-bold disabled:opacity-40"
            onClick={() => submitManualScore(true)}
          >
            Finish Match
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 text-xs">
        {match.status === 'upcoming' && (
          <button
            disabled={busy}
            className="rounded-lg border border-green-500/50 text-green-400 px-2.5 py-1 font-bold disabled:opacity-40"
            onClick={() => onAction(match.id, 'start')}
          >
            Start
          </button>
        )}
        {match.status === 'live' && (
          <button
            disabled={busy}
            className="rounded-lg border border-green-500/50 text-green-400 px-2.5 py-1 font-bold disabled:opacity-40"
            onClick={() => onAction(match.id, 'finish')}
          >
            Finish
          </button>
        )}
        <button
          disabled={busy}
          className="rounded-lg border border-slate-600 text-slate-400 px-2.5 py-1 font-bold disabled:opacity-40"
          onClick={() => onAction(match.id, 'undo')}
        >
          Undo
        </button>
        <button
          disabled={busy}
          className="rounded-lg border border-slate-600 text-slate-400 px-2.5 py-1 font-bold disabled:opacity-40"
          onClick={() => onAction(match.id, 'reset')}
        >
          Reset
        </button>
        {match.team_a && (
          <button
            disabled={busy}
            className="rounded-lg border border-slate-600 text-slate-400 px-2.5 py-1 font-bold disabled:opacity-40"
            onClick={() => onAction(match.id, 'setWinner', { winner: match.team_a })}
          >
            Win: A
          </button>
        )}
        {match.team_b && (
          <button
            disabled={busy}
            className="rounded-lg border border-slate-600 text-slate-400 px-2.5 py-1 font-bold disabled:opacity-40"
            onClick={() => onAction(match.id, 'setWinner', { winner: match.team_b })}
          >
            Win: B
          </button>
        )}
      </div>
    </div>
  );
}
