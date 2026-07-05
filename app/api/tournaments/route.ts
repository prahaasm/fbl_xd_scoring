import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';
import type { Tournament } from '@/lib/types';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Tournament[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tournaments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, venue, event_date, reporting_time, event_type, format, num_groups, num_players } = body;

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Tournament name is required' }, { status: 400 });
  }
  if (!['XD', 'MS', 'WS', 'MD', 'WD'].includes(event_type)) {
    return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
  }
  if (!['round_robin', 'single_elim', 'double_elim'].includes(format)) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  }
  const isElimination = format === 'single_elim' || format === 'double_elim';
  if (isElimination && ![2, 4, 8, 16, 32, 64].includes(Number(num_players))) {
    return NextResponse.json({ error: 'Number of players must be 2, 4, 8, 16, 32, or 64' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('tournaments')
    .insert({
      name: name.trim(),
      venue: venue || null,
      event_date: event_date || null,
      reporting_time: reporting_time || null,
      event_type,
      format,
      num_groups: format === 'round_robin' ? Number(num_groups) || 1 : 1,
      num_players: isElimination ? Number(num_players) : null,
      status: 'upcoming',
    })
    .select('*')
    .single<Tournament>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tournament: data });
}
