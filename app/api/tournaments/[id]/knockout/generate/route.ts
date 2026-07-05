import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';
import {
  generateDoubleElimFromSeeds,
  generateSingleElimFromSeeds,
  loserRoundLabel,
  roundLabel,
  shuffle,
} from '@/lib/fixtures/bracket';
import type { Court, Match, Team, Tournament } from '@/lib/types';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: tournamentId } = await params;

  const { data: tournament } = await supabaseAdmin
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single<Tournament>();

  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }
  if (tournament.format !== 'single_elim' && tournament.format !== 'double_elim') {
    return NextResponse.json({ error: 'This tournament is not an elimination format' }, { status: 400 });
  }

  const { data: existingMatches } = await supabaseAdmin
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('stage', 'knockout');
  if (existingMatches && existingMatches.length > 0) {
    return NextResponse.json({ error: 'Bracket already generated for this tournament' }, { status: 400 });
  }

  const { data: teams } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('tournament_id', tournamentId)
    .returns<Team[]>();
  const { data: courts } = await supabaseAdmin
    .from('courts')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('sort_order')
    .returns<Court[]>();

  if (!teams || teams.length < 2) {
    return NextResponse.json({ error: 'Not enough entrants to build a bracket' }, { status: 400 });
  }
  if (!courts || courts.length === 0) {
    return NextResponse.json({ error: 'Add at least one court before generating the bracket' }, { status: 400 });
  }

  const slotCount = tournament.num_players ?? teams.length;
  if (teams.length > slotCount) {
    return NextResponse.json(
      { error: `${teams.length} entrants were entered but only ${slotCount} bracket slots were reserved` },
      { status: 400 }
    );
  }

  // Randomly draw entrants into the reserved slots; any unfilled slots
  // become byes (handled inside the generator).
  const seededParticipants = shuffle(teams).map((t) => ({ id: t.id }));
  const generated =
    tournament.format === 'double_elim'
      ? generateDoubleElimFromSeeds(seededParticipants, courts)
      : generateSingleElimFromSeeds(seededParticipants, courts);
  const totalRounds = Math.max(...generated.filter((m) => m.bracket === 'winner').map((m) => m.round));

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('matches')
    .insert(
      generated.map((m, i) => ({
        tournament_id: tournamentId,
        match_number: i + 1,
        stage: 'knockout',
        bracket: m.bracket,
        bracket_round:
          m.bracket === 'final'
            ? 'Grand Final'
            : m.bracket === 'loser'
              ? loserRoundLabel(m.round)
              : roundLabel(m.round, totalRounds),
        round: m.round,
        court_id: m.court_id,
        team_a: m.team_a,
        team_b: m.team_b,
        status: m.status,
        winner: m.winner,
        completed_at: m.status === 'completed' ? new Date().toISOString() : null,
      }))
    )
    .select('id')
    .returns<{ id: number }[]>();

  if (insertError || !inserted) {
    return NextResponse.json({ error: insertError?.message ?? 'Failed to create bracket' }, { status: 500 });
  }

  await Promise.all(
    generated.map((m, i) => {
      const id = inserted[i].id;
      const update: Record<string, unknown> = {};
      if (m.nextMatchIndex !== null) {
        update.next_match_id = inserted[m.nextMatchIndex].id;
        update.next_match_slot = m.nextMatchSlot;
      }
      if (m.loserNextMatchIndex !== null) {
        update.loser_next_match_id = inserted[m.loserNextMatchIndex].id;
        update.loser_next_match_slot = m.loserNextMatchSlot;
      }
      if (Object.keys(update).length === 0) return Promise.resolve();
      return supabaseAdmin.from('matches').update(update).eq('id', id);
    })
  );

  // Byes are inserted already "completed" — cascade their auto-win through
  // the bracket graph exactly as a normal match completion would. A chain
  // of consecutive byes (e.g. very few entrants against many reserved
  // slots) can turn a later match completed too once its bye opponent's
  // winner is filled in, so keep sweeping for newly-completed bye matches
  // until nothing changes.
  const processedIds = new Set<number>();
  let sweeping = true;
  while (sweeping) {
    sweeping = false;
    const { data: candidates } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('status', 'completed')
      .not('winner', 'is', null)
      .returns<Match[]>();

    for (const match of candidates ?? []) {
      if (processedIds.has(match.id)) continue;
      processedIds.add(match.id);
      await advanceBracket(match);
      sweeping = true;
    }
  }

  return NextResponse.json({ ok: true, matchCount: inserted.length });
}

async function advanceBracket(match: Match) {
  const loser = match.winner === match.team_a ? match.team_b : match.team_a;

  if (match.next_match_id && match.next_match_slot) {
    await supabaseAdmin
      .from('matches')
      .update({ [`team_${match.next_match_slot}`]: match.winner })
      .eq('id', match.next_match_id);
  }

  if (match.loser_next_match_id && match.loser_next_match_slot && loser) {
    await supabaseAdmin
      .from('matches')
      .update({ [`team_${match.loser_next_match_slot}`]: loser })
      .eq('id', match.loser_next_match_id);
  }
}
