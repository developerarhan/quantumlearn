import type { StatevectorEntry } from '../../models/circuit';

interface StatevectorViewProps {
  entries: StatevectorEntry[];
  observedCounts?: Record<string, number>;
  shots?: number;
}

export function StatevectorView({ entries, observedCounts = {}, shots = 1024 }: StatevectorViewProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
        No statevector data available for this circuit.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <p>
          Theoretical statevector $|\psi\rangle = \sum \alpha_i |i\rangle$ evaluated before terminal measurement.
        </p>
        <span className="font-mono text-[11px] text-slate-400">
          2<sup>{Math.round(Math.log2(entries.length))}</sup> basis states
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs" aria-label="Quantum Statevector Table">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-3.5 py-2.5">
                Basis State |i⟩
              </th>
              <th scope="col" className="px-3.5 py-2.5">
                Amplitude (α)
              </th>
              <th scope="col" className="px-3.5 py-2.5">
                Magnitude |α|
              </th>
              <th scope="col" className="px-3.5 py-2.5">
                Phase (θ)
              </th>
              <th scope="col" className="px-3.5 py-2.5">
                Ideal Prob |α|²
              </th>
              <th scope="col" className="px-3.5 py-2.5">
                Observed Aer (N={shots})
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {entries.map((entry) => {
              const count = observedCounts[entry.bitstring] ?? 0;
              const observedPct = shots > 0 ? (count / shots) * 100 : 0;
              const idealPct = entry.probability * 100;
              const isNonZero = entry.probability > 0.0001;

              return (
                <tr
                  key={entry.bitstring}
                  className={isNonZero ? 'bg-indigo-50/30 font-medium text-slate-900' : 'text-slate-400'}
                >
                  <td className="px-3.5 py-2">
                    <span
                      className={[
                        'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-bold',
                        isNonZero ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500',
                      ].join(' ')}
                    >
                      |{entry.bitstring}⟩
                    </span>
                  </td>
                  <td className="px-3.5 py-2 text-slate-700">
                    {entry.real.toFixed(4)} {entry.imag >= 0 ? '+' : '-'} {Math.abs(entry.imag).toFixed(4)}i
                  </td>
                  <td className="px-3.5 py-2 text-slate-700">{entry.magnitude.toFixed(4)}</td>
                  <td className="px-3.5 py-2">
                    <span className="inline-flex items-center gap-1 font-sans text-xs text-slate-600">
                      {entry.phase_deg.toFixed(1)}°
                    </span>
                  </td>
                  <td className="px-3.5 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-12 text-slate-800">{idealPct.toFixed(1)}%</span>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${Math.min(100, idealPct)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-12 text-slate-800">
                        {count > 0 ? `${observedPct.toFixed(1)}%` : '0.0%'}
                      </span>
                      <span className="text-[11px] font-sans text-slate-400">({count})</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
