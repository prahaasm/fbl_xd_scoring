import { supabasePublic } from '@/lib/supabase/public';
import LiveClient from './LiveClient';
import type { Court, Match, Team, Tournament } from '@/lib/types';

export const revalidate = 0;

export default async function LivePage() {
  const { data: tournament } = await supabasePublic
    .from('tournaments')
    .select('*')
    .eq('status', 'live')
    .maybeSingle<Tournament>();

  if (!tournament) {
    return <LiveClient initialMatches={[]} teams={[]} courts={[]} />;
  }

  const [{ data: matches }, { data: teams }, { data: courts }] = await Promise.all([
    supabasePublic
      .from('matches')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('match_number')
      .returns<Match[]>(),
    supabasePublic.from('teams').select('*').eq('tournament_id', tournament.id).returns<Team[]>(),
    supabasePublic
      .from('courts')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('sort_order')
      .returns<Court[]>(),
  ]);

  return (
    <LiveClient
      tournamentId={tournament.id}
      initialMatches={matches ?? []}
      teams={teams ?? []}
      courts={courts ?? []}
    />
  );
}
