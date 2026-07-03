import Link from 'next/link';
import { supabasePublic } from '@/lib/supabase/public';
import type { Match, Team } from '@/lib/types';
import Badge from '@/components/Badge';

export const revalidate = 0;

export default async function HomePage() {
  const [{ data: matches, error: matchesError }, { data: teams, error: teamsError }] = await Promise.all([
    supabasePublic.from('matches').select('*').order('match_number').returns<Match[]>(),
    supabasePublic.from('teams').select('*').returns<Team[]>(),
  ]);

  if (matchesError) console.error('[home page] matches query failed:', matchesError);
  if (teamsError) console.error('[home page] teams query failed:', teamsError);

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t.team_name]));
  const all = matches ?? [];
  const live = all.filter((m) => m.status === 'live');
  const upcoming = all.filter((m) => m.status === 'upcoming').slice(0, 5);
  const completed = all
    .filter((m) => m.status === 'completed')
    .slice(-5)
    .reverse();

  const groupMatches = all.filter((m) => m.stage === 'group');
  const groupDone = groupMatches.filter((m) => m.status === 'completed').length;
  const progress = groupMatches.length > 0 ? Math.round((groupDone / groupMatches.length) * 100) : 0;

  return (
    <main className="flex-1 mx-auto w-full max-w-md px-4 pb-10">
      {/* Hero */}
      <header className="text-center pt-10 pb-8">
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">July 2026 · Playzone</span>
        </div>
        <h1 className="text-3xl font-black text-white leading-tight mb-1">FBL XD Tournament</h1>
        <p className="text-sm text-slate-400">Mixed Doubles Badminton</p>

        {/* Progress bar */}
        <div className="mt-5 mx-auto max-w-xs">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Group stage</span>
            <span>{groupDone}/{groupMatches.length} matches</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <Section title="Live Matches">
        {live.length === 0 && <Empty text="No live matches right now" />}
        {live.map((m) => (
          <MatchRow key={m.id} match={m} teamMap={teamMap} />
        ))}
      </Section>

      <Section title="Upcoming Matches">
        {upcoming.length === 0 && <Empty text="No upcoming matches" />}
        {upcoming.map((m) => (
          <MatchRow key={m.id} match={m} teamMap={teamMap} />
        ))}
      </Section>

      <Section title="Completed Matches">
        {completed.length === 0 && <Empty text="No completed matches yet" />}
        {completed.map((m) => (
          <MatchRow key={m.id} match={m} teamMap={teamMap} />
        ))}
      </Section>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <Link href="/leaderboard" className="btn-primary col-span-2">
          Leaderboard
        </Link>
        <Link href="/live" className="btn-primary col-span-2" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
          Live Scores
        </Link>
        <Link href="/knockout" className="btn-secondary">
          Bracket
        </Link>
        <Link href="/login" className="btn-secondary">
          Login
        </Link>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-slate-500 italic">{text}</p>;
}

function MatchRow({ match, teamMap }: { match: Match; teamMap: Map<string, string> }) {
  const teamA = match.team_a ? teamMap.get(match.team_a) ?? 'TBD' : 'TBD';
  const teamB = match.team_b ? teamMap.get(match.team_b) ?? 'TBD' : 'TBD';
  const isLive = match.status === 'live';
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center justify-between transition ${
      isLive
        ? 'border-green-500/40 bg-green-500/5 shadow-lg shadow-green-500/5'
        : 'border-slate-700 bg-slate-800/60'
    }`}>
      <div>
        <div className="text-xs text-slate-500 mb-0.5">
          {match.stage === 'knockout' ? match.knockout_stage : `Round ${match.round} · Court ${match.court}`}
        </div>
        <div className="text-sm font-semibold text-slate-100">
          {teamA} <span className="text-slate-500">vs</span> {teamB}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <Badge status={match.status} />
        {match.status !== 'upcoming' && (
          <span className="text-sm font-mono font-bold text-slate-200">
            {match.score_a} – {match.score_b}
          </span>
        )}
      </div>
    </div>
  );
}
