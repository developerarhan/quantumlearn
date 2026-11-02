import { Check, Copy, Download, FileCode, FileJson, Table, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Circuit, SimulationResult } from '../../models/circuit';
import { exportQasm, generateCode } from '../../services/api';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  circuit: Circuit;
  results: SimulationResult | null;
}

type ExportTab = 'python' | 'qasm' | 'json' | 'csv';

export function ExportModal({ isOpen, onClose, circuit, results }: ExportModalProps) {
  const [tab, setTab] = useState<ExportTab>('python');
  const [pythonCode, setPythonCode] = useState<string>('');
  const [qasmCode, setQasmCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.allSettled([generateCode(circuit), exportQasm(circuit)])
      .then(([pyRes, qasmRes]) => {
        if (pyRes.status === 'fulfilled') setPythonCode(pyRes.value.code);
        if (qasmRes.status === 'fulfilled') setQasmCode(qasmRes.value.qasm);
      })
      .finally(() => setLoading(false));
  }, [isOpen, circuit]);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(circuit, null, 2);

  const csvString = results
    ? `Bitstring,Counts,Probability\n` +
      Object.entries(results.counts)
        .map(([k, count]) => `"${k}",${count},${results.probabilities[k] ?? 0}`)
        .join('\n')
    : '';

  function getCurrentContent(): { content: string; filename: string; mime: string } {
    switch (tab) {
      case 'python':
        return { content: pythonCode, filename: 'circuit.py', mime: 'text/x-python' };
      case 'qasm':
        return { content: qasmCode, filename: 'circuit.qasm', mime: 'text/plain' };
      case 'json':
        return { content: jsonString, filename: 'circuit.json', mime: 'application/json' };
      case 'csv':
        return { content: csvString, filename: 'results.csv', mime: 'text/csv' };
    }
  }

  const { content, filename, mime } = getCurrentContent();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  function handleDownload() {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    >
      <div className="card w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-indigo-600" aria-hidden="true" />
            <h2 id="export-modal-title" className="text-base font-bold text-slate-900">
              Export Circuit & Simulation
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close export dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2">
          <button
            type="button"
            onClick={() => setTab('python')}
            className={[
              'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors',
              tab === 'python'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900',
            ].join(' ')}
          >
            <FileCode size={14} aria-hidden="true" /> Qiskit (.py)
          </button>
          <button
            type="button"
            onClick={() => setTab('qasm')}
            className={[
              'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors',
              tab === 'qasm'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900',
            ].join(' ')}
          >
            <FileCode size={14} aria-hidden="true" /> OpenQASM (.qasm)
          </button>
          <button
            type="button"
            onClick={() => setTab('json')}
            className={[
              'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors',
              tab === 'json'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900',
            ].join(' ')}
          >
            <FileJson size={14} aria-hidden="true" /> JSON (.json)
          </button>
          <button
            type="button"
            onClick={() => setTab('csv')}
            disabled={!results}
            className={[
              'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
              tab === 'csv'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900',
            ].join(' ')}
          >
            <Table size={14} aria-hidden="true" /> Results (CSV)
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-xs text-slate-500">
              Generating export...
            </div>
          ) : (
            <pre className="h-56 overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-3 font-mono text-xs text-slate-200">
              {content || '(No content available)'}
            </pre>
          )}

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {filename} • {Math.round(content.length)} bytes
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!content}
                className="btn-secondary px-3 py-1.5 text-xs font-semibold"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-emerald-600" aria-hidden="true" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} aria-hidden="true" /> Copy to Clipboard
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!content}
                className="btn-primary px-3 py-1.5 text-xs font-semibold"
              >
                <Download size={14} aria-hidden="true" /> Download File
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
