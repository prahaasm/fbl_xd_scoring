import { supabasePublic } from '@/lib/supabase/public';
import LeaderboardClient from './LeaderboardClient';
import type { Group, Match, Team, Tournament } from '@/lib/types';

export const revalidate = 0;

export default async function LeaderboardPage() {
  const { data: tournament } = await supabasePublic
    .from('tournaments')
    .select('*')
    .eq('status', 'live')
    .maybeSingle<Tournament>();

  if (!tournament) {
    return <LeaderboardClient groups={[]} teams={[]} initialMatches={[]} />;
  }

  const [{ data: matches }, { data: teams }, { data: groups }] = await Promise.all([
    supabasePublic
      .from('matches')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('match_number')
      .returns<Match[]>(),
    supabasePublic.from('teams').select('*').eq('tournament_id', tournament.id).returns<Team[]>(),
    supabasePublic.from('groups').select('*').eq('tournament_id', tournament.id).returns<Group[]>(),
  ]);

  return (
    <LeaderboardClient
      groups={groups ?? []}
      teams={teams ?? []}
      initialMatches={matches ?? []}
    />
  );
}
