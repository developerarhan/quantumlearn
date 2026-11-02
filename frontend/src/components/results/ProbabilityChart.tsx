import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SimulationResult } from '../../models/circuit';
import { sortBitstrings } from '../../utils/circuit';

export function ProbabilityChart({ result }: { result: SimulationResult }) {
  const data = sortBitstrings(Object.keys(result.counts)).map((bitstring) => ({
    bitstring,
    probability: (result.counts[bitstring] / result.shots) * 100,
    count: result.counts[bitstring],
  }));

  const summary = data
    .map((row) => `${row.bitstring}: ${row.probability.toFixed(1)} percent (${row.count} counts)`)
    .join('; ');

  return (
    <div>
      <p className="sr-only">
        Observed probability bar chart. {summary}. Values are observed frequencies from {result.shots} shots.
      </p>
      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="bitstring"
              tick={{ fill: '#475569', fontSize: 12, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              label={{
                value: `Bitstring (${result.bitstring_order})`,
                position: 'insideBottom',
                offset: -4,
                fill: '#64748b',
                fontSize: 11,
              }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(value: number) => `${value}%`}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              cursor={{ fill: '#eef2ff' }}
              formatter={(value, name) => [
                name === 'probability' ? `${Number(value).toFixed(1)}%` : String(value),
                name === 'probability' ? 'Observed probability' : 'Count',
              ]}
              labelFormatter={(label) => `Bitstring ${label}`}
              contentStyle={{ borderRadius: 10, borderColor: '#c7d2fe', fontSize: 12 }}
            />
            <Bar dataKey="probability" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={72} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
