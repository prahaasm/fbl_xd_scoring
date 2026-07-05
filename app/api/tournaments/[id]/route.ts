import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';
import type { Tournament } from '@/lib/types';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single<Tournament>();

  if (error || !data) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }
  return NextResponse.json({ tournament: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const update: Record<string, unknown> = {};

  for (const field of ['name', 'venue', 'event_date', 'reporting_time', 'num_groups'] as const) {
    if (field in body) update[field] = body[field];
  }

  if ('status' in body) {
    if (!['upcoming', 'live', 'completed'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    update.status = body.status;
  }

  const { data, error } = await supabaseAdmin
    .from('tournaments')
    .update(update)
    .eq('id', id)
    .select('*')
    .single<Tournament>();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Another tournament is already Live. End it before marking this one Live.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tournament: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { error } = await supabaseAdmin.from('tournaments').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
