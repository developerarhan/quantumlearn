import type { Circuit } from '../../models/circuit';
import { gateLabel } from '../../utils/circuit';

const ROW = 52;
const TOP = 34;
const LEFT = 62;
const STEP = 72;
const RIGHT = 30;

export function CircuitPreview({ circuit, label }: { circuit: Circuit; label?: string }) {
  const steps = circuit.gates.length;
  const width = Math.max(300, LEFT + Math.max(steps, 1) * STEP + RIGHT);
  const height = TOP + (circuit.num_qubits - 1) * ROW + 34;
  const summary = circuit.gates.length
    ? circuit.gates.map((gate) => gateLabel(gate)).join(', then ')
    : 'Empty circuit';

  return (
    <div className="overflow-x-auto scroll-thin rounded-xl border border-slate-200 bg-slate-50">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label ? `${label}: ${summary}` : `Circuit preview: ${summary}`}
        className="block"
      >
        {Array.from({ length: circuit.num_qubits }, (_, qubit) => {
          const y = TOP + qubit * ROW;
          return (
            <g key={qubit}>
              <text x={LEFT - 22} y={y + 4} textAnchor="end" className="fill-slate-500 text-[11px] font-bold">
                q{qubit}
              </text>
              <line x1={LEFT - 12} y1={y} x2={width - RIGHT + 10} y2={y} className="stroke-slate-300" strokeWidth={1.8} />
            </g>
          );
        })}

        {circuit.gates.map((gate, index) => {
          const x = LEFT + index * STEP + STEP / 2;
          if (gate.name === 'cx') {
            const yControl = TOP + gate.control * ROW;
            const yTarget = TOP + gate.target * ROW;
            return (
              <g key={index}>
                <line x1={x} y1={yControl} x2={x} y2={yTarget} className="stroke-slate-800" strokeWidth={2} />
                <circle cx={x} cy={yControl} r={4.5} className="fill-slate-900" />
                <circle cx={x} cy={yTarget} r={11} className="fill-white stroke-slate-900" strokeWidth={2} />
                <line x1={x - 11} y1={yTarget} x2={x + 11} y2={yTarget} className="stroke-slate-900" strokeWidth={2} />
                <line x1={x} y1={yTarget - 11} x2={x} y2={yTarget + 11} className="stroke-slate-900" strokeWidth={2} />
              </g>
            );
          }
          const y = TOP + gate.target * ROW;
          const isMeasure = gate.name === 'measure';
          return (
            <g key={index}>
              <rect
                x={x - 18}
                y={y - 16}
                width={36}
                height={32}
                rx={6}
                className={isMeasure ? 'fill-slate-700' : 'fill-indigo-500'}
              />
              <text x={x} y={y + 4} textAnchor="middle" className="fill-white text-[11px] font-bold">
                {isMeasure ? 'M' : gate.name.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
