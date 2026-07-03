'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabasePublic } from '@/lib/supabase/public';
import type { Match } from '@/lib/types';

export function useRealtimeMatches(
  initial: Match[],
  fetchMatches: () => PromiseLike<{ data: Match[] | null }>
) {
  const [matches, setMatches] = useState<Match[]>(initial);
  const fetchRef = useRef(fetchMatches);

  useEffect(() => {
    fetchRef.current = fetchMatches;
  });

  const refresh = useCallback(async () => {
    const { data } = await fetchRef.current();
    if (data) setMatches(data);
  }, []);

  useEffect(() => {
    const channel = supabasePublic
      .channel(`matches-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'fbl_scoring', table: 'matches' }, refresh)
      .subscribe();

    return () => {
      supabasePublic.removeChannel(channel);
    };
  }, [refresh]);

  return matches;
}
