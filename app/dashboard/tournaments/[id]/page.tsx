import { supabaseAdmin } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import TournamentDetailClient from './TournamentDetailClient';
import type { Court, Match, Team, Tournament } from '@/lib/types';

export const revalidate = 0;

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: tournament }, { data: teams }, { data: matches }, { data: courts }] = await Promise.all([
    supabaseAdmin.from('tournaments').select('*').eq('id', id).single<Tournament>(),
    supabaseAdmin.from('teams').select('*').eq('tournament_id', id).returns<Team[]>(),
    supabaseAdmin
      .from('matches')
      .select('*')
      .eq('tournament_id', id)
      .order('match_number')
      .returns<Match[]>(),
    supabaseAdmin.from('courts').select('*').eq('tournament_id', id).order('sort_order').returns<Court[]>(),
  ]);

  if (!tournament) notFound();

  return (
    <TournamentDetailClient
      tournament={tournament}
      initialTeams={teams ?? []}
      initialMatches={matches ?? []}
      initialCourts={courts ?? []}
    />
  );
}
