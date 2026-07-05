import { supabasePublic } from '@/lib/supabase/public';
import KnockoutClient from './KnockoutClient';
import type { Match, Team, Tournament } from '@/lib/types';

export const revalidate = 0;

export default async function KnockoutPage() {
  const { data: tournament } = await supabasePublic
    .from('tournaments')
    .select('*')
    .eq('status', 'live')
    .maybeSingle<Tournament>();

  if (!tournament) {
    return <KnockoutClient tournamentId={undefined} initialMatches={[]} teams={[]} />;
  }

  const [{ data: matches }, { data: teams }] = await Promise.all([
    supabasePublic
      .from('matches')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('match_number')
      .returns<Match[]>(),
    supabasePublic.from('teams').select('*').eq('tournament_id', tournament.id).returns<Team[]>(),
  ]);

  return (
    <KnockoutClient tournamentId={tournament.id} initialMatches={matches ?? []} teams={teams ?? []} />
  );
}
