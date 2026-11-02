import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Code2,
  Download,
  FlaskConical,
  Info,
  Minus,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { CircuitCanvas } from '../components/circuit/CircuitCanvas';
import { CircuitMetricsBar } from '../components/circuit/CircuitMetricsBar';
import { CircuitTemplates } from '../components/circuit/CircuitTemplates';
import { ExportModal } from '../components/circuit/ExportModal';
import { GatePalette } from '../components/circuit/GatePalette';
import { GateSequence } from '../components/circuit/GateSequence';
import { CodePanel } from '../components/code/CodePanel';
import { PageHeader } from '../components/layout/PageHeader';
import { ResultsPanel } from '../components/results/ResultsPanel';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Spinner';
import {
  MAX_QUBITS,
  MAX_SHOTS,
  MIN_SHOTS,
  type Circuit,
  type Gate,
  type GateName,
} from '../models/circuit';
import { simulateCircuit, toApiError, validateCircuit } from '../services/api';
import { useCircuit } from '../state/circuit';
import {
  GATE_LABELS,
  clampShots,
  createEmptyCircuit,
  describeGate,
  gateLabel,
  insertGate,
  makeGate,
  moveGate,
  qubitReferenced,
} from '../utils/circuit';

type Tab = 'builder' | 'code';

interface CnotPlacement {
  control: number;
  step: number;
}

interface ValidationMessage {
  tone: 'success' | 'error';
  title: string;
  message: string;
}

