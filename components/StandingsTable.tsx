import type { StandingRow } from '@/lib/standings';

export default function StandingsTable({ title, rows }: { title: string; rows: StandingRow[] }) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">{title}</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800 text-slate-400 text-left">
              <th className="px-3 py-2.5">#</th>
              <th className="px-3 py-2.5">Team</th>
              <th className="px-3 py-2.5 text-center">P</th>
              <th className="px-3 py-2.5 text-center">W</th>
              <th className="px-3 py-2.5 text-center">L</th>
              <th className="px-3 py-2.5 text-center">PF</th>
              <th className="px-3 py-2.5 text-center">PA</th>
              <th className="px-3 py-2.5 text-center">LP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                className={`border-t border-slate-700 ${i < 2 ? 'text-slate-100' : 'text-slate-400'}`}
              >
                <td className="px-3 py-2.5">
                  <span className={`font-bold ${i < 2 ? 'text-green-400' : 'text-slate-500'}`}>{i + 1}</span>
                </td>
                <td className="px-3 py-2.5 font-semibold">{r.team_name}</td>
                <td className="px-3 py-2.5 text-center">{r.played}</td>
                <td className="px-3 py-2.5 text-center font-bold">{r.won}</td>
                <td className="px-3 py-2.5 text-center">{r.lost}</td>
                <td className="px-3 py-2.5 text-center">{r.pointsFor}</td>
                <td className="px-3 py-2.5 text-center">{r.pointsAgainst}</td>
                <td className="px-3 py-2.5 text-center font-bold text-green-400">
                  {r.leaguePoints}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
