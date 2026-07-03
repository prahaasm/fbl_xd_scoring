import type { MatchStatus } from '@/lib/types';

const CONFIG: Record<MatchStatus, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'bg-slate-700 text-slate-300' },
  live: { label: 'LIVE', className: 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' },
  completed: { label: 'Done', className: 'bg-green-500/20 text-green-400 border border-green-500/30' },
};

export default function Badge({ status }: { status: MatchStatus }) {
  const cfg = CONFIG[status];
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
