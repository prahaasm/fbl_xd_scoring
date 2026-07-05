import type { Court } from '@/lib/types';

const BYE = Symbol('BYE');
type Slot = string | typeof BYE;

export function nextPowerOf2(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

/**
 * Standard single-elimination seed order for a bracket of the given size,
 * e.g. size 8 -> [1,8,4,5,2,7,3,6], so seed 1 and seed 2 can only meet in
 * the final and each round pairs the strongest remaining seeds apart.
 */
export function standardSeedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const round: number[] = [];
    const total = order.length * 2;
    for (const seed of order) {
      round.push(seed);
      round.push(total + 1 - seed);
    }
    order = round;
  }
  return order;
}

export interface BracketParticipant {
  id: string;
}

export interface GeneratedMatch {
  round: number;
  bracket: 'winner' | 'loser' | 'final';
  team_a: string | null;
  team_b: string | null;
  court_id: string | null;
  status: 'upcoming' | 'completed';
  winner: string | null;
  /** Index into the returned array of the match this match's winner feeds into, or null for the final. */
  nextMatchIndex: number | null;
  nextMatchSlot: 'a' | 'b' | null;
  /** Index into the returned array of the match this match's loser feeds into (double-elim only). */
  loserNextMatchIndex: number | null;
  loserNextMatchSlot: 'a' | 'b' | null;
}

interface WorkingMatch {
  round: number;
  bracket: 'winner' | 'loser' | 'final';
  a: Slot | null;
  b: Slot | null;
  winner: Slot | null; // resolved immediately when one side is BYE
  nextMatchIndex: number | null;
  nextMatchSlot: 'a' | 'b' | null;
  loserNextMatchIndex: number | null;
  loserNextMatchSlot: 'a' | 'b' | null;
}

function resolve(m: WorkingMatch) {
  if (m.a === BYE && m.b !== BYE && m.b !== null) m.winner = m.b;
  else if (m.b === BYE && m.a !== BYE && m.a !== null) m.winner = m.a;
}

function loserOf(m: WorkingMatch): Slot | null {
  if (m.winner === null) return null;
  const loser = m.winner === m.a ? m.b : m.a;
  return loser === BYE ? null : loser;
}

/** Pairs up a list of slots two at a time into working matches of the given round/bracket. */
function pairIntoMatches(slots: Slot[], round: number, bracket: 'winner' | 'loser'): WorkingMatch[] {
  const matches: WorkingMatch[] = [];
  for (let i = 0; i < slots.length; i += 2) {
    const m: WorkingMatch = {
      round,
      bracket,
      a: slots[i] ?? null,
      b: slots[i + 1] ?? null,
      winner: null,
      nextMatchIndex: null,
      nextMatchSlot: null,
      loserNextMatchIndex: null,
      loserNextMatchSlot: null,
    };
    resolve(m);
    matches.push(m);
  }
  return matches;
}

function finalizeMatches(all: WorkingMatch[], courts: Court[]): GeneratedMatch[] {
  return all.map((m, i) => ({
    round: m.round,
    bracket: m.bracket,
    team_a: m.a === BYE ? null : m.a,
    team_b: m.b === BYE ? null : m.b,
    court_id: courts.length ? courts[i % courts.length].id : null,
    status: m.winner !== null ? 'completed' : 'upcoming',
    winner: m.winner === BYE ? null : m.winner,
    nextMatchIndex: m.nextMatchIndex,
    nextMatchSlot: m.nextMatchSlot,
    loserNextMatchIndex: m.loserNextMatchIndex,
    loserNextMatchSlot: m.loserNextMatchSlot,
  }));
}

/**
 * Generates a single-elimination bracket for the given participants (already
 * in seed order — seed 1 first), padding with BYE slots up to the next
 * power of 2. A BYE instantly "loses" to its opponent, so that opponent's
 * match is pre-completed and its winner is already known — every round
 * still has a uniform 1:1 match-per-slot-pair structure, just with some
 * matches pre-resolved.
 */
export function generateSingleElimFromSeeds(
  participants: BracketParticipant[],
  courts: Court[]
): GeneratedMatch[] {
  const all = buildWinnerBracket(participants);
  return finalizeMatches(all, courts);
}

