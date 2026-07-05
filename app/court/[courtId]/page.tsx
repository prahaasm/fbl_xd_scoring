import { notFound } from 'next/navigation';
import { supabasePublic } from '@/lib/supabase/public';
import CourtClient from './CourtClient';
import type { Court, Match, Team, Tournament } from '@/lib/types';

export const revalidate = 0;

export default async function CourtPage({ params }: { params: Promise<{ courtId: string }> }) {
  const { courtId } = await params;
  const courtNumber = Number(courtId);
  if (!Number.isInteger(courtNumber) || courtNumber < 1) notFound();

  const { data: tournament } = await supabasePublic
    .from('tournaments')
    .select('*')
    .eq('status', 'live')
    .maybeSingle<Tournament>();

  if (!tournament) notFound();

  const { data: court } = await supabasePublic
    .from('courts')
    .select('*')
    .eq('tournament_id', tournament.id)
    .eq('sort_order', courtNumber)
    .maybeSingle<Court>();

  if (!court) notFound();

  const [{ data: matches, error: matchesError }, { data: teams, error: teamsError }] = await Promise.all([
    supabasePublic
      .from('matches')
      .select('*')
      .eq('tournament_id', tournament.id)
      .eq('court_id', court.id)
      .order('match_number')
      .returns<Match[]>(),
    supabasePublic.from('teams').select('*').eq('tournament_id', tournament.id).returns<Team[]>(),
  ]);

  if (matchesError) console.error('[court page] matches query failed:', matchesError);
  if (teamsError) console.error('[court page] teams query failed:', teamsError);

  return (
    <CourtClient
      court={courtNumber}
      tournamentId={tournament.id}
      courtId={court.id}
      initialMatches={matches ?? []}
      teams={teams ?? []}
    />
  );
}
