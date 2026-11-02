import {
  MAX_GATES,
  MAX_QUBITS,
  MAX_SHOTS,
  MIN_QUBITS,
  MIN_SHOTS,
  type ApiErrorPayload,
  type Circuit,
  type CxGate,
  type Gate,
  type GateName,
  type MeasureGate,
  type SingleQubitGate,
} from '../models/circuit';

export const GATE_LABELS: Record<GateName, string> = {
  x: 'X',
  y: 'Y',
  z: 'Z',
  h: 'H',
  cx: 'CNOT',
  measure: 'M',
};

export const GATE_DESCRIPTIONS: Record<GateName, string> = {
  x: 'Bit flip: |0⟩ ↔ |1⟩',
  y: 'Bit and phase flip',
  z: 'Phase flip (invisible in Z-basis measurement)',
  h: 'Hadamard: creates or removes superposition',
  cx: 'Controlled-NOT: flips the target when the control is |1⟩',
  measure: 'Measure a qubit into its classical bit',
};

export const GATE_NAMES: GateName[] = ['x', 'y', 'z', 'h', 'cx', 'measure'];

export function createEmptyCircuit(): Circuit {
  return { num_qubits: 1, gates: [], shots: 1024 };
}

export function cloneCircuit(circuit: Circuit): Circuit {
  return {
    num_qubits: circuit.num_qubits,
    gates: circuit.gates.map((gate) => ({ ...gate })),
    shots: circuit.shots,
  };
}

export function gateQubits(gate: Gate): number[] {
  if (gate.name === 'cx') return [gate.control, gate.target];
  return [gate.target];
}

export function gateLabel(gate: Gate): string {
  if (gate.name === 'cx') return `CNOT q${gate.control}→q${gate.target}`;
  if (gate.name === 'measure') return `Measure q${gate.target}`;
  return `${gate.name.toUpperCase()} on q${gate.target}`;
}

export function makeGate(name: GateName, target: number, control?: number): Gate {
  if (name === 'cx') {
    return { name: 'cx', control: control ?? 0, target };
  }
  if (name === 'measure') {
    return { name: 'measure', target, classical_bit: target };
  }
  return { name, target };
}

export function validateCircuitClient(
  circuit: Circuit,
  options: { requireMeasurement?: boolean } = {},
): ApiErrorPayload | null {
  if (!Number.isInteger(circuit.num_qubits) || circuit.num_qubits < MIN_QUBITS || circuit.num_qubits > MAX_QUBITS) {
    return {
      code: 'INVALID_QUBIT_COUNT',
      message: `Qubit count must be a whole number between ${MIN_QUBITS} and ${MAX_QUBITS}.`,
    };
  }
  if (!Number.isInteger(circuit.shots) || circuit.shots < MIN_SHOTS || circuit.shots > MAX_SHOTS) {
    return {
      code: 'INVALID_SHOTS',
      message: `Shots must be a whole number between ${MIN_SHOTS} and ${MAX_SHOTS}.`,
    };
  }
  if (circuit.gates.length > MAX_GATES) {
    return { code: 'TOO_MANY_GATES', message: `A circuit may contain at most ${MAX_GATES} gates.` };
  }

  const measured = new Set<number>();
  let measurementStarted = false;

  for (let index = 0; index < circuit.gates.length; index += 1) {
    const gate = circuit.gates[index];
    const outOfRange = (value: number, what: string): ApiErrorPayload => ({
      code: 'QUBIT_OUT_OF_RANGE',
      message: `${what} index ${value} is outside the valid range 0 to ${circuit.num_qubits - 1}.`,
      gate_index: index,
    });

    if (gate.name === 'cx') {
      if (measurementStarted) {
        return {
          code: 'GATE_AFTER_MEASUREMENT',
          message: 'No quantum gates may appear after a measurement.',
          gate_index: index,
        };
      }
      if (gate.control < 0 || gate.control >= circuit.num_qubits) return outOfRange(gate.control, 'Control');
      if (gate.target < 0 || gate.target >= circuit.num_qubits) return outOfRange(gate.target, 'Target');
      if (gate.control === gate.target) {
        return {
          code: 'INVALID_CNOT_TARGET',
          message: 'Control and target must be different qubits.',
          gate_index: index,
        };
      }
    } else if (gate.name === 'measure') {
      if (gate.target < 0 || gate.target >= circuit.num_qubits) return outOfRange(gate.target, 'Target');
      if (gate.classical_bit < 0 || gate.classical_bit >= circuit.num_qubits) {
        return outOfRange(gate.classical_bit, 'Classical bit');
      }
      if (gate.classical_bit !== gate.target) {
        return {
          code: 'CLASSICAL_BIT_MISMATCH',
          message: 'Each measurement must write to the classical bit with the same index as its target.',
          gate_index: index,
        };
      }
      if (measured.has(gate.target)) {
        return {
          code: 'DUPLICATE_MEASUREMENT',
          message: `Qubit ${gate.target} is already measured. Each qubit may be measured once.`,
          gate_index: index,
        };
      }
      measured.add(gate.target);
      measurementStarted = true;
    } else {
      if (measurementStarted) {
        return {
          code: 'GATE_AFTER_MEASUREMENT',
          message: 'No quantum gates may appear after a measurement.',
          gate_index: index,
        };
      }
      if (gate.target < 0 || gate.target >= circuit.num_qubits) return outOfRange(gate.target, 'Target');
    }
  }

  if (options.requireMeasurement && measured.size === 0) {
    return {
      code: 'MISSING_MEASUREMENT',
      message: 'Add at least one measurement before running the circuit.',
    };
  }
  return null;
}

