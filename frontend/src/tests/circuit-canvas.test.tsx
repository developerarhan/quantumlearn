import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CircuitCanvas } from '../components/circuit/CircuitCanvas';
import type { Circuit } from '../models/circuit';

const bell: Circuit = {
  num_qubits: 2,
  gates: [
    { name: 'h', target: 0 },
    { name: 'cx', control: 0, target: 1 },
    { name: 'measure', target: 0, classical_bit: 0 },
    { name: 'measure', target: 1, classical_bit: 1 },
  ],
  shots: 1024,
};

function renderCanvas(circuit: Circuit, onCellClick = vi.fn(), onGateSelect = vi.fn()) {
  render(
    <DndContext>
      <CircuitCanvas
        circuit={circuit}
        selectedGateIndex={null}
        pendingGate={null}
        pendingControl={null}
        pendingControlStep={null}
        onCellClick={onCellClick}
        onGateSelect={onGateSelect}
      />
    </DndContext>,
  );
  return { onCellClick, onGateSelect };
}

describe('CircuitCanvas', () => {
  it('renders wires, single-qubit gates, CNOT, and measurements from state', () => {
    renderCanvas(bell);
    expect(screen.getByRole('group', { name: /Circuit diagram with 2 qubits and 4 steps/ })).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getAllByText('M')).toHaveLength(2);
    expect(screen.getByText('CNOT q0→q1')).toBeInTheDocument();
    expect(screen.getByText('q0')).toBeInTheDocument();
    expect(screen.getByText('q1')).toBeInTheDocument();
  });

  it('provides clickable cells for every step and qubit', async () => {
    const user = userEvent.setup();
    const { onCellClick } = renderCanvas(bell);
    await user.click(screen.getByRole('button', { name: 'Circuit cell, step 3, qubit 1' }));
    expect(onCellClick).toHaveBeenCalledWith(1, 2);
  });

  it('selects a gate when it is clicked', async () => {
    const user = userEvent.setup();
    const { onGateSelect } = renderCanvas(bell);
    await user.click(screen.getByRole('button', { name: /Step 1: H on q0/ }));
    expect(onGateSelect).toHaveBeenCalledWith(0);
  });
});
