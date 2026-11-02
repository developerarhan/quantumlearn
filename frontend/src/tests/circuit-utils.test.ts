import { describe, expect, it } from 'vitest';
import type { Circuit } from '../models/circuit';
import {
  addQubit,
  bitstringOrder,
  clampShots,
  createEmptyCircuit,
  deleteGate,
  insertGate,
  makeGate,
  measuredBits,
  moveGate,
  qubitReferenced,
  removeLastQubit,
  sortBitstrings,
  validateCircuitClient,
} from '../utils/circuit';

function bellCircuit(): Circuit {
  return {
    num_qubits: 2,
    gates: [
      { name: 'h', target: 0 },
      { name: 'cx', control: 0, target: 1 },
      { name: 'measure', target: 0, classical_bit: 0 },
      { name: 'measure', target: 1, classical_bit: 1 },
    ],
    shots: 1024,
  };
}

describe('circuit helpers', () => {
  it('starts with one qubit, no gates, and 1024 shots', () => {
    expect(createEmptyCircuit()).toEqual({ num_qubits: 1, gates: [], shots: 1024 });
  });

  it('requires a measurement for simulation', () => {
    expect(validateCircuitClient(createEmptyCircuit(), { requireMeasurement: true })?.code).toBe(
      'MISSING_MEASUREMENT',
    );
    expect(validateCircuitClient(createEmptyCircuit())).toBeNull();
  });

  it('inserts a gate and measurement in canonical order', () => {
    const first = insertGate(createEmptyCircuit(), makeGate('h', 0), 0);
    expect(first.error).toBeNull();
    const second = insertGate(first.circuit, makeGate('measure', 0), 1);
    expect(second.error).toBeNull();
    expect(second.circuit.gates).toEqual([
      { name: 'h', target: 0 },
      { name: 'measure', target: 0, classical_bit: 0 },
    ]);
    expect(validateCircuitClient(second.circuit, { requireMeasurement: true })).toBeNull();
  });

  it('blocks a quantum gate after measurement', () => {
    const measured: Circuit = {
      num_qubits: 1,
      gates: [{ name: 'measure', target: 0, classical_bit: 0 }],
      shots: 1024,
    };
    const result = insertGate(measured, makeGate('x', 0), 1);
    expect(result.error?.code).toBe('GATE_AFTER_MEASUREMENT');
    expect(result.circuit.gates).toHaveLength(1);
  });

  it('blocks duplicate measurements', () => {
    const result = insertGate(
      bellCircuit(),
      makeGate('measure', 0),
      4,
    );
    expect(result.error?.code).toBe('DUPLICATE_MEASUREMENT');
  });

  it('blocks CNOT with identical control and target', () => {
    const result = insertGate(createEmptyCircuit(), makeGate('cx', 0, 0), 0);
    expect(result.error?.code).toBe('INVALID_CNOT_TARGET');
  });

  it('blocks out-of-range qubits', () => {
    const result = insertGate(createEmptyCircuit(), makeGate('x', 3), 0);
    expect(result.error?.code).toBe('QUBIT_OUT_OF_RANGE');
  });

  it('moves a gate within the sequence', () => {
    const circuit: Circuit = {
      num_qubits: 1,
      gates: [makeGate('h', 0), makeGate('x', 0), makeGate('measure', 0)],
      shots: 1024,
    };
    const result = moveGate(circuit, 0, 1);
    expect(result.error).toBeNull();
    expect(result.circuit.gates.map((gate) => gate.name)).toEqual(['x', 'h', 'measure']);
  });

  it('rejects a move that puts a quantum gate after measurement', () => {
    const circuit: Circuit = {
      num_qubits: 1,
      gates: [makeGate('h', 0), makeGate('measure', 0)],
      shots: 1024,
    };
    const result = moveGate(circuit, 0, 1);
    expect(result.error?.code).toBe('GATE_AFTER_MEASUREMENT');
    expect(result.circuit.gates[0]).toEqual({ name: 'h', target: 0 });
  });

  it('deletes a gate without disturbing the rest', () => {
    const circuit = bellCircuit();
    const next = deleteGate(circuit, 1);
    expect(next.gates.map((gate) => gate.name)).toEqual(['h', 'measure', 'measure']);
    expect(next.num_qubits).toBe(2);
  });

  it('adds qubits up to five and removes referenced gates from the end', () => {
    let circuit = createEmptyCircuit();
    for (let index = 0; index < 10; index += 1) circuit = addQubit(circuit);
    expect(circuit.num_qubits).toBe(5);

    const withGate = insertGate(circuit, makeGate('x', 4), 0).circuit;
    expect(qubitReferenced(withGate, 4)).toBe(true);
    const reduced = removeLastQubit(withGate);
    expect(reduced.num_qubits).toBe(4);
    expect(reduced.gates).toEqual([]);
  });

  it('clamps shots to the supported range', () => {
    expect(clampShots(1)).toBe(128);
    expect(clampShots(99999)).toBe(4096);
    expect(clampShots(1024.4)).toBe(1024);
  });

  it('computes measured bits and bit order', () => {
    expect(measuredBits(bellCircuit())).toEqual([0, 1]);
    expect(bitstringOrder(2)).toBe('c1c0');
    expect(bitstringOrder(1)).toBe('c0');
    expect(sortBitstrings(['11', '0', '10', '1'])).toEqual(['0', '1', '10', '11']);
  });
});
