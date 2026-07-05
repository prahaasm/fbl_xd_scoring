import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';
import type { Player, Team } from '@/lib/types';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ data: teams, error: teamsError }, { data: players, error: playersError }] = await Promise.all([
    supabaseAdmin.from('teams').select('*').eq('tournament_id', id).returns<Team[]>(),
    supabaseAdmin.from('players').select('*').eq('tournament_id', id).returns<Player[]>(),
  ]);

  if (teamsError || playersError) {
    return NextResponse.json({ error: (teamsError ?? playersError)?.message }, { status: 500 });
  }
  return NextResponse.json({ teams: teams ?? [], players: players ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: tournamentId } = await params;
  const body = await req.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!name) {
    return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('teams')
    .select('id, team_name')
    .eq('tournament_id', tournamentId)
    .ilike('team_name', name);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: `"${name}" is already entered` }, { status: 409 });
  }

  const teamId = `p-${crypto.randomUUID()}`;
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .insert({ id: teamId, tournament_id: tournamentId, group_id: null, team_name: name })
    .select('*')
    .single<Team>();

  if (teamError || !team) {
    return NextResponse.json({ error: teamError?.message ?? 'Failed to add player' }, { status: 500 });
  }

  const { data: player, error: playerError } = await supabaseAdmin
    .from('players')
    .insert({ tournament_id: tournamentId, team_id: teamId, name })
    .select('*')
    .single<Player>();

  if (playerError || !player) {
    return NextResponse.json({ error: playerError?.message ?? 'Failed to add player' }, { status: 500 });
  }

  return NextResponse.json({ team, player });
}
