import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';
import type { Court, Match, ScoreSnapshot } from '@/lib/types';

const WIN_SCORE = 21;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) {
    return NextResponse.json({ error: 'Invalid match id' }, { status: 400 });
  }

  const body = await req.json();
  const action = body.action as string;

  const { data: match, error: fetchError } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single<Match>();

  if (fetchError || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  if (session.role !== 'admin') {
    const { data: court } = await supabaseAdmin
      .from('courts')
      .select('*')
      .eq('id', match.court_id)
      .order('sort_order')
      .single<Court>();

    if (!court || session.role !== `court${court.sort_order}`) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  let update: Record<string, unknown> = {};

  switch (action) {
    case 'start': {
      update = { status: 'live', started_at: new Date().toISOString() };
      break;
    }

    case 'increment':
    case 'decrement': {
      if (match.status !== 'live') {
        return NextResponse.json({ error: 'Match is not live' }, { status: 400 });
      }
      const team = body.team as 'a' | 'b';
      if (team !== 'a' && team !== 'b') {
        return NextResponse.json({ error: 'Invalid team' }, { status: 400 });
      }

      const history: ScoreSnapshot[] = [
        ...(match.history ?? []),
        { score_a: match.score_a, score_b: match.score_b },
      ].slice(-30);

      const delta = action === 'increment' ? 1 : -1;
      let score_a = match.score_a;
      let score_b = match.score_b;
      if (team === 'a') score_a = Math.max(0, score_a + delta);
      else score_b = Math.max(0, score_b + delta);

      update = { score_a, score_b, history };

      if (score_a >= WIN_SCORE || score_b >= WIN_SCORE) {
        update.status = 'completed';
        update.winner = score_a > score_b ? match.team_a : match.team_b;
        update.completed_at = new Date().toISOString();
      }
      break;
    }

    case 'undo': {
      const history: ScoreSnapshot[] = [...(match.history ?? [])];
      const prev = history.pop();
      if (!prev) {
        return NextResponse.json({ error: 'Nothing to undo' }, { status: 400 });
      }
      update = {
        score_a: prev.score_a,
        score_b: prev.score_b,
        history,
        status: match.status === 'completed' ? 'live' : match.status,
        winner: null,
        completed_at: null,
      };
      break;
    }

    case 'finish': {
      if (match.score_a === match.score_b) {
        return NextResponse.json(
          { error: 'Cannot finish a tied match — award a winner instead' },
          { status: 400 }
        );
      }
      update = {
        status: 'completed',
        winner: match.score_a > match.score_b ? match.team_a : match.team_b,
        completed_at: new Date().toISOString(),
      };
      break;
    }

    case 'reset': {
      update = {
        score_a: 0,
        score_b: 0,
        status: 'upcoming',
        winner: null,
        history: [],
        started_at: null,
        completed_at: null,
      };
      break;
    }

    case 'setScore': {
      const score_a = Number(body.score_a);
      const score_b = Number(body.score_b);
      const finish = Boolean(body.finish);

      if (!Number.isInteger(score_a) || !Number.isInteger(score_b)) {
        return NextResponse.json({ error: 'Scores must be whole numbers' }, { status: 400 });
      }
      if (score_a < 0 || score_b < 0) {
        return NextResponse.json({ error: 'Scores cannot be negative' }, { status: 400 });
      }
      if (score_a > 21 || score_b > 21) {
        return NextResponse.json({ error: 'Scores cannot exceed 21' }, { status: 400 });
      }

      if (finish) {
        const validFinish =
          score_a !== score_b &&
          Math.max(score_a, score_b) === 21 &&
          Math.min(score_a, score_b) <= 20;
        if (!validFinish) {
          return NextResponse.json(
            { error: 'Invalid final score. One team must reach exactly 21 (20-20 is Golden Point).' },
            { status: 400 }
          );
        }
      }

      const history: ScoreSnapshot[] = [
        ...(match.history ?? []),
        { score_a: match.score_a, score_b: match.score_b },
      ].slice(-30);

      update = { score_a, score_b, history };

      if (finish) {
        update.status = 'completed';
        update.winner = score_a > score_b ? match.team_a : match.team_b;
        update.completed_at = new Date().toISOString();
      } else if (match.status === 'upcoming') {
        update.status = 'live';
        update.started_at = match.started_at ?? new Date().toISOString();
      }
      break;
    }

    case 'setWinner': {
      if (session.role !== 'admin') {
        return NextResponse.json({ error: 'Only admin can change the winner' }, { status: 403 });
      }
      const winner = body.winner as string;
      if (winner !== match.team_a && winner !== match.team_b) {
        return NextResponse.json({ error: 'Winner must be one of the two teams' }, { status: 400 });
      }
      update = {
        winner,
        status: 'completed',
        completed_at: match.completed_at ?? new Date().toISOString(),
      };
      break;
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('matches')
    .update(update)
    .eq('id', matchId)
    .select('*')
    .single<Match>();

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message ?? 'Update failed' }, { status: 500 });
  }

  if (updated.stage === 'knockout' && updated.status === 'completed' && updated.winner) {
    await advanceBracket(updated);
  }

  return NextResponse.json({ match: updated });
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
