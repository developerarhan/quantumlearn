import type { SimulationResult } from '../../models/circuit';
import { sortBitstrings } from '../../utils/circuit';

export function CountsTable({ result }: { result: SimulationResult }) {
  const rows = sortBitstrings(Object.keys(result.counts));

  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <caption className="sr-only">
          Measurement counts and observed probabilities for each bitstring. Bit order is{' '}
          {result.bitstring_order}, left to right.
        </caption>
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th scope="col" className="px-3 py-2 font-semibold">
              Bitstring
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              Count
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              Observed probability
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((bitstring) => {
            const count = result.counts[bitstring];
            const probability = count / result.shots;
            return (
              <tr key={bitstring} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <th scope="row" className="px-3 py-2 text-left font-mono text-sm font-semibold text-slate-900">
                  {bitstring}
                </th>
                <td className="px-3 py-2 text-right font-mono text-slate-700">{count}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-700">
                  {(probability * 100).toFixed(2)}%
                </td>
                <td className="w-32 px-3 py-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${Math.max(probability * 100, 1)}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200 text-xs text-slate-500">
            <th scope="row" className="px-3 py-2 text-left font-semibold">
              Total
            </th>
            <td className="px-3 py-2 text-right font-mono font-semibold">{result.shots}</td>
            <td className="px-3 py-2 text-right font-mono">100.00%</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