function buildWinnerBracket(participants: BracketParticipant[]): WorkingMatch[] {
  const size = nextPowerOf2(participants.length);
  const seedOrder = standardSeedOrder(size);
  const slots: Slot[] = seedOrder.map((seed) => (seed <= participants.length ? participants[seed - 1].id : BYE));

  const rounds = Math.log2(size);
  const all: WorkingMatch[] = [];

  // Round 1 comes straight from the seeded slot list.
  const round1 = pairIntoMatches(slots, 1, 'winner');
  let previousRoundIndices: number[] = round1.map((m) => {
    const index = all.length;
    all.push(m);
    return index;
  });

  // Every later round has exactly half as many matches as the round
  // before it, built empty and then wired/filled from the previous round.
  for (let r = 2; r <= rounds; r++) {
    const roundIndices: number[] = [];
    for (let i = 0; i < previousRoundIndices.length / 2; i++) {
      const m: WorkingMatch = {
        round: r,
        bracket: 'winner',
        a: null,
        b: null,
        winner: null,
        nextMatchIndex: null,
        nextMatchSlot: null,
        loserNextMatchIndex: null,
        loserNextMatchSlot: null,
      };
      const index = all.length;
      all.push(m);
      roundIndices.push(index);
    }

    for (let i = 0; i < previousRoundIndices.length; i++) {
      const thisRoundMatch = all[roundIndices[Math.floor(i / 2)]];
      const prevMatch = all[previousRoundIndices[i]];
      const slot: 'a' | 'b' = i % 2 === 0 ? 'a' : 'b';
      prevMatch.nextMatchIndex = roundIndices[Math.floor(i / 2)];
      prevMatch.nextMatchSlot = slot;
      if (prevMatch.winner !== null) {
        if (slot === 'a') thisRoundMatch.a = prevMatch.winner;
        else thisRoundMatch.b = prevMatch.winner;
        resolve(thisRoundMatch);
      }
    }

    previousRoundIndices = roundIndices;
  }

  return all;
}

/**
 * Generates a double-elimination bracket: a winner bracket (same shape as
 * generateSingleElimFromSeeds), a loser bracket built via the standard
 * "drop pattern", and a single grand final between the winner-bracket
 * champion and the loser-bracket champion. No "bracket reset" second
 * grand final. BYE participants are padded in exactly as in the winner
 * bracket, and a BYE never produces a loser to drop into the loser
 * bracket (loserOf returns null for a bye'd match) — dropped slots that
 * are null are treated as "nothing to pair here" and the loser bracket's
 * pairing simply has fewer real entries at that point, same as the
 * winner bracket handles byes.
 */
