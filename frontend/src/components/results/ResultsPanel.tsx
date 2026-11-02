import { Activity, BarChart3, Binary, FlaskConical, Info, Radio, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { ApiErrorPayload, SimulationResult } from '../../models/circuit';
import type { RunStatus } from '../../state/circuit';
import { Alert } from '../ui/Alert';
import { Spinner } from '../ui/Spinner';
import { CountsTable } from './CountsTable';
import { ExplanationCard } from './ExplanationCard';
import { ProbabilityChart } from './ProbabilityChart';
import { StatevectorView } from './StatevectorView';

interface ResultsPanelProps {
  results: SimulationResult | null;
  status: RunStatus;
  error: ApiErrorPayload | null;
  resultsStale: boolean;
  onRetry?: () => void;
  onDismissError?: () => void;
}

function measuredBitsLabel(bits: number[]): string {
  if (bits.length === 0) return 'None';
  return bits.map((bit) => `q${bit} → c${bit}`).join(', ');
}

type ResultsViewTab = 'probabilities' | 'statevector';

export function ResultsPanel({
  results,
  status,
  error,
  resultsStale,
  onRetry,
  onDismissError,
}: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<ResultsViewTab>('probabilities');

  return (
    <section aria-labelledby="results-title" className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-indigo-600" aria-hidden="true" />
          <h2 id="results-title" className="text-sm font-bold text-slate-900">
            Simulation Results
          </h2>
        </div>
        {results ? (
          <span className="badge bg-emerald-100 text-emerald-800">
            <Radio size={12} aria-hidden="true" /> Live Aer output
          </span>
        ) : null}
      </div>

      <div className="space-y-4 p-4">
        {status === 'running' ? (
          <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-8 text-sm text-indigo-900">
            <Spinner label="Running simulation" />
            <span>Running Qiskit Aer and sampling measurement outcomes…</span>
          </div>
        ) : null}

        {error ? (
          <Alert tone="error" title="Simulation could not run" onDismiss={onDismissError}>
            <p>{error.message}</p>
            <p className="mt-1 font-mono text-[11px] opacity-70">
              {error.code}
              {error.gate_index !== undefined ? ` · gate ${error.gate_index + 1}` : ''}
              {error.line !== undefined ? ` · line ${error.line}` : ''}
              {error.column !== undefined ? `:${error.column}` : ''}
            </p>
            {onRetry ? (
              <button type="button" onClick={onRetry} className="btn-secondary mt-3 px-3 py-1.5 text-xs">
                <RotateCcw size={13} aria-hidden="true" /> Try again
              </button>
            ) : null}
          </Alert>
        ) : null}

        {!results && status !== 'running' && !error ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
            <FlaskConical size={28} className="mx-auto text-slate-300" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-slate-700">No results yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
              Build a circuit that ends with at least one measurement, then choose <strong>Run circuit</strong>.
              Counts and observed probabilities will appear here.
            </p>
          </div>
        ) : null}

        {!results && resultsStale && status !== 'running' ? (
          <Alert tone="info" title="Previous results were cleared">
            The circuit changed after the last run. Run it again to see fresh counts.
          </Alert>
        ) : null}

        {results ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Shots</p>
                <p className="mt-1 font-mono text-base font-bold text-slate-900">{results.shots}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Depth</p>
                <div className="mt-1 flex items-center gap-1 font-mono text-base font-bold text-emerald-700">
                  <Activity size={14} aria-hidden="true" />
                  {results.circuit_depth ?? '—'}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Simulator</p>
                <p className="mt-1 text-xs font-bold text-slate-900">{results.simulator}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Measured</p>
                <p className="mt-1 truncate text-xs font-semibold leading-5 text-slate-900" title={measuredBitsLabel(results.measured_bits)}>
                  {measuredBitsLabel(results.measured_bits)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Bit Order</p>
                <p className="mt-1 font-mono text-xs font-bold text-slate-900">{results.bitstring_order}</p>
                <p className="text-[10px] text-slate-400">left → right</p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-600 border border-slate-200/60">
              <Info size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
              <p>
                Bitstrings print with the highest-index classical bit leftmost ($c_1c_0$). Unmeasured qubits
                default their classical register to 0.
              </p>
            </div>

            <ExplanationCard result={results} />

            {/* Results Tab View */}
            <div className="border-b border-slate-200">
              <nav className="-mb-px flex gap-4" aria-label="Result View Mode">
                <button
                  type="button"
                  onClick={() => setActiveTab('probabilities')}
                  className={[
                    'flex items-center gap-2 border-b-2 py-2 text-xs font-bold transition-colors',
                    activeTab === 'probabilities'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800',
                  ].join(' ')}
                >
                  <BarChart3 size={15} aria-hidden="true" />
                  Observed Probabilities & Counts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('statevector')}
                  className={[
                    'flex items-center gap-2 border-b-2 py-2 text-xs font-bold transition-colors',
                    activeTab === 'statevector'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800',
                  ].join(' ')}
                >
                  <Binary size={15} aria-hidden="true" />
                  Theoretical Statevector (|ψ⟩)
                </button>
              </nav>
            </div>

            {activeTab === 'probabilities' ? (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Observed Probabilities
                  </h3>
                  <ProbabilityChart result={results} />
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Measurement Counts Table
                  </h3>
                  <CountsTable result={results} />
                </div>
              </div>
            ) : (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Pre-Measurement Amplitudes & Phase
                </h3>
                <StatevectorView
                  entries={results.statevector ?? []}
                  observedCounts={results.counts}
                  shots={results.shots}
                />
              </div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
