'use client';

import { useState } from 'react';
import Badge from '@/components/Badge';
import type { Match } from '@/lib/types';

export default function AdminMatchRow({
  match,
  teamA,
  teamB,
  busy,
  onAction,
  label,
}: {
  match: Match;
  teamA: string;
  teamB: string;
  busy: boolean;
  label: string;
  onAction: (
    id: number,
    action: string,
    extra?: Record<string, unknown>
  ) => Promise<{ error?: string } | undefined>;
}) {
  const scoreDisabled = busy || match.status !== 'live';

  const [manualEdit, setManualEdit] = useState<{ a: string; b: string } | null>(null);
  const [manualError, setManualError] = useState('');
  const manualA = manualEdit ? manualEdit.a : String(match.score_a);
  const manualB = manualEdit ? manualEdit.b : String(match.score_b);

  async function submitManualScore(finish: boolean) {
    const score_a = Number(manualA);
    const score_b = Number(manualB);

    if (manualA.trim() === '' || manualB.trim() === '' || !Number.isInteger(score_a) || !Number.isInteger(score_b)) {
      setManualError('Enter valid whole-number scores for both teams.');
      return;
    }
    if (score_a < 0 || score_b < 0) {
      setManualError('Scores cannot be negative.');
      return;
    }
    if (score_a > 21 || score_b > 21) {
      setManualError('Scores cannot exceed 21.');
      return;
    }
    if (finish) {
      const validFinish = score_a !== score_b && Math.max(score_a, score_b) === 21 && Math.min(score_a, score_b) <= 20;
      if (!validFinish) {
        setManualError('Invalid final score. One team must reach exactly 21 (20-20 is Golden Point).');
        return;
      }
    }

    setManualError('');
    const result = await onAction(match.id, 'setScore', { score_a, score_b, finish });
    if (result?.error) setManualError(result.error);
    else setManualEdit(null);
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">{label}</span>
        <Badge status={match.status} />
      </div>
      <div className="flex items-center justify-between text-sm font-semibold mb-3 text-slate-200">
        <span className="flex-1 text-left">{teamA}</span>
        <span className="font-mono font-black text-white px-3">
          {match.score_a} – {match.score_b}
        </span>
        <span className="flex-1 text-right">{teamB}</span>
      </div>
      <div className="grid grid-cols-2 gap-1 mb-2">
        <div className="flex gap-1">
          <button
            disabled={scoreDisabled}
            className="flex-1 rounded-lg bg-green-500 text-slate-900 py-1.5 text-xs font-black disabled:opacity-40"
            onClick={() => onAction(match.id, 'increment', { team: 'a' })}
          >
            A +
          </button>
          <button
            disabled={scoreDisabled}
            className="flex-1 rounded-lg bg-slate-700 text-slate-300 py-1.5 text-xs font-bold disabled:opacity-40"
            onClick={() => onAction(match.id, 'decrement', { team: 'a' })}
          >
            A −
          </button>
        </div>
        <div className="flex gap-1">
          <button
            disabled={scoreDisabled}
            className="flex-1 rounded-lg bg-green-500 text-slate-900 py-1.5 text-xs font-black disabled:opacity-40"
            onClick={() => onAction(match.id, 'increment', { team: 'b' })}
          >
            B +
          </button>
          <button
            disabled={scoreDisabled}
            className="flex-1 rounded-lg bg-slate-700 text-slate-300 py-1.5 text-xs font-bold disabled:opacity-40"
            onClick={() => onAction(match.id, 'decrement', { team: 'b' })}
          >
            B −
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-2 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Manual Entry</p>
        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={21}
            value={manualA}
            disabled={busy}
            onChange={(e) => setManualEdit({ a: e.target.value, b: manualEdit ? manualEdit.b : manualB })}
            className="rounded-lg bg-slate-900 border border-slate-700 text-white text-center text-sm font-bold py-1"
          />
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={21}
            value={manualB}
            disabled={busy}
            onChange={(e) => setManualEdit({ a: manualEdit ? manualEdit.a : manualA, b: e.target.value })}
            className="rounded-lg bg-slate-900 border border-slate-700 text-white text-center text-sm font-bold py-1"
          />
        </div>
        {manualError && <p className="text-red-400 text-[10px] font-medium mb-1.5">{manualError}</p>}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            disabled={busy}
            className="rounded-lg bg-slate-700 text-slate-200 py-1 text-xs font-bold disabled:opacity-40"
            onClick={() => submitManualScore(false)}
          >
            Save Score
          </button>
          <button
            disabled={busy}
            className="rounded-lg bg-green-500 text-slate-900 py-1 text-xs font-bold disabled:opacity-40"
            onClick={() => submitManualScore(true)}
          >
            Finish Match
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 text-xs">
        {match.status === 'upcoming' && (
          <button
            disabled={busy}
            className="rounded-lg border border-green-500/50 text-green-400 px-2.5 py-1 font-bold disabled:opacity-40"
            onClick={() => onAction(match.id, 'start')}
          >
            Start
          </button>
        )}
        {match.status === 'live' && (
          <button
            disabled={busy}
            className="rounded-lg border border-green-500/50 text-green-400 px-2.5 py-1 font-bold disabled:opacity-40"
            onClick={() => onAction(match.id, 'finish')}
          >
            Finish
          </button>
        )}
        <button
          disabled={busy}
          className="rounded-lg border border-slate-600 text-slate-400 px-2.5 py-1 font-bold disabled:opacity-40"
          onClick={() => onAction(match.id, 'undo')}
        >
          Undo
        </button>
        <button
          disabled={busy}
          className="rounded-lg border border-slate-600 text-slate-400 px-2.5 py-1 font-bold disabled:opacity-40"
          onClick={() => onAction(match.id, 'reset')}
        >
          Reset
        </button>
        {match.team_a && (
          <button
            disabled={busy}
            className="rounded-lg border border-slate-600 text-slate-400 px-2.5 py-1 font-bold disabled:opacity-40"
            onClick={() => onAction(match.id, 'setWinner', { winner: match.team_a })}
          >
            Win: A
          </button>
        )}
        {match.team_b && (
          <button
            disabled={busy}
            className="rounded-lg border border-slate-600 text-slate-400 px-2.5 py-1 font-bold disabled:opacity-40"
            onClick={() => onAction(match.id, 'setWinner', { winner: match.team_b })}
          >
            Win: B
          </button>
        )}
      </div>
    </div>
  );
}
