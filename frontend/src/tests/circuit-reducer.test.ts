import { describe, expect, it } from 'vitest';
import type { SimulationResult } from '../models/circuit';
import {
  circuitReducer,
  initialCircuitState,
  type CircuitState,
} from '../state/circuit-reducer';
import { makeGate } from '../utils/circuit';

const result: SimulationResult = {
  counts: { 0: 512, 1: 512 },
  probabilities: { 0: 0.5, 1: 0.5 },
  shots: 1024,
  measured_bits: [0],
  bitstring_order: 'c0',
  simulator: 'qiskit-aer',
  explanation_key: 'superposition',
};

function withHAndMeasurement(): CircuitState {
  let state = circuitReducer(initialCircuitState, {
    type: 'INSERT_GATE',
    gate: makeGate('h', 0),
    index: 0,
  });
  state = circuitReducer(state, {
    type: 'INSERT_GATE',
    gate: makeGate('measure', 0),
    index: 1,
  });
  return state;
}

describe('circuit reducer', () => {
  it('adds gates in instruction order', () => {
    const state = withHAndMeasurement();
    expect(state.circuit.gates.map((gate) => gate.name)).toEqual(['h', 'measure']);
  });

  it('clears stale results on any circuit edit', () => {
    const run = circuitReducer(withHAndMeasurement(), { type: 'RUN_SUCCESS', results: result });
    expect(run.results).toEqual(result);
    expect(run.resultsStale).toBe(false);

    const edited = circuitReducer(run, { type: 'DELETE_GATE', index: 0 });
    expect(edited.results).toBeNull();
    expect(edited.resultsStale).toBe(true);
    expect(edited.runStatus).toBe('idle');
  });

  it('clears results when shots change', () => {
    const run = circuitReducer(withHAndMeasurement(), { type: 'RUN_SUCCESS', results: result });
    const changed = circuitReducer(run, { type: 'SET_SHOTS', shots: 2048 });
    expect(changed.circuit.shots).toBe(2048);
    expect(changed.results).toBeNull();
    expect(changed.resultsStale).toBe(true);
  });

  it('replaces the circuit and invalidates results', () => {
    const run = circuitReducer(withHAndMeasurement(), { type: 'RUN_SUCCESS', results: result });
    const replaced = circuitReducer(run, {
      type: 'REPLACE_CIRCUIT',
      circuit: {
        num_qubits: 2,
        gates: [
          { name: 'h', target: 0 },
          { name: 'cx', control: 0, target: 1 },
          { name: 'measure', target: 0, classical_bit: 0 },
          { name: 'measure', target: 1, classical_bit: 1 },
        ],
        shots: 512,
      },
    });
    expect(replaced.circuit.num_qubits).toBe(2);
    expect(replaced.circuit.shots).toBe(512);
    expect(replaced.results).toBeNull();
    expect(replaced.resultsStale).toBe(true);
  });

  it('records run lifecycle states', () => {
    const running = circuitReducer(withHAndMeasurement(), { type: 'RUN_START' });
    expect(running.runStatus).toBe('running');
    expect(running.error).toBeNull();

    const failed = circuitReducer(running, {
      type: 'RUN_ERROR',
      error: { code: 'MISSING_MEASUREMENT', message: 'Add a measurement.' },
    });
    expect(failed.runStatus).toBe('error');
    expect(failed.error?.code).toBe('MISSING_MEASUREMENT');
    expect(failed.circuit.gates).toHaveLength(2);
  });

  it('keeps the circuit unchanged when an invalid move is requested', () => {
    const state = withHAndMeasurement();
    const moved = circuitReducer(state, { type: 'MOVE_GATE', from: 0, to: 1 });
    expect(moved.circuit).toEqual(state.circuit);
    expect(moved.error?.code).toBe('GATE_AFTER_MEASUREMENT');
  });

  it('clears all gates but preserves qubits and shots', () => {
    const state = withHAndMeasurement();
    const cleared = circuitReducer(state, { type: 'CLEAR_GATES' });
    expect(cleared.circuit.gates).toEqual([]);
    expect(cleared.circuit.num_qubits).toBe(1);
    expect(cleared.circuit.shots).toBe(1024);
  });

  it('supports undo and redo transitions', () => {
    let state = initialCircuitState;
    expect(state.history).toHaveLength(0);
    expect(state.future).toHaveLength(0);

    // Insert H gate
    state = circuitReducer(state, {
      type: 'INSERT_GATE',
      gate: makeGate('h', 0),
      index: 0,
    });
    expect(state.circuit.gates).toHaveLength(1);
    expect(state.history).toHaveLength(1);

    // Insert Measure gate
    state = circuitReducer(state, {
      type: 'INSERT_GATE',
      gate: makeGate('measure', 0),
      index: 1,
    });
    expect(state.circuit.gates).toHaveLength(2);
    expect(state.history).toHaveLength(2);

    // Undo measurement
    state = circuitReducer(state, { type: 'UNDO' });
    expect(state.circuit.gates).toHaveLength(1);
    expect(state.circuit.gates[0].name).toBe('h');
    expect(state.history).toHaveLength(1);
    expect(state.future).toHaveLength(1);

    // Redo measurement
    state = circuitReducer(state, { type: 'REDO' });
    expect(state.circuit.gates).toHaveLength(2);
    expect(state.circuit.gates[1].name).toBe('measure');
    expect(state.future).toHaveLength(0);
  });

  it('loads preset templates into the circuit state', () => {
    const templateCircuit = {
      num_qubits: 2,
      gates: [makeGate('h', 0), makeGate('cx', 1, 0)],
      shots: 2048,
    };
    const state = circuitReducer(initialCircuitState, {
      type: 'LOAD_TEMPLATE',
      circuit: templateCircuit,
    });
    expect(state.circuit.num_qubits).toBe(2);
    expect(state.circuit.gates).toHaveLength(2);
    expect(state.circuit.shots).toBe(2048);
    expect(state.history).toHaveLength(1);
  });
});
