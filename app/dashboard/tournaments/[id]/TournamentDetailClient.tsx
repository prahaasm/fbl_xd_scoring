'use client';

import { useMemo, useState } from 'react';
import BackHome from '@/components/BackHome';
import AdminMatchRow from '@/components/AdminMatchRow';
import { supabasePublic } from '@/lib/supabase/public';
import { useRealtimeMatches } from '@/lib/useRealtimeMatches';
import type { Court, Match, Team, Tournament } from '@/lib/types';

export default function TournamentDetailClient({
  tournament,
  initialTeams,
  initialMatches,
  initialCourts,
}: {
  tournament: Tournament;
  initialTeams: Team[];
  initialMatches: Match[];
  initialCourts: Court[];
}) {
  const [tab, setTab] = useState<'entrants' | 'courts' | 'bracket'>('entrants');
  const [teams, setTeams] = useState(initialTeams);
  const [courts, setCourts] = useState(initialCourts);
  const matches = useRealtimeMatches(initialMatches, () =>
    supabasePublic
      .from('matches')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('match_number')
      .then((r) => ({ data: r.data as Match[] | null }))
  );

  const isSingles = tournament.event_type === 'MS' || tournament.event_type === 'WS';
  const isElimination = tournament.format === 'single_elim' || tournament.format === 'double_elim';
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t.team_name])), [teams]);
  const knockoutMatches = matches.filter((m) => m.stage === 'knockout');
  const bracketGenerated = knockoutMatches.length > 0;

  const [busyId, setBusyId] = useState<number | null>(null);

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

  return (
    <main className="flex-1 mx-auto w-full max-w-md px-4 py-6 pb-10">
      <div className="mb-4">
        <BackHome />
      </div>
      <h1 className="text-2xl font-black text-white mb-1 text-center">{tournament.name}</h1>
      <p className="text-xs text-slate-500 text-center mb-6">
        {tournament.event_type} · {tournament.format.replace('_', ' ')} · {tournament.status}
        {isElimination && tournament.num_players ? ` · ${tournament.num_players} slots` : ''}
      </p>

      <div className="grid grid-cols-3 gap-2 mb-5">
        <TabButton active={tab === 'entrants'} onClick={() => setTab('entrants')}>
          {isSingles ? 'Players' : 'Teams'}
        </TabButton>
        <TabButton active={tab === 'courts'} onClick={() => setTab('courts')}>
          Courts
        </TabButton>
        <TabButton active={tab === 'bracket'} onClick={() => setTab('bracket')}>
          Bracket
        </TabButton>
      </div>

      {tab === 'entrants' && (
        <EntrantsPanel tournamentId={tournament.id} isSingles={isSingles} teams={teams} setTeams={setTeams} />
      )}

      {tab === 'courts' && (
        <CourtsPanel tournamentId={tournament.id} courts={courts} setCourts={setCourts} />
      )}

      {tab === 'bracket' && (
        <BracketPanel
          tournamentId={tournament.id}
          format={tournament.format}
          entrantCount={teams.length}
          slotCount={tournament.num_players}
          courtCount={courts.length}
          bracketGenerated={bracketGenerated}
          knockoutMatches={knockoutMatches}
          teamMap={teamMap}
          busyId={busyId}
          onAction={callAction}
        />
      )}
    </main>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl py-2.5 text-xs font-bold transition ${
        active ? 'bg-green-500 text-slate-900' : 'bg-slate-800 border border-slate-700 text-slate-400'
      }`}
    >
      {children}
    </button>
  );
}

function EntrantsPanel({
  tournamentId,
  isSingles,
  teams,
  setTeams,
}: {
  tournamentId: string;
  isSingles: boolean;
  teams: Team[];
  setTeams: (teams: Team[]) => void;
}) {
  const [name, setName] = useState('');
  const [csv, setCsv] = useState('');
  const [error, setError] = useState<string[] | string>('');
  const [busy, setBusy] = useState(false);

  async function addOne() {
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to add');
        return;
      }
      setTeams([...teams, data.team]);
      setName('');
    } finally {
      setBusy(false);
    }
  }

  async function importCsv() {
    if (!csv.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/players/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.details ?? data.error ?? 'Import failed');
        return;
      }
      setCsv('');
      const refreshed = await fetch(`/api/tournaments/${tournamentId}/players`).then((r) => r.json());
      setTeams(refreshed.teams ?? []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Add {isSingles ? 'Player' : 'Team'}
        </p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isSingles ? 'Player name' : 'Team name'}
            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 text-white px-3 py-2 text-sm"
          />
          <button
            disabled={busy}
            onClick={addOne}
            className="rounded-lg bg-green-500 text-slate-900 px-4 text-sm font-bold disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          CSV Import ({isSingles ? 'one name per line' : 'Group,Player1,Player2'})
        </p>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={6}
          placeholder={isSingles ? 'Rahul\nAjay\nPraveen' : 'Group,Player1,Player2\n1,Rohit,Phalguni'}
          className="w-full rounded-lg bg-slate-900 border border-slate-700 text-white px-3 py-2 text-sm font-mono"
        />
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2">
            {Array.isArray(error) ? (
              error.map((e, i) => (
                <p key={i} className="text-red-400 text-[11px] font-medium">
                  {e}
                </p>
              ))
            ) : (
              <p className="text-red-400 text-xs font-medium">{error}</p>
            )}
          </div>
        )}
        <button
          disabled={busy}
          onClick={importCsv}
          className="w-full rounded-lg bg-slate-700 text-slate-200 py-2 text-sm font-bold disabled:opacity-40"
        >
          Import
        </button>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
          Entered ({teams.length})
        </p>
        <div className="space-y-1">
          {teams.map((t) => (
            <div key={t.id} className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200">
              {t.team_name}
            </div>
          ))}
          {teams.length === 0 && <p className="text-xs text-slate-500 italic">None entered yet</p>}
        </div>
      </div>
    </div>
  );
}

function CourtsPanel({
  tournamentId,
  courts,
  setCourts,
}: {
  tournamentId: string;
  courts: Court[];
  setCourts: (courts: Court[]) => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function addCourt() {
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/courts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to add court');
        return;
      }
      setCourts([...courts, data.court]);
      setName('');
    } finally {
      setBusy(false);
    }
  }

  async function removeCourt(courtId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/courts/${courtId}`, { method: 'DELETE' });
      if (res.ok) setCourts(courts.filter((c) => c.id !== courtId));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Add Court</p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Court ${courts.length + 1}`}
            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 text-white px-3 py-2 text-sm"
          />
          <button
            disabled={busy}
            onClick={addCourt}
            className="rounded-lg bg-green-500 text-slate-900 px-4 text-sm font-bold disabled:opacity-40"
          >
            Add
          </button>
        </div>
        {error && <p className="text-red-400 text-xs font-medium">{error}</p>}
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
          Courts ({courts.length})
        </p>
        <div className="space-y-1">
          {courts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200"
            >
              {c.name}
              <button
                disabled={busy}
                onClick={() => removeCourt(c.id)}
                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))}
          {courts.length === 0 && <p className="text-xs text-slate-500 italic">No courts yet</p>}
        </div>
      </div>
    </div>
  );
}

function BracketPanel({
  tournamentId,
  format,
  entrantCount,
  slotCount,
  courtCount,
  bracketGenerated,
  knockoutMatches,
  teamMap,
  busyId,
  onAction,
}: {
  tournamentId: string;
  format: Tournament['format'];
  entrantCount: number;
  slotCount: number | null;
  courtCount: number;
  bracketGenerated: boolean;
  knockoutMatches: Match[];
  teamMap: Map<string, string>;
  busyId: number | null;
  onAction: (
    id: number,
    action: string,
    extra?: Record<string, unknown>
  ) => Promise<{ error?: string } | undefined>;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/knockout/generate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate bracket');
        return;
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  const sections = useMemo(() => {
    const byBracketRound = new Map<string, Match[]>();
    for (const m of knockoutMatches) {
      const key = `${m.bracket ?? 'winner'}:${m.round ?? 0}`;
      byBracketRound.set(key, [...(byBracketRound.get(key) ?? []), m]);
    }
    const order = { winner: 0, loser: 1, final: 2 } as const;
    return [...byBracketRound.entries()]
      .map(([key, ms]) => {
        const [bracket, round] = key.split(':');
        return { bracket: bracket as 'winner' | 'loser' | 'final', round: Number(round), matches: ms };
      })
      .sort((a, b) => order[a.bracket] - order[b.bracket] || a.round - b.round);
  }, [knockoutMatches]);

  if (format !== 'single_elim' && format !== 'double_elim') {
    return <p className="text-sm text-slate-500 italic text-center">Bracket view for this format is not built yet.</p>;
  }

  const canGenerate = entrantCount >= 2 && courtCount > 0;

  return (
    <div className="space-y-4">
      {!bracketGenerated && (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
          <p className="text-xs text-slate-400 mb-1">
            {entrantCount} entrants ready{slotCount ? ` of ${slotCount} reserved slots` : ''}.
          </p>
          {courtCount === 0 && (
            <p className="text-xs text-yellow-400 mb-2">Add at least one court before generating.</p>
          )}
          {error && <p className="text-red-400 text-xs font-medium mb-2">{error}</p>}
          <button
            disabled={busy || !canGenerate}
            onClick={generate}
            className="w-full rounded-lg bg-green-500 text-slate-900 py-2 text-sm font-black disabled:opacity-40"
          >
            Generate Bracket
          </button>
        </div>
      )}

      {sections.map(({ bracket, round, matches: ms }) => (
        <div key={`${bracket}-${round}`}>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            {bracket === 'loser' ? `Loser Bracket · ${ms[0].bracket_round}` : ms[0].bracket_round}
          </h2>
          <div className="space-y-2">
            {ms.map((m) => (
              <AdminMatchRow
                key={m.id}
                match={m}
                teamA={m.team_a ? teamMap.get(m.team_a) ?? '—' : 'TBD'}
                teamB={m.team_b ? teamMap.get(m.team_b) ?? '—' : 'TBD'}
                busy={busyId === m.id}
                label={`#${m.match_number}`}
                onAction={onAction}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
