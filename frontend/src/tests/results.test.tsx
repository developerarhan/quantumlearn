import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResultsPanel } from '../components/results/ResultsPanel';
import type { SimulationResult } from '../models/circuit';

const result: SimulationResult = {
  counts: { 0: 526, 1: 498 },
  probabilities: { 0: 0.513672, 1: 0.486328 },
  shots: 1024,
  measured_bits: [0],
  bitstring_order: 'c0',
  simulator: 'qiskit-aer',
  explanation_key: 'superposition',
};

describe('ResultsPanel', () => {
  it('shows counts, observed percentages, and the sampled explanation', () => {
    render(
      <ResultsPanel results={result} status="success" error={null} resultsStale={false} />,
    );
    expect(screen.getByText('526')).toBeInTheDocument();
    expect(screen.getByText('498')).toBeInTheDocument();
    expect(screen.getByText('51.37%')).toBeInTheDocument();
    expect(screen.getByText('48.63%')).toBeInTheDocument();
    expect(screen.getByText('q0 → c0')).toBeInTheDocument();
    expect(screen.getByText('H creates an equal-amplitude superposition')).toBeInTheDocument();
    expect(screen.getByText(/0: 51.4 percent/)).toBeInTheDocument();
  });

  it('shows an empty state before a run', () => {
    render(<ResultsPanel results={null} status="idle" error={null} resultsStale={false} />);
    expect(screen.getByText('No results yet')).toBeInTheDocument();
  });

  it('marks cleared results as stale', () => {
    render(<ResultsPanel results={null} status="idle" error={null} resultsStale />);
    expect(screen.getByText('Previous results were cleared')).toBeInTheDocument();
  });

  it('shows a friendly API error and keeps the retry action', () => {
    render(
      <ResultsPanel
        results={null}
        status="error"
        error={{ code: 'MISSING_MEASUREMENT', message: 'Add at least one measurement.' }}
        resultsStale={false}
        onRetry={() => undefined}
      />,
    );
    expect(screen.getByText('Simulation could not run')).toBeInTheDocument();
    expect(screen.getByText('Add at least one measurement.')).toBeInTheDocument();
    expect(screen.getByText('MISSING_MEASUREMENT')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
  });
});
