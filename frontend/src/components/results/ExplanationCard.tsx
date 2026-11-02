import { Lightbulb } from 'lucide-react';
import type { SimulationResult } from '../../models/circuit';

interface Explanation {
  title: string;
  body: string;
}

const KNOWN: Record<string, Explanation> = {
  initial_zero: {
    title: 'Measuring |0⟩',
    body:
      'The qubit starts in |0⟩. In an ideal simulation, computational-basis measurement returns 0 every time, so every shot reads 0. An unmeasured classical bit would also remain 0, but it is not evidence of a quantum outcome.',
  },
  x_flip: {
    title: 'X flips the computational state',
    body:
      'The X gate maps |0⟩ to |1⟩. Measuring afterwards returns 1 for every shot in an ideal simulator, so the counts contain only 1s.',
  },
  z_no_change: {
    title: 'Z changes phase, not this measurement',
    body:
      'Z maps |0⟩ to |0⟩ and |1⟩ to −|1⟩. A phase is invisible to a single computational-basis measurement, so Z on |0⟩ still gives 0 every time. Phase becomes observable when it interferes with other operations, for example after a Hadamard.',
  },
  superposition: {
    title: 'H creates an equal-amplitude superposition',
    body:
      'H|0⟩ = (|0⟩ + |1⟩)/√2. The state has equal-magnitude amplitudes, but each individual shot returns one classical bit. Over many shots the observed proportions approach 50/50; a particular run will usually not be exactly 512 and 512. The table shows observed frequencies, not a guarantee for every run.',
  },
  hh_identity: {
    title: 'Two Hadamards cancel',
    body:
      'H is its own inverse, so H followed by H returns the qubit to |0⟩. Measurement therefore gives 0 every time. This is a useful reminder that quantum gates are reversible transformations, not irreversible randomizers.',
  },
  bell_state: {
    title: 'A Bell state produces correlated outcomes',
    body:
      'The circuit prepares (|00⟩ + |11⟩)/√2. Ideal measurement outcomes are only 00 and 11, in roughly equal proportions, never 01 or 10. The correlation appears in the joint classical record; it does not let either qubit signal faster than light on its own.',
  },
  bv_s1: {
    title: 'One-bit Bernstein–Vazirani with s = 1',
    body:
      'The ancilla q1 is prepared in |−⟩ and the oracle is a CNOT controlled by q0. Phase kickback writes the secret bit onto q0, and the final H turns it into a definite computational-basis result: q0 measures 1. Qiskit prints c1 on the left, and c1 was never measured, so the bitstring is "01". The leading 0 is the untouched classical bit c1, not an observed ancilla outcome.',
  },
};

const GENERIC: Explanation = {
  title: 'Sampled measurement outcomes',
  body:
    'Each shot prepares the circuit, applies the gates, and records one classical bitstring. The counts are samples from the circuit’s measurement distribution, not a proof of exact probabilities. More shots usually reduce sampling noise, but a single run can deviate from the ideal distribution.',
};

export function ExplanationCard({ result }: { result: SimulationResult }) {
  const explanation = (result.explanation_key && KNOWN[result.explanation_key]) || GENERIC;
  return (
    <section className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4" aria-labelledby="explanation-title">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Lightbulb size={17} aria-hidden="true" />
        </span>
        <div>
          <h3 id="explanation-title" className="text-sm font-bold text-indigo-950">
            {explanation.title}
          </h3>
          <p className="mt-1 text-[13px] leading-6 text-indigo-950/80">{explanation.body}</p>
        </div>
      </div>
    </section>
  );
}
