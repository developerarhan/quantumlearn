import {
  ArrowRight,
  Atom,
  BarChart3,
  BookOpen,
  Braces,
  CheckCircle2,
  FlaskConical,
  Gauge,
  ShieldCheck,
  Sparkles,
  Waves,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CircuitPreview } from '../components/circuit/CircuitPreview';
import { TryInBuilderButton } from '../components/lessons/TryInBuilderButton';
import type { Circuit } from '../models/circuit';
import { getLesson, lessons } from '../content/lessons';

const superposition = getLesson('superposition');
const entanglement = getLesson('entanglement');
const measurement = getLesson('measurement');

const bitOrderCircuit: Circuit = {
  num_qubits: 2,
  gates: [
    { name: 'x', target: 1 },
    { name: 'measure', target: 0, classical_bit: 0 },
    { name: 'measure', target: 1, classical_bit: 1 },
  ],
  shots: 1024,
};

const experiments = [
  {
    title: 'Superposition in one gate',
    description: 'Apply H, run 1,024 shots, and see why observed counts are not exactly 512/512.',
    lesson: superposition,
    circuit: superposition?.example_circuit,
    icon: Waves,
  },
  {
    title: 'Entangled Bell pair',
    description: 'Create correlated outcomes that appear only as 00 or 11 in an ideal run.',
    lesson: entanglement,
    circuit: entanglement?.example_circuit,
    icon: Sparkles,
  },
  {
    title: 'Read Qiskit bit order',
    description: 'Flip q1 and verify why the count string is 10, with c1 printed on the left.',
    lesson: measurement,
    circuit: bitOrderCircuit,
    icon: Gauge,
  },
];

const modules = [
  {
    icon: BookOpen,
    title: 'Learning hub',
    text: 'Six complete lessons from classical bits to a first oracle algorithm, each with a runnable circuit.',
  },
  {
    icon: FlaskConical,
    title: 'Visual circuit builder',
    text: 'Place X, Y, Z, H, CNOT, and measurement across 1–5 qubits with click or drag interactions.',
  },
  {
    icon: Atom,
    title: 'Real Qiskit Aer',
    text: 'Every run validates strict Circuit JSON and samples a real simulator in an isolated worker process.',
  },
  {
    icon: Braces,
    title: 'Restricted Python',
    text: 'Generate Qiskit-style code, edit it, and apply it back to the builder. Source is parsed, never executed.',
  },
  {
    icon: BarChart3,
    title: 'Results you can read',
    text: 'Counts, observed probabilities, measured-bit labels, and explanations tied to exact circuit patterns.',
  },
  {
    icon: ShieldCheck,
    title: 'Safe by construction',
    text: 'No accounts, no arbitrary Python, no hidden backend state. A small local-first teaching application.',
  },
];

export function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, #e0e7ff 0, transparent 38%), radial-gradient(circle at 85% 10%, #ede9fe 0, transparent 34%)',
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <h1 className="mt-4 text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl">
              Build a circuit.
              <br />
              See quantum physics become <span className="text-indigo-600">data</span>.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              QuantumLearn connects a guided learning hub to a real circuit playground. Place gates, run 128–4,096
              shots on Qiskit Aer, inspect the counts, and translate the same circuit to a safe, restricted
              Qiskit-style Python subset.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/learn" className="btn-primary px-5 py-3">
                Start with the lessons <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link to="/playground" className="btn-secondary px-5 py-3">
                Open the playground
              </Link>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
              {['No login', 'No paid API', 'Real simulator output', 'Restricted Python only'].map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-500" aria-hidden="true" /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="card overflow-hidden p-4 shadow-xl shadow-indigo-100/60">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">Live example</p>
                  <p className="text-sm font-bold text-slate-900">Bell state · H + CNOT + measure</p>
                </div>
                <span className="badge bg-emerald-100 text-emerald-800">1024 shots</span>
              </div>
              {entanglement ? <CircuitPreview circuit={entanglement.example_circuit} label="Bell state example" /> : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Possible ideal outcomes</p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-900">00 · 11</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Bit order</p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-900">c1c0</p>
                </div>
              </div>
              {entanglement ? (
                <div className="mt-3">
                  <TryInBuilderButton circuit={entanglement.example_circuit} label="Run the Bell circuit" className="btn-primary w-full" />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:px-6">
        <section aria-labelledby="experiments-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Guided experiments</p>
              <h2 id="experiments-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                Start from a working circuit
              </h2>
            </div>
            <Link to="/playground" className="link text-sm">
              Build from scratch
            </Link>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {experiments.map(({ title, description, lesson, circuit, icon: Icon }) => (
              <article key={title} className="card flex flex-col p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                </div>
                <p className="mt-2 min-h-10 text-xs leading-5 text-slate-600">{description}</p>
                {lesson && circuit ? (
                  <>
                    <div className="mt-3">
                      <CircuitPreview circuit={circuit} label={title} />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <TryInBuilderButton circuit={circuit} compact label="Load in Builder" />
                      <Link to={`/learn/${lesson.slug}`} className="btn-ghost px-2 py-1.5 text-xs">
                        Read lesson <ArrowRight size={13} aria-hidden="true" />
                      </Link>
                    </div>
                  </>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="modules-title">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">One integrated workflow</p>
            <h2 id="modules-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Five modules, one canonical circuit
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              The builder, code editor, validator, and simulator all speak the same strict Circuit JSON. Gate
              order—not screen position—determines execution.
            </p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="lessons-title" className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div>
              <h2 id="lessons-title" className="text-lg font-bold text-slate-900">
                The learning path
              </h2>
              <p className="text-xs text-slate-500">Six lessons, sequenced from one qubit to a first algorithm.</p>
            </div>
            <Link to="/learn" className="btn-secondary px-3 py-2 text-xs">
              View all lessons
            </Link>
          </div>
          <ol className="divide-y divide-slate-100">
            {lessons.map((lesson) => (
              <li key={lesson.slug}>
                <Link
                  to={`/learn/${lesson.slug}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-indigo-50/50"
                >
                  <span className="w-9 shrink-0 font-mono text-xs font-bold text-indigo-500">{lesson.id}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{lesson.title}</span>
                    <span className="block truncate text-xs text-slate-500">{lesson.summary}</span>
                  </span>
                  <span className="hidden shrink-0 text-xs text-slate-400 sm:block">{lesson.duration_minutes} min</span>
                  <ArrowRight size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
