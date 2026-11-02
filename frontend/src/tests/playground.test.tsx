import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { CircuitProvider } from '../state/circuit';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CircuitProvider>
        <App />
      </CircuitProvider>
    </MemoryRouter>,
  );
}

async function placeGate(user: ReturnType<typeof userEvent.setup>, paletteName: RegExp, cellName: string) {
  await user.click(screen.getByRole('button', { name: paletteName }));
  await user.click(screen.getByRole('button', { name: cellName }));
}

describe('Playground builder integration', () => {
  it('places a gate by clicking the palette and a circuit cell', async () => {
    const user = userEvent.setup();
    renderAt('/playground');

    await placeGate(user, /^H gate\./, 'Circuit cell, step 1, qubit 0');

    expect(screen.getAllByText('H gate on q0').length).toBeGreaterThan(0);
    expect(screen.getByText(/Added H on q0 at step 1/)).toBeInTheDocument();
  });

  it('adds a measurement and shows it in the instruction order', async () => {
    const user = userEvent.setup();
    renderAt('/playground');

    await placeGate(user, /^H gate\./, 'Circuit cell, step 1, qubit 0');
    await placeGate(user, /^Measure gate\./, 'Circuit cell, step 2, qubit 0');

    expect(screen.getAllByText('Measurement of q0 into classical bit 0').length).toBeGreaterThan(0);
  });

  it('adds a qubit and places a CNOT using control then target clicks', async () => {
    const user = userEvent.setup();
    renderAt('/playground');

    await user.click(screen.getByRole('button', { name: 'Add a qubit' }));
    expect(screen.getByText('2 / 5')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^CNOT gate\./ }));
    await user.click(screen.getByRole('button', { name: 'Circuit cell, step 1, qubit 0' }));
    expect(screen.getByText(/CNOT control is q0/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Circuit cell, step 1, qubit 1' }));
    expect(screen.getAllByText('CNOT with control q0 and target q1').length).toBeGreaterThan(0);
  });

  it('rejects a CNOT whose control and target are the same wire', async () => {
    const user = userEvent.setup();
    renderAt('/playground');

    await user.click(screen.getByRole('button', { name: /^CNOT gate\./ }));
    await user.click(screen.getByRole('button', { name: 'Circuit cell, step 1, qubit 0' }));
    await user.click(screen.getByRole('button', { name: 'Circuit cell, step 1, qubit 0' }));

    expect(screen.getByText(/Control and target must be different qubits/)).toBeInTheDocument();
  });

  it('blocks an invalid reorder and deletes a gate without corrupting the rest', async () => {
    const user = userEvent.setup();
    renderAt('/playground');

    await placeGate(user, /^H gate\./, 'Circuit cell, step 1, qubit 0');
    await placeGate(user, /^Measure gate\./, 'Circuit cell, step 2, qubit 0');

    await user.click(screen.getByRole('button', { name: /Select step 1: H gate on q0/ }));
    await user.click(screen.getByRole('button', { name: 'Move selected gate later' }));
    expect(screen.getByText(/No quantum gates may appear after a measurement/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete selected gate' }));
    expect(screen.getByText('Measurement of q0 into classical bit 0')).toBeInTheDocument();
    expect(screen.queryByText('H gate on q0')).not.toBeInTheDocument();
  });

  it('clears the circuit after confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderAt('/playground');

    await placeGate(user, /^H gate\./, 'Circuit cell, step 1, qubit 0');
    await user.click(screen.getByRole('button', { name: /Clear all gates/ }));

    expect(screen.getByText(/The circuit is empty/)).toBeInTheDocument();
  });

  it('keeps the circuit when a simulation request fails', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          error: { code: 'MISSING_MEASUREMENT', message: 'Add at least one measurement.' },
        }),
      }),
    );
    renderAt('/playground');

    await placeGate(user, /^H gate\./, 'Circuit cell, step 1, qubit 0');
    await placeGate(user, /^Measure gate\./, 'Circuit cell, step 2, qubit 0');
    await user.click(screen.getByRole('button', { name: /Run circuit/ }));

    await waitFor(() => expect(screen.getByText('Simulation could not run')).toBeInTheDocument());
    expect(screen.getByText('Add at least one measurement.')).toBeInTheDocument();
    expect(screen.getAllByText('Measurement of q0 into classical bit 0').length).toBeGreaterThan(0);
  });

  it('loads a lesson example into the builder through Try in Builder', async () => {
    const user = userEvent.setup();
    renderAt('/learn/superposition');

    const buttons = screen.getAllByRole('button', { name: /Try in Builder/ });
    await user.click(buttons[0]);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Quantum circuit playground' })).toBeInTheDocument(),
    );
    expect(screen.getAllByText('H gate on q0').length).toBeGreaterThan(0);
    expect(screen.getByText('Measurement of q0 into classical bit 0')).toBeInTheDocument();
  });
});
