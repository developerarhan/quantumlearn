import { useDraggable } from '@dnd-kit/core';
import { Info } from 'lucide-react';
import { useState } from 'react';
import type { GateName } from '../../models/circuit';
import { GATE_DESCRIPTIONS, GATE_LABELS, GATE_NAMES } from '../../utils/circuit';

const GATE_STYLES: Record<GateName, string> = {
  x: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
  y: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  z: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  h: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
  cx: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
  measure: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
};

const SHORT_LABELS: Record<GateName, string> = {
  x: 'X',
  y: 'Y',
  z: 'Z',
  h: 'H',
  cx: 'CNOT',
  measure: 'Measure',
};

const GATE_CATEGORIES: Record<GateName, string> = {
  x: 'Pauli (Bit-Flip)',
  y: 'Pauli (Bit & Phase)',
  z: 'Pauli (Phase-Flip)',
  h: 'Superposition',
  cx: 'Two-Qubit',
  measure: 'Classical Readout',
};

const GATE_MATRICES: Record<GateName, string[][]> = {
  x: [
    ['0', '1'],
    ['1', '0'],
  ],
  y: [
    ['0', '-i'],
    ['i', '0'],
  ],
  z: [
    ['1', '0'],
    ['0', '-1'],
  ],
  h: [
    ['1/√2', '1/√2'],
    ['1/√2', '-1/√2'],
  ],
  cx: [
    ['1', '0', '0', '0'],
    ['0', '1', '0', '0'],
    ['0', '0', '0', '1'],
    ['0', '0', '1', '0'],
  ],
  measure: [],
};

interface PaletteItemProps {
  name: GateName;
  pending: GateName | null;
  onSelect: (name: GateName) => void;
  onHover: (name: GateName | null) => void;
}

function PaletteItem({ name, pending, onSelect, onHover }: PaletteItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${name}`,
    data: { gateName: name },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => onSelect(name)}
      onMouseEnter={() => onHover(name)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(name)}
      onBlur={() => onHover(null)}
      aria-pressed={pending === name}
      aria-label={`${SHORT_LABELS[name]} gate. ${GATE_DESCRIPTIONS[name]}. Click to select, or drag onto a wire.`}
      className={[
        'group relative flex w-full cursor-grab items-center gap-2.5 rounded-xl border p-2 text-left transition active:cursor-grabbing',
        GATE_STYLES[name],
        pending === name ? 'ring-2 ring-indigo-500 ring-offset-1' : 'hover:shadow-xs',
        isDragging ? 'opacity-40' : '',
      ].join(' ')}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white font-mono text-xs font-bold shadow-xs">
        {GATE_LABELS[name]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between">
          <span className="block text-xs font-bold leading-tight text-slate-800">{SHORT_LABELS[name]} Gate</span>
        </span>
        <span className="block truncate text-[10px] font-medium text-slate-500">
          {GATE_CATEGORIES[name]}
        </span>
      </span>
    </button>
  );
}

interface GatePaletteProps {
  pending: GateName | null;
  onSelect: (name: GateName) => void;
}

export function GatePalette({ pending, onSelect }: GatePaletteProps) {
  const [inspectedGate, setInspectedGate] = useState<GateName | null>(null);

  const activeInfoGate = pending ?? inspectedGate;

  return (
    <section aria-labelledby="gate-palette-title" className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="gate-palette-title" className="text-sm font-bold text-slate-900">
          Gate Palette
        </h2>
        <span className="badge bg-slate-100 text-slate-500">6 operations</span>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        {GATE_NAMES.map((name) => (
          <PaletteItem
            key={name}
            name={name}
            pending={pending}
            onSelect={onSelect}
            onHover={setInspectedGate}
          />
        ))}
      </div>

      {activeInfoGate ? (
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-950 transition-all">
          <div className="flex items-center gap-1.5 font-bold text-indigo-900">
            <Info size={14} className="shrink-0 text-indigo-600" aria-hidden="true" />
            <span>{SHORT_LABELS[activeInfoGate]}</span>
            <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-semibold text-indigo-700">
              {GATE_CATEGORIES[activeInfoGate]}
            </span>
          </div>

          <p className="mt-1.5 text-[11px] leading-relaxed text-indigo-900">
            {GATE_DESCRIPTIONS[activeInfoGate]}
          </p>

          {GATE_MATRICES[activeInfoGate].length > 0 ? (
            <div className="mt-2 rounded-lg bg-white/90 p-2 border border-indigo-100 shadow-2xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Unitary Matrix (U)
              </span>
              <div className="mt-1 inline-flex items-center rounded-sm font-mono text-[10px] text-slate-800">
                <span className="px-1 text-slate-400">[</span>
                <div className="flex flex-col gap-0.5 text-center">
                  {GATE_MATRICES[activeInfoGate].map((row, rIdx) => (
                    <div key={rIdx} className="flex gap-2">
                      {row.map((val, cIdx) => (
                        <span key={cIdx} className="w-7 text-center">
                          {val}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
                <span className="px-1 text-slate-400">]</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600 border border-slate-100">
          Hover over or select a gate to view its mathematical matrix and quantum transformation.
        </p>
      )}
    </section>
  );
}
