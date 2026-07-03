import { notFound } from 'next/navigation';
import { supabasePublic } from '@/lib/supabase/public';
import CourtClient from './CourtClient';
import type { Match, Team } from '@/lib/types';

export const revalidate = 0;

export default async function CourtPage({ params }: { params: Promise<{ courtId: string }> }) {
  const { courtId } = await params;
  const court = Number(courtId);
  if (![1, 2, 3].includes(court)) notFound();

  const [{ data: matches, error: matchesError }, { data: teams, error: teamsError }] = await Promise.all([
    supabasePublic
      .from('matches')
      .select('*')
      .eq('court', court)
      .order('match_number')
      .returns<Match[]>(),
    supabasePublic.from('teams').select('*').returns<Team[]>(),
  ]);

  if (matchesError) console.error('[court page] matches query failed:', matchesError);
  if (teamsError) console.error('[court page] teams query failed:', teamsError);

  return (
    <CourtClient court={court} initialMatches={matches ?? []} teams={teams ?? []} />
  );
}
