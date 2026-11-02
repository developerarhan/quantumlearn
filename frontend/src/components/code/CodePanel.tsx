import { Check, Code2, Copy, FileCode2, Play, RefreshCw, RotateCcw, ShieldCheck, Wand2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ApiError, Circuit } from '../../models/circuit';
import { generateCode, parseCode, toApiError } from '../../services/api';
import { useCircuit } from '../../state/circuit';
import { circuitFingerprint } from '../../utils/circuit';
import { Alert } from '../ui/Alert';
import { Spinner } from '../ui/Spinner';
import { PythonCodeEditor } from './PythonCodeEditor';

type Busy = 'generate' | 'apply' | 'run' | null;

interface Message {
  tone: 'success' | 'info' | 'warning';
  title: string;
  body: string;
}

interface CodePanelProps {
  circuit: Circuit;
  isActive: boolean;
  running: boolean;
  onRun: (circuit: Circuit) => Promise<void>;
}

export function CodePanel({ circuit, isActive, running, onRun }: CodePanelProps) {
  const { dispatch } = useCircuit();
  const [code, setCode] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [generatedFingerprint, setGeneratedFingerprint] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [copied, setCopied] = useState(false);
  const generateRef = useRef<() => Promise<void>>(async () => {});

  const fingerprint = circuitFingerprint(circuit);

  async function runGenerate(confirmOverwrite: boolean): Promise<void> {
    if (confirmOverwrite && dirty && code !== null) {
      const confirmed = window.confirm(
        'Replace your unsaved Python draft with code generated from the builder? This cannot be undone.',
      );
      if (!confirmed) return;
    }
    setBusy('generate');
    setError(null);
    setMessage(null);
    try {
      const generated = await generateCode(circuit);
      setCode(generated.code);
      setDirty(false);
      setGeneratedFingerprint(fingerprint);
      setMessage({
        tone: 'info',
        title: 'Generated from the builder',
        body: 'The editor now mirrors the canonical circuit. Edits are not applied until you choose Apply to builder.',
      });
    } catch (caught) {
      setError(toApiError(caught));
    } finally {
      setBusy(null);
    }
  }

  generateRef.current = () => runGenerate(true);

  useEffect(() => {
    if (!isActive) return;
    if (dirty && code !== null) return;
    if (code === null || generatedFingerprint !== fingerprint) {
      void runGenerate(false);
    }
    // Only react to tab activation and builder changes; draft state is checked inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, fingerprint]);

  async function applyCode(): Promise<Circuit | null> {
    if (code === null) return null;
    setBusy('apply');
    setError(null);
    setMessage(null);
    try {
      const parsed = await parseCode(code, circuit.shots);
      dispatch({ type: 'REPLACE_CIRCUIT', circuit: parsed.circuit });
      setDirty(false);
      setGeneratedFingerprint(circuitFingerprint(parsed.circuit));
      setMessage({
        tone: 'success',
        title: 'Code applied to the builder',
        body: 'The circuit state now matches your restricted Python. Previous results were cleared.',
      });
      return parsed.circuit;
    } catch (caught) {
      setError(toApiError(caught));
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function applyAndRun(): Promise<void> {
    if (code === null) return;
    setBusy('run');
    setError(null);
    setMessage(null);
    try {
      const parsed = await parseCode(code, circuit.shots);
      dispatch({ type: 'REPLACE_CIRCUIT', circuit: parsed.circuit });
      setDirty(false);
      setGeneratedFingerprint(circuitFingerprint(parsed.circuit));
      await onRun(parsed.circuit);
    } catch (caught) {
      setError(toApiError(caught));
    } finally {
      setBusy(null);
    }
  }

  async function handleCopyCode(): Promise<void> {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  const disabled = busy !== null || running;
  const builderChanged = code !== null && dirty && generatedFingerprint !== fingerprint;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="card p-4" aria-labelledby="code-editor-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Code2 size={18} className="text-indigo-600" aria-hidden="true" />
            <h2 id="code-editor-title" className="text-sm font-bold text-slate-900">
              Restricted Qiskit-style Python
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {code ? (
              <button
                type="button"
                onClick={handleCopyCode}
                className="btn-ghost px-2 py-1 text-xs"
                title="Copy code to clipboard"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-emerald-600" aria-hidden="true" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={13} aria-hidden="true" /> Copy
                  </>
                )}
              </button>
            ) : null}
            {dirty ? (
              <span className="badge bg-amber-100 text-amber-800">Unsaved draft</span>
            ) : (
              <span className="badge bg-emerald-100 text-emerald-800">In sync</span>
            )}
          </div>
        </div>

        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-600">
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
            <ShieldCheck size={13} aria-hidden="true" /> Safe teaching subset
          </span>{' '}
          Only one import, one <code className="font-mono">QuantumCircuit(n, n)</code> assignment, and{' '}
          <code className="font-mono">qc.x/y/z/h/cx/measure(...)</code> calls with integer literals are accepted.
          The backend parses the AST and never executes arbitrary code.
        </div>

        {builderChanged ? (
          <div className="mb-3">
            <Alert tone="warning" title="The builder has changed">
              Your unsaved Python draft is still here. Apply it to overwrite the builder, or generate fresh code
              from the builder if you want to discard the draft.
            </Alert>
          </div>
        ) : null}

        {code === null ? (
          <div className="flex min-h-[340px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            {busy === 'generate' ? (
              <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                <Spinner label="Generating Python" /> Generating Python from the builder…
              </span>
            ) : (
              <div>
                <FileCode2 size={28} className="mx-auto text-slate-300" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-slate-700">No code generated yet</p>
                <button
                  type="button"
                  className="btn-primary mt-3"
                  onClick={() => void generateRef.current()}
                  disabled={disabled}
                >
                  <Wand2 size={15} aria-hidden="true" /> Generate from builder
                </button>
              </div>
            )}
          </div>
        ) : (
          <PythonCodeEditor
            value={code}
            onChange={(value) => {
              setCode(value);
              setDirty(true);
              setMessage(null);
            }}
            disabled={disabled}
          />
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => void applyAndRun()}
            disabled={disabled || code === null}
          >
            {busy === 'run' || running ? <Spinner label="Running" /> : <Play size={15} aria-hidden="true" />}
            Apply &amp; run circuit
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void applyCode()}
            disabled={disabled || code === null}
          >
            {busy === 'apply' ? <Spinner label="Applying" /> : <RefreshCw size={15} aria-hidden="true" />}
            Apply to builder
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => void generateRef.current()}
            disabled={disabled}
            title="Reset code to current visual circuit"
          >
            <RotateCcw size={14} aria-hidden="true" /> Reset to builder
          </button>
        </div>

        {error ? (
          <div className="mt-3">
            <Alert tone="error" title="Code could not be parsed" onDismiss={() => setError(null)}>
              <p>{error.message}</p>
              <p className="mt-1 font-mono text-[11px] opacity-70">
                {error.code}
                {error.line !== undefined ? ` · line ${error.line}` : ''}
                {error.column !== undefined ? `:${error.column}` : ''}
              </p>
              <p className="mt-1 text-[11px] opacity-80">
                Your draft and the last valid builder circuit have been preserved.
              </p>
            </Alert>
          </div>
        ) : null}

        {message ? (
          <div className="mt-3">
            <Alert tone={message.tone} title={message.title} onDismiss={() => setMessage(null)}>
              {message.body}
            </Alert>
          </div>
        ) : null}
      </section>

      <aside className="space-y-4">
        <section className="card p-4" aria-labelledby="allowed-code-title">
          <h2 id="allowed-code-title" className="text-sm font-bold text-slate-900">
            Allowed program shape
          </h2>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-5 text-slate-100 font-mono">
            <code>{`from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.measure(0, 0)
qc.measure(1, 1)`}</code>
          </pre>
          <ul className="mt-3 space-y-1.5 text-[11px] leading-5 text-slate-600">
            <li>• Shots are a separate playground setting, not in Python code.</li>
            <li>• Variables, arithmetic, loops, and external imports are rejected.</li>
            <li>• AST parse errors report exact line numbers without running code.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4" aria-labelledby="try-unsafe-title">
          <h2 id="try-unsafe-title" className="text-sm font-bold text-amber-950">
            Try the safety check
          </h2>
          <p className="mt-1 text-[11px] leading-5 text-amber-900">
            Add <code className="font-mono">import os</code> or a loop to the editor and apply. The parser rejects
            the program with a line number and the builder keeps its last valid circuit.
          </p>
        </section>
      </aside>
    </div>
  );
}
