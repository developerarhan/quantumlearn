export const GATE_NAMES = ['x', 'y', 'z', 'h', 'cx', 'measure'] as const;

export type GateName = (typeof GATE_NAMES)[number];

export interface SingleQubitGate {
  name: 'x' | 'y' | 'z' | 'h';
  target: number;
}

export interface CxGate {
  name: 'cx';
  control: number;
  target: number;
}

export interface MeasureGate {
  name: 'measure';
  target: number;
  classical_bit: number;
}

export type Gate = SingleQubitGate | CxGate | MeasureGate;

export interface Circuit {
  num_qubits: number;
  gates: Gate[];
  shots: number;
}

export interface StatevectorEntry {
  bitstring: string;
  real: number;
  imag: number;
  magnitude: number;
  phase_deg: number;
  probability: number;
}

export interface SimulationResult {
  counts: Record<string, number>;
  probabilities: Record<string, number>;
  shots: number;
  measured_bits: number[];
  bitstring_order: string;
  simulator: string;
  explanation_key: string | null;
  circuit_depth?: number;
  statevector?: StatevectorEntry[];
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  gate_index?: number;
  line?: number;
  column?: number;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly gateIndex?: number;
  readonly line?: number;
  readonly column?: number;

  constructor(payload: ApiErrorPayload, status = 0) {
    super(payload.message);
    this.name = 'ApiError';
    this.code = payload.code;
    this.status = status;
    this.gateIndex = payload.gate_index;
    this.line = payload.line;
    this.column = payload.column;
  }
}

export const MIN_QUBITS = 1;
export const MAX_QUBITS = 5;
export const MIN_SHOTS = 128;
export const MAX_SHOTS = 4096;
export const MAX_GATES = 50;
