import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import type { Circuit } from '../../models/circuit';
import { describeGate } from '../../utils/circuit';

interface GateSequenceProps {
  circuit: Circuit;
  selectedGateIndex: number | null;
  onSelect: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onDelete: (index: number) => void;
}

export function GateSequence({
  circuit,
  selectedGateIndex,
  onSelect,
  onMove,
  onDelete,
}: GateSequenceProps) {
  return (
    <section aria-labelledby="gate-sequence-title" className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="gate-sequence-title" className="text-sm font-bold text-slate-900">
          Instruction order
        </h2>
        <span className="badge bg-slate-100 text-slate-500">
          {circuit.gates.length} {circuit.gates.length === 1 ? 'gate' : 'gates'}
        </span>
      </div>
      {circuit.gates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500">
          The circuit is empty. Add a gate from the palette to begin.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {circuit.gates.map((gate, index) => (
            <li
              key={`sequence-${index}`}
              className={[
                'flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors',
                selectedGateIndex === index
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() => onSelect(index)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded text-left"
                aria-label={`Select step ${index + 1}: ${describeGate(gate)}`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-200 text-[10px] font-bold text-slate-600">
                  {index + 1}
                </span>
                <span className="truncate text-xs font-medium text-slate-700">{describeGate(gate)}</span>
              </button>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onMove(index, -1)}
                  disabled={index === 0}
                  className="rounded p-1 text-slate-500 hover:bg-white hover:text-indigo-700 disabled:opacity-30"
                  aria-label={`Move step ${index + 1} earlier`}
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(index, 1)}
                  disabled={index === circuit.gates.length - 1}
                  className="rounded p-1 text-slate-500 hover:bg-white hover:text-indigo-700 disabled:opacity-30"
                  aria-label={`Move step ${index + 1} later`}
                >
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(index)}
                  className="rounded p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                  aria-label={`Delete step ${index + 1}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