export function generateDoubleElimFromSeeds(
  participants: BracketParticipant[],
  courts: Court[]
): GeneratedMatch[] {
  const winnerMatches = buildWinnerBracket(participants);
  const winnerRounds = Math.max(...winnerMatches.map((m) => m.round));
  const winnerMatchesByRound: number[][] = [];
  for (let r = 1; r <= winnerRounds; r++) {
    winnerMatchesByRound.push(
      winnerMatches.map((m, i) => (m.round === r ? i : -1)).filter((i) => i >= 0)
    );
  }

  const all: WorkingMatch[] = [...winnerMatches];

  function pushLoserMatch(round: number, a: Slot | null, b: Slot | null): number {
    const m: WorkingMatch = {
      round,
      bracket: 'loser',
      a,
      b,
      winner: null,
      nextMatchIndex: null,
      nextMatchSlot: null,
      loserNextMatchIndex: null,
      loserNextMatchSlot: null,
    };
    resolve(m);
    const index = all.length;
    all.push(m);
    return index;
  }

  // A "loser entry" is a slot arriving at the loser bracket: either the
  // (as yet unknown) loser of a specific winner-bracket match — tracked by
  // that match's index so we can wire loserNextMatchIndex once it's
  // known — or the winner of an earlier loser-bracket match. A
  // winner-bracket match that was a bye (has no real loser) is filtered
  // out via realWinnerEntries before it ever becomes a LoserEntry, since
  // it has nothing to contribute to the loser bracket at all.
  type LoserEntry = { fromWinnerMatch: number } | { fromLoserMatch: number };

  function isDeadBye(matchIndex: number): boolean {
    // A match that's already resolved (a bye, pre-completed at build time)
    // AND has no real loser contributes nothing to the loser bracket.
    const m = all[matchIndex];
    return m.winner !== null && loserOf(m) === null;
  }

  function realWinnerEntries(matchIndices: number[]): LoserEntry[] {
    return matchIndices.filter((i) => !isDeadBye(i)).map((i) => ({ fromWinnerMatch: i }));
  }

  function wireInto(entry: LoserEntry, matchIndex: number, slot: 'a' | 'b') {
    if ('fromWinnerMatch' in entry) {
      all[entry.fromWinnerMatch].loserNextMatchIndex = matchIndex;
      all[entry.fromWinnerMatch].loserNextMatchSlot = slot;
      const loser = loserOf(all[entry.fromWinnerMatch]);
      if (loser !== null) {
        if (slot === 'a') all[matchIndex].a = loser;
        else all[matchIndex].b = loser;
      }
    } else {
      all[entry.fromLoserMatch].nextMatchIndex = matchIndex;
      all[entry.fromLoserMatch].nextMatchSlot = slot;
      if (all[entry.fromLoserMatch].winner !== null) {
        const winner = all[entry.fromLoserMatch].winner;
        if (slot === 'a') all[matchIndex].a = winner;
        else all[matchIndex].b = winner;
      }
    }
  }

  // Pair up a list of loser-bracket entries; an odd leftover carries
  // forward unpaired into the caller's next stage.
  function pairLoserEntries(entries: LoserEntry[], round: number): { survivors: LoserEntry[] } {
    const survivors: LoserEntry[] = [];
    for (let i = 0; i + 1 < entries.length; i += 2) {
      const matchIndex = pushLoserMatch(round, null, null);
      wireInto(entries[i], matchIndex, 'a');
      wireInto(entries[i + 1], matchIndex, 'b');
      resolve(all[matchIndex]);
      survivors.push({ fromLoserMatch: matchIndex });
    }
    if (entries.length % 2 === 1) survivors.push(entries[entries.length - 1]);
    return { survivors };
  }

  let survivors: LoserEntry[] = realWinnerEntries(winnerMatchesByRound[0]);
  let loserRound = 1;
  ({ survivors } = pairLoserEntries(survivors, loserRound));
  loserRound++;

  for (let wr = 2; wr <= winnerRounds; wr++) {
    // Drop round: pair each survivor against a fresh loser from winner round `wr`.
    const drops: LoserEntry[] = realWinnerEntries(winnerMatchesByRound[wr - 1]);
    const interleaved: LoserEntry[] = [];
    const maxLen = Math.max(survivors.length, drops.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < survivors.length) interleaved.push(survivors[i]);
      if (i < drops.length) interleaved.push(drops[i]);
    }
    ({ survivors } = pairLoserEntries(interleaved, loserRound));
    loserRound++;

    if (survivors.length > 1) {
      ({ survivors } = pairLoserEntries(survivors, loserRound));
      loserRound++;
    }
  }

  // Grand final: winner-bracket champion vs loser-bracket champion.
  const winnerFinalIndex = winnerMatches.length - 1;
  const grandFinal: WorkingMatch = {
    round: winnerRounds + 1,
    bracket: 'final',
    a: null,
    b: null,
    winner: null,
    nextMatchIndex: null,
    nextMatchSlot: null,
    loserNextMatchIndex: null,
    loserNextMatchSlot: null,
  };
  const grandFinalIndex = all.length;
  all.push(grandFinal);

  all[winnerFinalIndex].nextMatchIndex = grandFinalIndex;
  all[winnerFinalIndex].nextMatchSlot = 'a';
  if (all[winnerFinalIndex].winner !== null) grandFinal.a = all[winnerFinalIndex].winner;

  const lastSurvivor = survivors[0];
  wireInto(lastSurvivor, grandFinalIndex, 'b');
  resolve(grandFinal);

  return finalizeMatches(all, courts);
}

/** Fisher-Yates shuffle, used for random-draw seeding. */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function roundLabel(round: number, totalRounds: number): string {
  const remaining = totalRounds - round + 1;
  if (remaining === 1) return 'Final';
  if (remaining === 2) return 'Semifinal';
  if (remaining === 3) return 'Quarterfinal';
  return `Round of ${2 ** remaining}`;
}

/**
 * Loser-bracket rounds don't correspond to a clean power-of-2 "round of N"
 * the way winner-bracket rounds do (a drop round and the following
 * consolidation round can have the same match count), so they're just
 * labeled by their position instead.
 */
export function loserRoundLabel(round: number): string {
  return `Loser Round ${round}`;
}
