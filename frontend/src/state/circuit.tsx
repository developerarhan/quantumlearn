import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import {
  circuitReducer,
  initialCircuitState,
  type CircuitAction,
  type CircuitState,
} from './circuit-reducer';

export type { CircuitAction, CircuitState, RunStatus } from './circuit-reducer';

interface CircuitContextValue {
  state: CircuitState;
  dispatch: Dispatch<CircuitAction>;
}

const CircuitContext = createContext<CircuitContextValue | null>(null);

export function CircuitProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(circuitReducer, initialCircuitState);
  return <CircuitContext.Provider value={{ state, dispatch }}>{children}</CircuitContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCircuit(): CircuitContextValue {
  const context = useContext(CircuitContext);
  if (!context) throw new Error('useCircuit must be used inside CircuitProvider');
  return context;
}
