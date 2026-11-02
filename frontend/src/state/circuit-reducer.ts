import type { ApiErrorPayload, Circuit, SimulationResult } from '../models/circuit';
import {
  addQubit,
  clampShots,
  createEmptyCircuit,
  deleteGate,
  insertGate,
  moveGate,
  removeLastQubit,
} from '../utils/circuit';

export type RunStatus = 'idle' | 'running' | 'success' | 'error';

export interface CircuitState {
  circuit: Circuit;
  results: SimulationResult | null;
  runStatus: RunStatus;
  error: ApiErrorPayload | null;
  resultsStale: boolean;
  history: Circuit[];
  future: Circuit[];
}

export const initialCircuitState: CircuitState = {
  circuit: createEmptyCircuit(),
  results: null,
  runStatus: 'idle',
  error: null,
  resultsStale: false,
  history: [],
  future: [],
};

export type CircuitAction =
  | { type: 'ADD_QUBIT' }
  | { type: 'REMOVE_LAST_QUBIT' }
  | { type: 'INSERT_GATE'; gate: Parameters<typeof insertGate>[1]; index: number }
  | { type: 'MOVE_GATE'; from: number; to: number }
  | { type: 'DELETE_GATE'; index: number }
  | { type: 'CLEAR_GATES' }
  | { type: 'SET_SHOTS'; shots: number }
  | { type: 'REPLACE_CIRCUIT'; circuit: Circuit }
  | { type: 'LOAD_TEMPLATE'; circuit: Circuit }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RUN_START' }
  | { type: 'RUN_SUCCESS'; results: SimulationResult }
  | { type: 'RUN_ERROR'; error: ApiErrorPayload }
  | { type: 'CLEAR_ERROR' };

function cloneCircuit(c: Circuit): Circuit {
  return {
    num_qubits: c.num_qubits,
    gates: c.gates.map((g) => ({ ...g })),
    shots: c.shots,
  };
}

function edited(state: CircuitState, newCircuit: Circuit): CircuitState {
  const isChanged = JSON.stringify(state.circuit) !== JSON.stringify(newCircuit);
  const newHistory = isChanged
    ? [...state.history, cloneCircuit(state.circuit)].slice(-25)
    : state.history;

  return {
    ...state,
    circuit: newCircuit,
    results: null,
    runStatus: 'idle',
    error: null,
    resultsStale: state.results !== null || state.resultsStale,
    history: newHistory,
    future: isChanged ? [] : state.future,
  };
}

export function circuitReducer(state: CircuitState, action: CircuitAction): CircuitState {
  switch (action.type) {
    case 'ADD_QUBIT':
      return edited(state, addQubit(state.circuit));
    case 'REMOVE_LAST_QUBIT':
      return edited(state, removeLastQubit(state.circuit));
    case 'INSERT_GATE': {
      const { circuit, error } = insertGate(state.circuit, action.gate, action.index);
      if (error) return { ...state, error, runStatus: 'error' };
      return edited(state, circuit);
    }
    case 'MOVE_GATE': {
      const { circuit, error } = moveGate(state.circuit, action.from, action.to);
      if (error) return { ...state, error, runStatus: 'error' };
      return edited(state, circuit);
    }
    case 'DELETE_GATE':
      return edited(state, deleteGate(state.circuit, action.index));
    case 'CLEAR_GATES':
      return edited(state, { ...state.circuit, gates: [] });
    case 'SET_SHOTS':
      return edited(state, { ...state.circuit, shots: clampShots(action.shots) });
    case 'REPLACE_CIRCUIT':
    case 'LOAD_TEMPLATE':
      return edited(state, {
        num_qubits: action.circuit.num_qubits,
        gates: action.circuit.gates.map((gate) => ({ ...gate })),
        shots: clampShots(action.circuit.shots),
      });
    case 'UNDO': {
      if (state.history.length === 0) return state;
      const previousCircuit = state.history[state.history.length - 1];
      const newHistory = state.history.slice(0, -1);
      const newFuture = [cloneCircuit(state.circuit), ...state.future].slice(0, 25);
      return {
        ...state,
        circuit: previousCircuit,
        history: newHistory,
        future: newFuture,
        results: null,
        runStatus: 'idle',
        error: null,
        resultsStale: true,
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const nextCircuit = state.future[0];
      const newFuture = state.future.slice(1);
      const newHistory = [...state.history, cloneCircuit(state.circuit)].slice(-25);
      return {
        ...state,
        circuit: nextCircuit,
        history: newHistory,
        future: newFuture,
        results: null,
        runStatus: 'idle',
        error: null,
        resultsStale: true,
      };
    }
    case 'RUN_START':
      return { ...state, runStatus: 'running', error: null, results: null };
    case 'RUN_SUCCESS':
      return { ...state, runStatus: 'success', results: action.results, error: null, resultsStale: false };
    case 'RUN_ERROR':
      return { ...state, runStatus: 'error', error: action.error, results: null };
    case 'CLEAR_ERROR':
      return { ...state, error: null, runStatus: state.results ? 'success' : 'idle' };
    default:
      return state;
  }
}
