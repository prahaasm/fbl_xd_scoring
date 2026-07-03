import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';
import { computeStandings } from '@/lib/standings';
import type { Match, Team } from '@/lib/types';

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: teams } = await supabaseAdmin.from('teams').select('*').returns<Team[]>();
  const { data: matches } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('stage', 'group')
    .returns<Match[]>();

  if (!teams || !matches) {
    return NextResponse.json({ error: 'Failed to load tournament data' }, { status: 500 });
  }

  if (matches.some((m) => m.status !== 'completed')) {
    return NextResponse.json({ error: 'Group stage is not complete yet' }, { status: 400 });
  }

  const groupA = computeStandings(
    teams.filter((t) => t.group_name === 'A'),
    matches
  );
  const groupB = computeStandings(
    teams.filter((t) => t.group_name === 'B'),
    matches
  );

  const g1r1 = groupA[0]?.id;
  const g1r2 = groupA[1]?.id;
  const g2r1 = groupB[0]?.id;
  const g2r2 = groupB[1]?.id;
  const g2r3 = groupB[2]?.id;

  if (!g1r1 || !g1r2 || !g2r1 || !g2r2 || !g2r3) {
    return NextResponse.json({ error: 'Not enough teams to build a bracket' }, { status: 400 });
  }

  await Promise.all([
    supabaseAdmin.from('matches').update({ team_a: g1r1, team_b: g2r2 }).eq('knockout_stage', 'SF1'),
    supabaseAdmin.from('matches').update({ team_a: g1r2, team_b: g2r3 }).eq('knockout_stage', 'QF'),
    supabaseAdmin.from('matches').update({ team_a: g2r1 }).eq('knockout_stage', 'SF2'),
  ]);

  return NextResponse.json({ ok: true });
}
