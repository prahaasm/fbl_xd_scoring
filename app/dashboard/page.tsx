import { supabasePublic } from '@/lib/supabase/public';
import DashboardClient from './DashboardClient';
import type { Match, Team } from '@/lib/types';

export const revalidate = 0;

export default async function DashboardPage() {
  const [{ data: matches }, { data: teams }] = await Promise.all([
    supabasePublic.from('matches').select('*').order('match_number').returns<Match[]>(),
    supabasePublic.from('teams').select('*').returns<Team[]>(),
  ]);

  return <DashboardClient initialMatches={matches ?? []} teams={teams ?? []} />;
}
