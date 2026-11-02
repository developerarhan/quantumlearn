import { Sparkles } from 'lucide-react';
import type { Circuit } from '../../models/circuit';

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  circuit: Circuit;
}

// eslint-disable-next-line react-refresh/only-export-components
export const CIRCUIT_TEMPLATES: TemplateDefinition[] = [
  {
    id: 'superposition',
    name: 'Superposition (|+⟩)',
    description: 'Hadamard creates an equal superposition of |0⟩ and |1⟩',
    circuit: {
      num_qubits: 1,
      gates: [
        { name: 'h', target: 0 },
        { name: 'measure', target: 0, classical_bit: 0 },
      ],
      shots: 1024,
    },
  },
  {
    id: 'bit-flip',
    name: 'Pauli-X Bit Flip (|1⟩)',
    description: 'X gate deterministically flips |0⟩ to |1⟩',
    circuit: {
      num_qubits: 1,
      gates: [
        { name: 'x', target: 0 },
        { name: 'measure', target: 0, classical_bit: 0 },
      ],
      shots: 1024,
    },
  },
  {
    id: 'bell-state',
    name: 'Bell State (|Φ+⟩)',
    description: 'Maximally entangled 2-qubit state (|00⟩ + |11⟩)/√2',
    circuit: {
      num_qubits: 2,
      gates: [
        { name: 'h', target: 0 },
        { name: 'cx', control: 0, target: 1 },
        { name: 'measure', target: 0, classical_bit: 0 },
        { name: 'measure', target: 1, classical_bit: 1 },
      ],
      shots: 1024,
    },
  },
  {
    id: 'phase-flip',
    name: 'Phase Flip (H-Z-H)',
    description: 'Z flips the phase of |1⟩, demonstrating quantum interference',
    circuit: {
      num_qubits: 1,
      gates: [
        { name: 'h', target: 0 },
        { name: 'z', target: 0 },
        { name: 'h', target: 0 },
        { name: 'measure', target: 0, classical_bit: 0 },
      ],
      shots: 1024,
    },
  },
  {
    id: 'ghz-state',
    name: '3-Qubit GHZ State',
    description: 'Tripartite entangled state (|000⟩ + |111⟩)/√2',
    circuit: {
      num_qubits: 3,
      gates: [
        { name: 'h', target: 0 },
        { name: 'cx', control: 0, target: 1 },
        { name: 'cx', control: 1, target: 2 },
        { name: 'measure', target: 0, classical_bit: 0 },
        { name: 'measure', target: 1, classical_bit: 1 },
        { name: 'measure', target: 2, classical_bit: 2 },
      ],
      shots: 1024,
    },
  },
  {
    id: 'uniform-2q',
    name: '2-Qubit Uniform Superposition',
    description: 'H on both wires creates 4 equal outcomes (00, 01, 10, 11)',
    circuit: {
      num_qubits: 2,
      gates: [
        { name: 'h', target: 0 },
        { name: 'h', target: 1 },
        { name: 'measure', target: 0, classical_bit: 0 },
        { name: 'measure', target: 1, classical_bit: 1 },
      ],
      shots: 1024,
    },
  },
];

interface CircuitTemplatesProps {
  onSelect: (circuit: Circuit) => void;
}

export function CircuitTemplates({ onSelect }: CircuitTemplatesProps) {
  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-1.5">
        <label htmlFor="circuit-templates-select" className="sr-only">
          Load circuit template
        </label>
        <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
          <Sparkles size={14} className="text-amber-500" aria-hidden="true" />
          Templates:
        </span>
        <select
          id="circuit-templates-select"
          defaultValue=""
          onChange={(e) => {
            const template = CIRCUIT_TEMPLATES.find((t) => t.id === e.target.value);
            if (template) {
              onSelect(template.circuit);
              e.target.value = '';
            }
          }}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="" disabled>
            Select a preset...
          </option>
          {CIRCUIT_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
