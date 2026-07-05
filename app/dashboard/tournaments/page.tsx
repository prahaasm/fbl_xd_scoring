import { supabaseAdmin } from '@/lib/supabase/admin';
import TournamentsClient from './TournamentsClient';
import type { Tournament } from '@/lib/types';

export const revalidate = 0;

export default async function TournamentsPage() {
  const { data: tournaments } = await supabaseAdmin
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Tournament[]>();

  return <TournamentsClient initialTournaments={tournaments ?? []} />;
}
