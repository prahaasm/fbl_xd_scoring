import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';
import { parsePlayersCsv } from '@/lib/csv';
import type { Team } from '@/lib/types';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: tournamentId } = await params;
  const body = await req.json();
  const csvText = typeof body.csv === 'string' ? body.csv : '';

  if (!csvText.trim()) {
    return NextResponse.json({ error: 'No CSV content provided' }, { status: 400 });
  }

  const { rows, errors } = parsePlayersCsv(csvText);

  const { data: existingTeams } = await supabaseAdmin
    .from('teams')
    .select('team_name')
    .eq('tournament_id', tournamentId)
    .returns<Pick<Team, 'team_name'>[]>();

  const existingNames = new Set((existingTeams ?? []).map((t) => t.team_name.toLowerCase()));
  const finalErrors = [...errors];
  const validRows = rows.filter((row) => {
    if (existingNames.has(row.name.toLowerCase())) {
      finalErrors.push(`"${row.name}" is already entered`);
      return false;
    }
    return true;
  });

  if (finalErrors.length > 0) {
    return NextResponse.json({ error: 'Validation failed', details: finalErrors }, { status: 400 });
  }

  if (validRows.length === 0) {
    return NextResponse.json({ error: 'No valid rows to import' }, { status: 400 });
  }

  const teamInserts = validRows.map((row) => ({
    id: `p-${crypto.randomUUID()}`,
    tournament_id: tournamentId,
    group_id: null,
    team_name: row.name,
  }));

  const { data: teams, error: teamError } = await supabaseAdmin
    .from('teams')
    .insert(teamInserts)
    .select('*')
    .returns<Team[]>();

  if (teamError || !teams) {
    return NextResponse.json({ error: teamError?.message ?? 'Import failed' }, { status: 500 });
  }

  const playerInserts = teams.map((team) => ({
    tournament_id: tournamentId,
    team_id: team.id,
    name: team.team_name,
  }));

  const { error: playerError } = await supabaseAdmin.from('players').insert(playerInserts);

  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 500 });
  }

  return NextResponse.json({ imported: teams.length });
}