export function PlaygroundPage() {
  const { state, dispatch } = useCircuit();
  const { circuit } = state;
  const [tab, setTab] = useState<Tab>('builder');
  const [pendingGate, setPendingGate] = useState<GateName | null>(null);
  const [pendingCnot, setPendingCnot] = useState<CnotPlacement | null>(null);
  const [draggingGate, setDraggingGate] = useState<GateName | null>(null);
  const [selectedGateIndex, setSelectedGateIndex] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationMessage | null>(null);
  const [validating, setValidating] = useState(false);
  const [shotsDraft, setShotsDraft] = useState(String(circuit.shots));
  const [isExportOpen, setIsExportOpen] = useState(false);

  const canUndo = state.history.length > 0;
  const canRedo = state.future.length > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const fingerprint = JSON.stringify(circuit);

  useEffect(() => {
    setValidation(null);
  }, [fingerprint]);

  useEffect(() => {
    setShotsDraft(String(circuit.shots));
  }, [circuit.shots]);

  useEffect(() => {
    if (selectedGateIndex !== null && selectedGateIndex >= circuit.gates.length) {
      setSelectedGateIndex(null);
    }
  }, [circuit.gates.length, selectedGateIndex]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('.cm-editor'))
      ) {
        return;
      }

      if (event.key === 'Escape') {
        setPendingGate(null);
        setPendingCnot(null);
        setNotice(null);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          dispatch({ type: 'REDO' });
        } else {
          dispatch({ type: 'UNDO' });
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        dispatch({ type: 'REDO' });
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedGateIndex !== null) {
        event.preventDefault();
        handleDelete(selectedGateIndex);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGateIndex]);

  const selectedGate = selectedGateIndex !== null ? circuit.gates[selectedGateIndex] : undefined;

  async function runCircuit(target: Circuit): Promise<void> {
    dispatch({ type: 'RUN_START' });
    try {
      const results = await simulateCircuit(target);
      dispatch({ type: 'RUN_SUCCESS', results });
    } catch (caught) {
      const apiError = toApiError(caught);
      dispatch({
        type: 'RUN_ERROR',
        error: {
          code: apiError.code,
          message: apiError.message,
          gate_index: apiError.gateIndex,
          line: apiError.line,
          column: apiError.column,
        },
      });
    }
  }

  async function handleValidate(): Promise<void> {
    setValidating(true);
    setValidation(null);
    try {
      await validateCircuit(circuit);
      setValidation({
        tone: 'success',
        title: 'Circuit is valid',
        message: 'The backend accepted this canonical Circuit JSON. Add a measurement, then run it.',
      });
    } catch (caught) {
      const apiError = toApiError(caught);
      setValidation({
        tone: 'error',
        title: 'Validation failed',
        message: `${apiError.message} (${apiError.code})`,
      });
    } finally {
      setValidating(false);
    }
  }

  function selectPaletteGate(name: GateName): void {
    if (pendingGate === name) {
      cancelPlacement();
      return;
    }
    setPendingGate(name);
    setPendingCnot(null);
    setSelectedGateIndex(null);
    setNotice(
      name === 'cx'
        ? 'Choose a control wire, then a different target wire in the same step.'
        : `Click a wire cell to place ${GATE_LABELS[name]}.`,
    );
  }

  function cancelPlacement(): void {
    setPendingGate(null);
    setPendingCnot(null);
    setNotice(null);
  }

  function insertAt(gate: Gate, step: number): boolean {
    const check = insertGate(circuit, gate, step);
    if (check.error) {
      setNotice(check.error.message);
      return false;
    }
    dispatch({ type: 'INSERT_GATE', gate, index: step });
    setSelectedGateIndex(step);
    return true;
  }

  function handleCellClick(qubit: number, step: number): void {
    if (pendingGate === null) {
      setSelectedGateIndex(null);
      return;
    }

    if (pendingGate === 'cx') {
      if (!pendingCnot) {
        setPendingCnot({ control: qubit, step });
        setNotice(`Control q${qubit} selected. Choose a different target wire in step ${step + 1}.`);
        return;
      }
      if (step !== pendingCnot.step) {
        setNotice(`CNOT spans one step. Choose the target in step ${pendingCnot.step + 1}.`);
        return;
      }
      if (pendingCnot.control === qubit) {
        setNotice('Control and target must be different qubits. Choose another target wire.');
        return;
      }
      const gate = makeGate('cx', qubit, pendingCnot.control);
      if (insertAt(gate, pendingCnot.step)) {
        setNotice(`Added CNOT with control q${pendingCnot.control} and target q${qubit}.`);
        setPendingGate(null);
        setPendingCnot(null);
      }
      return;
    }

    const gate = makeGate(pendingGate, qubit);
    if (insertAt(gate, step)) {
      setNotice(`Added ${GATE_LABELS[pendingGate]} on q${qubit} at step ${step + 1}.`);
      setPendingGate(null);
    }
  }

  function handleGateSelect(index: number): void {
    if (pendingGate !== null) return;
    setSelectedGateIndex(index);
  }

  function handleMove(index: number, direction: -1 | 1): void {
    const to = index + direction;
    if (to < 0 || to >= circuit.gates.length) return;
    const check = moveGate(circuit, index, to);
    if (check.error) {
      setNotice(check.error.message);
      return;
    }
    dispatch({ type: 'MOVE_GATE', from: index, to });
    setSelectedGateIndex(to);
    setNotice(`Moved step ${index + 1} to position ${to + 1}.`);
  }

  function handleDelete(index: number): void {
    const label = gateLabel(circuit.gates[index]);
    dispatch({ type: 'DELETE_GATE', index });
    setSelectedGateIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
    setNotice(`Deleted ${label}.`);
  }

  function handleAddQubit(): void {
    if (circuit.num_qubits >= MAX_QUBITS) return;
    dispatch({ type: 'ADD_QUBIT' });
    setNotice(`Added q${circuit.num_qubits}. The circuit now has ${circuit.num_qubits + 1} qubits.`);
  }

  function handleRemoveQubit(): void {
    if (circuit.num_qubits <= 1) return;
    const last = circuit.num_qubits - 1;
    if (qubitReferenced(circuit, last)) {
      const confirmed = window.confirm(
        `q${last} is used by at least one gate. Removing it will also remove those gates. Continue?`,
      );
      if (!confirmed) return;
    }
    dispatch({ type: 'REMOVE_LAST_QUBIT' });
    setSelectedGateIndex(null);
    setNotice(`Removed q${last}.`);
  }

  function handleClear(): void {
    if (circuit.gates.length === 0) return;
    if (!window.confirm('Remove every gate from the circuit? This cannot be undone.')) return;
    dispatch({ type: 'CLEAR_GATES' });
    setSelectedGateIndex(null);
    setPendingGate(null);
    setPendingCnot(null);
    setNotice('Cleared all gates. Qubit count and shots were kept.');
  }

  function handleReset(): void {
    if (circuit.gates.length > 0 || circuit.num_qubits > 1) {
      const confirmed = window.confirm('Reset the playground to a blank 1-qubit circuit?');
      if (!confirmed) return;
    }
    dispatch({ type: 'REPLACE_CIRCUIT', circuit: createEmptyCircuit() });
    setSelectedGateIndex(null);
    setPendingGate(null);
    setPendingCnot(null);
    setValidation(null);
    setNotice('Playground reset to a blank 1-qubit circuit.');
  }

  function handleShotsInput(raw: string): void {
    setShotsDraft(raw);
    const value = Number(raw);
    if (Number.isInteger(value) && value >= MIN_SHOTS && value <= MAX_SHOTS) {
      dispatch({ type: 'SET_SHOTS', shots: value });
    }
  }

  function commitShots(): void {
    const value = clampShots(Number(shotsDraft));
    dispatch({ type: 'SET_SHOTS', shots: value });
    setShotsDraft(String(value));
  }

  function handleDragStart(event: DragStartEvent): void {
    const name = event.active.data.current?.gateName;
    if (typeof name !== 'string') return;
    const gateName = name as GateName;
    setDraggingGate(gateName);
    setPendingGate(gateName);
    setPendingCnot(null);
    setSelectedGateIndex(null);
    setNotice(
      gateName === 'cx'
        ? 'Drop on a control wire, then click a different target wire in the same step.'
        : `Drop ${GATE_LABELS[gateName]} on a wire cell.`,
    );
  }

  function handleDragEnd(event: DragEndEvent): void {
    const name =
      (event.active.data.current?.gateName as GateName | undefined) ?? draggingGate;
    setDraggingGate(null);
    if (!name || !event.over) return;
    const parts = String(event.over.id).split(':');
    if (parts.length !== 3 || parts[0] !== 'cell') return;
    const step = Number(parts[1]);
    const qubit = Number(parts[2]);
    if (!Number.isInteger(step) || !Number.isInteger(qubit)) return;

    if (name === 'cx') {
      setPendingGate('cx');
      setPendingCnot({ control: qubit, step });
      setNotice(`Control q${qubit} selected. Click a different target wire in step ${step + 1}.`);
      return;
    }

    const gate = makeGate(name, qubit);
    if (insertAt(gate, step)) {
      setPendingGate(null);
      setPendingCnot(null);
      setNotice(`Added ${GATE_LABELS[name]} on q${qubit} at step ${step + 1}.`);
    }
  }

  function handleDragCancel(): void {
    setDraggingGate(null);
    setPendingGate(null);
    setPendingCnot(null);
    setNotice(null);
  }

  const busy = state.runStatus === 'running';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Playground"
        title="Quantum circuit playground"
        description="Build an ordered circuit, run it on Qiskit Aer, and inspect the sampled measurement outcomes. Every edit invalidates the previous result."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="btn-secondary"
              title="Export circuit to Qiskit Python, OpenQASM, or JSON"
            >
              <Download size={15} aria-hidden="true" /> Export
            </button>
            <button type="button" onClick={handleReset} className="btn-secondary">
              <RotateCcw size={15} aria-hidden="true" /> Reset
            </button>
          </div>
        }
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Playground views" className="flex gap-1 rounded-xl bg-slate-200/70 p-1">
            <button
              id="tab-builder"
              type="button"
              role="tab"
              aria-selected={tab === 'builder'}
              aria-controls="panel-builder"
              onClick={() => setTab('builder')}
              className={[
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                tab === 'builder' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              <FlaskConical size={16} aria-hidden="true" /> Circuit Builder
            </button>
            <button
              id="tab-code"
              type="button"
              role="tab"
              aria-selected={tab === 'code'}
              aria-controls="panel-code"
              onClick={() => setTab('code')}
              className={[
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                tab === 'code' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              <Code2 size={16} aria-hidden="true" /> Python Code
            </button>
          </div>

          {/* Undo / Redo buttons */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-200/70 p-1" role="group" aria-label="Undo and Redo">
            <button
              type="button"
              onClick={() => dispatch({ type: 'UNDO' })}
              disabled={!canUndo}
              className="rounded-lg p-1.5 text-slate-700 transition hover:bg-white hover:shadow-xs disabled:opacity-30 disabled:hover:bg-transparent"
              title="Undo (Ctrl+Z)"
              aria-label="Undo last change"
            >
              <Undo2 size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'REDO' })}
              disabled={!canRedo}
              className="rounded-lg p-1.5 text-slate-700 transition hover:bg-white hover:shadow-xs disabled:opacity-30 disabled:hover:bg-transparent"
              title="Redo (Ctrl+Y)"
              aria-label="Redo change"
            >
              <Redo2 size={16} aria-hidden="true" />
            </button>
          </div>

          {/* Presets / Templates */}
          <CircuitTemplates onSelect={(tmpl) => dispatch({ type: 'LOAD_TEMPLATE', circuit: tmpl })} />
        </div>

        {/* Live Circuit Metrics Bar */}
        <CircuitMetricsBar circuit={circuit} backendDepth={state.results?.circuit_depth} />
      </div>

      <div
        id="panel-builder"
        role="tabpanel"
        aria-labelledby="tab-builder"
        hidden={tab !== 'builder'}
        className="mt-5"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_320px]">
            <GatePalette pending={pendingGate} onSelect={selectPaletteGate} />

            <div className="min-w-0 space-y-3">
              <div
                aria-live="polite"
                className={[
                  'flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-xs',
                  pendingGate
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 bg-white text-slate-600',
                ].join(' ')}
              >
                <Info size={14} className="shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  {pendingGate
                    ? pendingCnot
                      ? `CNOT control is q${pendingCnot.control}. Choose a different target wire in step ${pendingCnot.step + 1}.`
                      : `Placing ${GATE_LABELS[pendingGate]}. Click a wire cell at the step you want.`
                    : 'Select a gate from the palette, or drag one onto a wire cell. Click an existing gate to move or delete it.'}
                </span>
                {pendingGate ? (
                  <button type="button" onClick={cancelPlacement} className="btn-ghost px-2 py-1 text-[11px]">
                    <X size={12} aria-hidden="true" /> Cancel
                  </button>
                ) : null}
              </div>

              {notice ? (
                <Alert tone="info" title="Builder" onDismiss={() => setNotice(null)}>
                  {notice}
                </Alert>
              ) : null}

              <CircuitCanvas
                circuit={circuit}
                selectedGateIndex={selectedGateIndex}
                pendingGate={pendingGate}
                pendingControl={pendingCnot?.control ?? null}
                pendingControlStep={pendingCnot?.step ?? null}
                onCellClick={handleCellClick}
                onGateSelect={handleGateSelect}
              />

              {selectedGate ? (
                <div className="card flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Selected step {selectedGateIndex !== null ? selectedGateIndex + 1 : ''}
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-900">{describeGate(selectedGate)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => selectedGateIndex !== null && handleMove(selectedGateIndex, -1)}
                      disabled={selectedGateIndex === null || selectedGateIndex === 0}
                      className="btn-secondary px-2 py-1.5 text-xs"
                      aria-label="Move selected gate earlier"
                    >
                      <ArrowLeft size={14} aria-hidden="true" /> Earlier
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedGateIndex !== null && handleMove(selectedGateIndex, 1)}
                      disabled={selectedGateIndex === null || selectedGateIndex === circuit.gates.length - 1}
                      className="btn-secondary px-2 py-1.5 text-xs"
                      aria-label="Move selected gate later"
                    >
                      Later <ArrowRight size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedGateIndex !== null && handleDelete(selectedGateIndex)}
                      className="btn-danger px-2 py-1.5 text-xs"
                      aria-label="Delete selected gate"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : null}

              <GateSequence
                circuit={circuit}
                selectedGateIndex={selectedGateIndex}
                onSelect={setSelectedGateIndex}
                onMove={handleMove}
                onDelete={handleDelete}
              />
            </div>

            <aside className="space-y-4 lg:col-span-2 xl:col-span-1">
              <section className="card p-4" aria-labelledby="run-settings-title">
                <div className="flex items-center gap-2">
                  <Settings2 size={17} className="text-indigo-600" aria-hidden="true" />
                  <h2 id="run-settings-title" className="text-sm font-bold text-slate-900">
                    Run settings
                  </h2>
                </div>

                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Qubits</p>
                  <div className="mt-1.5 flex items-center justify-between rounded-lg border border-slate-300 bg-white px-1.5 py-1">
                    <button
                      type="button"
                      onClick={handleRemoveQubit}
                      disabled={circuit.num_qubits <= 1}
                      className="rounded p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      aria-label="Remove the last qubit"
                    >
                      <Minus size={15} aria-hidden="true" />
                    </button>
                    <span className="text-sm font-bold text-slate-900">
                      {circuit.num_qubits} / {MAX_QUBITS}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddQubit}
                      disabled={circuit.num_qubits >= MAX_QUBITS}
                      className="rounded p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      aria-label="Add a qubit"
                    >
                      <Plus size={15} aria-hidden="true" />
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">Qubits can only be removed from the end.</p>
                </div>

                <div className="mt-4">
                  <label htmlFor="shots-input" className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Shots
                  </label>
                  <input
                    id="shots-input"
                    type="number"
                    inputMode="numeric"
                    min={MIN_SHOTS}
                    max={MAX_SHOTS}
                    step={1}
                    value={shotsDraft}
                    onChange={(event) => handleShotsInput(event.target.value)}
                    onBlur={commitShots}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commitShots();
                    }}
                    className="input mt-1.5"
                    aria-describedby="shots-help"
                  />
                  <p id="shots-help" className="mt-1 text-[10px] text-slate-400">
                    Whole number from {MIN_SHOTS} to {MAX_SHOTS}.
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    {[128, 1024, 4096].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          dispatch({ type: 'SET_SHOTS', shots: preset });
                          setShotsDraft(String(preset));
                        }}
                        className={[
                          'rounded-md border px-2 py-1 text-[11px] font-semibold',
                          circuit.shots === preset
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                        ].join(' ')}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => void runCircuit(circuit)}
                    disabled={busy}
                    className="btn-primary w-full"
                  >
                    {busy ? <Spinner label="Running simulation" /> : <Play size={15} aria-hidden="true" />}
                    {busy ? 'Running…' : 'Run circuit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleValidate()}
                    disabled={busy || validating}
                    className="btn-secondary w-full"
                  >
                    {validating ? <Spinner label="Validating" /> : <CheckCircle2 size={15} aria-hidden="true" />}
                    Validate circuit
                  </button>
                </div>

                {validation ? (
                  <div className="mt-3">
                    <Alert
                      tone={validation.tone}
                      title={validation.title}
                      onDismiss={() => setValidation(null)}
                    >
                      {validation.message}
                    </Alert>
                  </div>
                ) : null}

                <div className="mt-4 border-t border-slate-200 pt-3">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={circuit.gates.length === 0}
                    className="btn-danger w-full text-xs"
                  >
                    <Trash2 size={14} aria-hidden="true" /> Clear all gates
                  </button>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="rules-title">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" aria-hidden="true" />
                  <h2 id="rules-title" className="text-sm font-bold text-slate-900">
                    Circuit rules
                  </h2>
                </div>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-5 text-slate-600">
                  <li>• 1–5 qubits and at most 50 gate instructions.</li>
                  <li>• Each qubit may be measured once, and measurement must come last.</li>
                  <li>• CNOT control and target must be different qubits.</li>
                  <li>• Simulation requires at least one measurement.</li>
                  <li>• The backend re-validates everything before running Aer.</li>
                </ul>
              </section>
            </aside>
          </div>

          <DragOverlay dropAnimation={null}>
            {draggingGate ? (
              <div className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-lg">
                {GATE_LABELS[draggingGate]}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <div id="panel-code" role="tabpanel" aria-labelledby="tab-code" hidden={tab !== 'code'} className="mt-5">
        <CodePanel circuit={circuit} isActive={tab === 'code'} running={busy} onRun={runCircuit} />
      </div>

      <div className="mt-6">
        <ResultsPanel
          results={state.results}
          status={state.runStatus}
          error={state.error}
          resultsStale={state.resultsStale}
          onRetry={() => void runCircuit(circuit)}
          onDismissError={() => dispatch({ type: 'CLEAR_ERROR' })}
        />
      </div>

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        circuit={circuit}
        results={state.results}
      />
    </div>
  );
}
