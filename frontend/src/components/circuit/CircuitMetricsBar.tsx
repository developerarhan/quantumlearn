import { Activity, Binary, Layers, Network } from 'lucide-react';
import type { Circuit } from '../../models/circuit';

interface CircuitMetricsBarProps {
  circuit: Circuit;
  backendDepth?: number;
}

// eslint-disable-next-line react-refresh/only-export-components
export function computeClientDepth(circuit: Circuit): number {
  if (circuit.gates.length === 0) return 0;
  const wireTime = new Array(circuit.num_qubits).fill(0);

  for (const gate of circuit.gates) {
    if (gate.name === 'cx') {
      const t = Math.max(wireTime[gate.control] ?? 0, wireTime[gate.target] ?? 0) + 1;
      wireTime[gate.control] = t;
      wireTime[gate.target] = t;
    } else {
      const t = (wireTime[gate.target] ?? 0) + 1;
      wireTime[gate.target] = t;
    }
  }

  return Math.max(...wireTime, 0);
}

export function CircuitMetricsBar({ circuit, backendDepth }: CircuitMetricsBarProps) {
  const depth = backendDepth ?? computeClientDepth(circuit);
  const multiQubitCount = circuit.gates.filter((g) => g.name === 'cx').length;
  const measurementCount = circuit.gates.filter((g) => g.name === 'measure').length;

  return (
    <div
      role="region"
      aria-label="Circuit statistics"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-xs backdrop-blur-xs"
    >
      <div className="flex items-center gap-1.5 font-medium" title="Active quantum registers">
        <Binary size={13} className="text-indigo-600" aria-hidden="true" />
        <span>
          <strong className="text-slate-800">{circuit.num_qubits}</strong> / 5 Qubits
        </span>
      </div>

      <span className="text-slate-300" aria-hidden="true">
        •
      </span>

      <div className="flex items-center gap-1.5 font-medium" title="Total operations in circuit">
        <Layers size={13} className="text-indigo-600" aria-hidden="true" />
        <span>
          <strong className="text-slate-800">{circuit.gates.length}</strong> Gates
        </span>
      </div>

      <span className="text-slate-300" aria-hidden="true">
        •
      </span>

      <div className="flex items-center gap-1.5 font-medium" title="Longest sequential path of gates">
        <Activity size={13} className="text-emerald-600" aria-hidden="true" />
        <span>
          Depth: <strong className="text-slate-800">{depth}</strong>
        </span>
      </div>

      <span className="text-slate-300" aria-hidden="true">
        •
      </span>

      <div className="flex items-center gap-1.5 font-medium" title="Two-qubit entangling gates">
        <Network size={13} className="text-sky-600" aria-hidden="true" />
        <span>
          Entangling: <strong className="text-slate-800">{multiQubitCount}</strong>
        </span>
      </div>

      {measurementCount > 0 ? (
        <>
          <span className="text-slate-300" aria-hidden="true">
            •
          </span>
          <span className="text-slate-500">
            Measured: <strong className="text-slate-700">{measurementCount}</strong>
          </span>
        </>
      ) : null}
    </div>
  );
}
