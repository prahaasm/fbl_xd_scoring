import { supabasePublic } from '@/lib/supabase/public';
import KnockoutClient from './KnockoutClient';
import type { Match, Team } from '@/lib/types';

export const revalidate = 0;

export default async function KnockoutPage() {
  const [{ data: matches }, { data: teams }] = await Promise.all([
    supabasePublic.from('matches').select('*').order('match_number').returns<Match[]>(),
    supabasePublic.from('teams').select('*').returns<Team[]>(),
  ]);

  return <KnockoutClient initialMatches={matches ?? []} teams={teams ?? []} />;
}
