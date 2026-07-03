import { supabasePublic } from '@/lib/supabase/public';
import LiveClient from './LiveClient';
import type { Match, Team } from '@/lib/types';

export const revalidate = 0;

export default async function LivePage() {
  const [{ data: matches }, { data: teams }] = await Promise.all([
    supabasePublic.from('matches').select('*').order('match_number').returns<Match[]>(),
    supabasePublic.from('teams').select('*').returns<Team[]>(),
  ]);

  return <LiveClient initialMatches={matches ?? []} teams={teams ?? []} />;
}