export function insertGate(
  circuit: Circuit,
  gate: Gate,
  index: number,
): { circuit: Circuit; error: ApiErrorPayload | null } {
  if (index < 0 || index > circuit.gates.length) {
    return {
      circuit,
      error: { code: 'INVALID_POSITION', message: 'Choose a valid position in the circuit.' },
    };
  }
  const gates = [...circuit.gates];
  gates.splice(index, 0, gate);
  const candidate = { ...circuit, gates };
  const error = validateCircuitClient(candidate);
  return error ? { circuit, error } : { circuit: candidate, error: null };
}

export function deleteGate(circuit: Circuit, index: number): Circuit {
  return { ...circuit, gates: circuit.gates.filter((_, gateIndex) => gateIndex !== index) };
}

export function moveGate(
  circuit: Circuit,
  from: number,
  to: number,
): { circuit: Circuit; error: ApiErrorPayload | null } {
  if (from < 0 || from >= circuit.gates.length) {
    return { circuit, error: { code: 'INVALID_POSITION', message: 'That gate no longer exists.' } };
  }
  const target = Math.max(0, Math.min(to, circuit.gates.length - 1));
  if (from === target) return { circuit, error: null };
  const gates = [...circuit.gates];
  const [gate] = gates.splice(from, 1);
  gates.splice(target, 0, gate);
  const candidate = { ...circuit, gates };
  const error = validateCircuitClient(candidate);
  return error ? { circuit, error } : { circuit: candidate, error: null };
}

export function addQubit(circuit: Circuit): Circuit {
  if (circuit.num_qubits >= MAX_QUBITS) return circuit;
  return { ...circuit, num_qubits: circuit.num_qubits + 1 };
}

export function qubitReferenced(circuit: Circuit, qubit: number): boolean {
  return circuit.gates.some((gate) => gateQubits(gate).includes(qubit));
}

export function removeLastQubit(circuit: Circuit): Circuit {
  if (circuit.num_qubits <= MIN_QUBITS) return circuit;
  const removed = circuit.num_qubits - 1;
  return {
    ...circuit,
    num_qubits: removed,
    gates: circuit.gates.filter((gate) => !gateQubits(gate).includes(removed)),
  };
}

export function clampShots(value: number): number {
  if (!Number.isFinite(value)) return 1024;
  return Math.max(MIN_SHOTS, Math.min(MAX_SHOTS, Math.round(value)));
}

export function measuredBits(circuit: Circuit): number[] {
  return [...new Set(circuit.gates.filter((gate) => gate.name === 'measure').map((gate) => gate.target))].sort(
    (a, b) => a - b,
  );
}

export function bitstringOrder(numQubits: number): string {
  return Array.from({ length: numQubits }, (_, index) => `c${numQubits - 1 - index}`).join('');
}

export function sortBitstrings(keys: string[]): string[] {
  return [...keys].sort((a, b) => parseInt(a, 2) - parseInt(b, 2));
}

export function describeGate(gate: Gate): string {
  if (gate.name === 'cx') return `CNOT with control q${gate.control} and target q${gate.target}`;
  if (gate.name === 'measure') return `Measurement of q${gate.target} into classical bit ${gate.classical_bit}`;
  return `${gate.name.toUpperCase()} gate on q${gate.target}`;
}

export function circuitFingerprint(circuit: Circuit): string {
  return JSON.stringify(circuit);
}

export type { Gate, CxGate, MeasureGate, SingleQubitGate };
