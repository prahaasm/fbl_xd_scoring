'use client';

import { useState } from 'react';
import Link from 'next/link';
import BackLink from '@/components/BackLink';
import type { Tournament, TournamentEventType, TournamentFormat } from '@/lib/types';

const EVENT_TYPES: { value: TournamentEventType; label: string }[] = [
  { value: 'XD', label: 'Mixed Doubles (XD)' },
  { value: 'MS', label: "Men's Singles" },
  { value: 'WS', label: "Women's Singles" },
  { value: 'MD', label: "Men's Doubles" },
  { value: 'WD', label: "Women's Doubles" },
];

const FORMATS: { value: TournamentFormat; label: string }[] = [
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'single_elim', label: 'Single Elimination' },
  { value: 'double_elim', label: 'Double Elimination' },
];

export default function TournamentsClient({ initialTournaments }: { initialTournaments: Tournament[] }) {
  const [tournaments, setTournaments] = useState(initialTournaments);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [reportingTime, setReportingTime] = useState('');
  const [eventType, setEventType] = useState<TournamentEventType>('XD');
  const [format, setFormat] = useState<TournamentFormat>('round_robin');
  const [numGroups, setNumGroups] = useState(2);
  const [numPlayers, setNumPlayers] = useState(16);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);

  async function setStatus(id: string, status: Tournament['status']) {
    setStatusBusyId(id);
    setStatusError('');
    try {
      const res = await fetch(`/api/tournaments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusError(data.error ?? 'Failed to update status');
        return;
      }
      setTournaments(tournaments.map((t) => (t.id === id ? data.tournament : t)));
    } finally {
      setStatusBusyId(null);
    }
  }

  async function createTournament() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          venue,
          event_date: eventDate || null,
          reporting_time: reportingTime,
          event_type: eventType,
          format,
          num_groups: numGroups,
          num_players: numPlayers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create tournament');
        return;
      }
      setTournaments([data.tournament, ...tournaments]);
      setShowForm(false);
      setName('');
      setVenue('');
      setEventDate('');
      setReportingTime('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 mx-auto w-full max-w-md px-4 py-6 pb-10">
      <div className="mb-6 flex items-center justify-between">
        <BackLink href="/dashboard" label="Dashboard" />
        <button
          onClick={() => setShowForm((s) => !s)}
          className="text-xs font-bold text-green-400 hover:text-green-300 transition"
        >
          {showForm ? 'Cancel' : '+ New Tournament'}
        </button>
      </div>
      <h1 className="text-2xl font-black text-white mb-6 text-center">Tournaments</h1>

      {showForm && (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 mb-6 space-y-3">
          <input
            placeholder="Tournament name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 text-white px-3 py-2 text-sm"
          />
          <input
            placeholder="Venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 text-white px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="rounded-lg bg-slate-900 border border-slate-700 text-white px-3 py-2 text-sm"
            />
            <input
              placeholder="Reporting time"
              value={reportingTime}
              onChange={(e) => setReportingTime(e.target.value)}
              className="rounded-lg bg-slate-900 border border-slate-700 text-white px-3 py-2 text-sm"
            />
          </div>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as TournamentEventType)}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 text-white px-3 py-2 text-sm"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as TournamentFormat)}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 text-white px-3 py-2 text-sm"
          >
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          {format === 'round_robin' && (
            <select
              value={numGroups}
              onChange={(e) => setNumGroups(Number(e.target.value))}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 text-white px-3 py-2 text-sm"
            >
              {[1, 2, 4, 8].map((n) => (
                <option key={n} value={n}>
                  {n} group{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          )}
          {(format === 'single_elim' || format === 'double_elim') && (
            <select
              value={numPlayers}
              onChange={(e) => setNumPlayers(Number(e.target.value))}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 text-white px-3 py-2 text-sm"
            >
              {[2, 4, 8, 16, 32, 64].map((n) => (
                <option key={n} value={n}>
                  {n} players
                </option>
              ))}
            </select>
          )}
          {error && <p className="text-red-400 text-xs font-medium">{error}</p>}
          <button
            disabled={busy || !name.trim()}
            onClick={createTournament}
            className="w-full rounded-lg bg-green-500 text-slate-900 py-2 text-sm font-black disabled:opacity-40"
          >
            Create Tournament
          </button>
        </div>
      )}

      {statusError && (
        <p className="text-red-400 text-xs font-medium mb-3 text-center">{statusError}</p>
      )}

      <div className="space-y-2">
        {tournaments.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border border-slate-700 bg-slate-800 p-3 hover:border-slate-600 transition"
          >
            <Link href={`/dashboard/tournaments/${t.id}`} className="block mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white">{t.name}</span>
                <StatusPill status={t.status} />
              </div>
              <p className="text-xs text-slate-500">
                {t.event_type} · {t.format.replace('_', ' ')}
              </p>
            </Link>
            <div className="flex gap-1.5">
              {t.status !== 'live' && (
                <button
                  disabled={statusBusyId === t.id}
                  onClick={() => setStatus(t.id, 'live')}
                  className="flex-1 rounded-lg border border-red-500/50 text-red-400 py-1 text-[11px] font-bold disabled:opacity-40"
                >
                  Mark Live
                </button>
              )}
              {t.status !== 'completed' && (
                <button
                  disabled={statusBusyId === t.id}
                  onClick={() => setStatus(t.id, 'completed')}
                  className="flex-1 rounded-lg border border-green-500/50 text-green-400 py-1 text-[11px] font-bold disabled:opacity-40"
                >
                  Mark Completed
                </button>
              )}
              {t.status !== 'upcoming' && (
                <button
                  disabled={statusBusyId === t.id}
                  onClick={() => setStatus(t.id, 'upcoming')}
                  className="flex-1 rounded-lg border border-slate-600 text-slate-400 py-1 text-[11px] font-bold disabled:opacity-40"
                >
                  Mark Upcoming
                </button>
              )}
            </div>
          </div>
        ))}
        {tournaments.length === 0 && (
          <p className="text-sm text-slate-500 italic text-center">No tournaments yet</p>
        )}
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: Tournament['status'] }) {
  const cfg = {
    upcoming: 'bg-slate-700 text-slate-300',
    live: 'bg-red-500 text-white animate-pulse',
    completed: 'bg-green-500/20 text-green-400 border border-green-500/30',
  }[status];
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg}`}>{status}</span>;
}
