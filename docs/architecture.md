# Architecture

QuantumLearn is a two-process local application: a React single-page app and a FastAPI service that owns all validation and simulation. The browser is deliberately untrusted and stateless with respect to execution; it can only submit Circuit JSON or restricted source text.

## System context

```text
┌──────────────────────────── Browser (React + TypeScript) ────────────────────────────┐
│                                                                                       │
│  Lessons (JSON) ──► CircuitProvider (Context + useReducer) ◄── Try in Builder        │
│                              │                                                        │
│                    ┌─────────┴──────────┐                                             │
│                    ▼                    ▼                                             │
│            Visual builder         Restricted Python editor                           │
│            (SVG + dnd-kit)        (CodeMirror)                                        │
│                    │                    │                                             │
│                    └─────────┬──────────┘                                             │
│                              ▼                                                        │
│                    Typed API client (fetch)                                           │
└──────────────────────────────┬────────────────────────────────────────────────────────┘
                               │ HTTP JSON, CORS allow-list
┌──────────────────────────────▼────────────────────────────────────────────────────────┐
│ FastAPI                                                                               │
│                                                                                       │
│  Body-size middleware ─► routes ─► Pydantic strict models ─► semantic validator       │
│                                                                                       │
│  Simulation: adapter ─► subprocess (JSON stdin) ─► Qiskit Aer ─► JSON stdout          │
│  Code:       AST parser ─► canonical Circuit        generator ◄─ canonical Circuit    │
│                                                                                       │
│  Error handlers ─► stable {error:{code,message,...}} envelopes                        │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

## Frontend layers

| Path | Responsibility |
| --- | --- |
| `src/content/lessons/` | Six lesson documents plus a typed loader; lesson example circuits use the same canonical `Circuit` type as the builder. |
| `src/state/circuit.tsx` | Single source of truth for the current circuit, run status, results, errors, and staleness. A reducer keeps every mutation explicit. |
| `src/pages/` | Route-level composition: Home, Learn, Lesson, Playground, 404. |
| `src/components/circuit/` | SVG diagram, gate palette, gate sequence, and read-only lesson previews. |
| `src/components/code/` | CodeMirror editor and generate/apply/run workflow. |
| `src/components/results/` | Counts table, probability chart, explanation card, error and stale states. |
| `src/services/api.ts` | The only place that talks to the backend; converts non-2xx responses into a typed `ApiError`. |
| `src/utils/circuit.ts` | Labels, insertion/move guards, fingerprints, shot clamping, and bitstring sorting shared by UI and tests. |

### State flow

`CircuitProvider` owns one `Circuit` and one result envelope. User actions dispatch reducer events such as `INSERT_GATE`, `MOVE_GATE`, `DELETE_GATE`, `REPLACE_CIRCUIT`, `SET_SHOTS`, `RUN_START`, `RUN_SUCCESS`, and `RUN_ERROR`.

Any mutation that changes the circuit invalidates previous results (`resultsStale`). This prevents an old histogram from being presented as the output of a newly edited circuit. A run stores results only on success; on failure the circuit is untouched and a typed error is displayed with retry.

The code panel stays mounted while the Builder tab is active. On activation it generates code when the editor is clean; an unsaved draft is preserved and flagged if the builder changed underneath it. Applying code replaces the canonical circuit only after the backend accepts it.

### Builder interaction

The diagram is an SVG with `foreignObject` buttons for every (step, qubit) cell. This provides:

- click-to-place for every gate,
- droppable targets for @dnd-kit,
- keyboard focus and activation without custom pointer handling.

Drag-and-drop uses `closestCorners` collision detection: the default rectangle intersection did not reliably report a droppable while the drag overlay crossed the SVG `foreignObject` cells. A two-qubit, three-step browser test verifies that each drag lands on the intended wire and step.

CNOT placement is a two-click interaction (control, then a different target in the same step). Explicit earlier/later/delete controls accompany selection, so reordering does not depend on dragging. Removing the last qubit asks for confirmation if gates reference it, then removes those gates to keep the circuit valid.

## Backend layers

| Module | Responsibility |
| --- | --- |
| `app/models/circuit.py` | Strict Pydantic models: discriminated gate union, integer bounds, `extra="forbid"`, `strict=True`. |
| `app/services/validator.py` | Cross-field rules shared by validate, simulate, generate, and parse. |
| `app/services/converter.py` | Canonical JSON → Qiskit `QuantumCircuit`. |
| `app/services/simulator.py` | Adapter protocol, Aer implementation, child-process runner, timeout and consistency checks. |
| `app/workers/simulate_once.py` | Minimal child entry point: read JSON from stdin, run Aer, write counts to stdout. |
| `app/services/code_parser.py` | AST-only allow-list parser with source locations; never compiles or executes. |
| `app/services/code_generator.py` | Canonical JSON → deterministic Qiskit-style source. |
| `app/services/explanations.py` | Maps recognizable circuit patterns to explanation keys. |
| `app/api/routes.py` | HTTP endpoints, concurrency semaphore, response shaping, bit order. |
| `app/main.py` | App construction, CORS, body limit, error envelopes. |

### Request pipeline

1. **Body limit.** An ASGI middleware buffers `/api/v1/*` bodies and returns `422 REQUEST_TOO_LARGE` above 16 KiB. Buffering avoids the body-consumption problem of `BaseHTTPMiddleware`.
2. **Schema validation.** Pydantic rejects unknown keys, wrong types, out-of-range integers, and unsupported gate names. A handler converts the first error into a friendly message and stable `INVALID_REQUEST` code.
3. **Semantic validation.** The shared validator enforces qubit ranges, CNOT distinctness, measurement uniqueness, classical-bit mapping, and “no gates after measurement”. Simulation additionally requires a measurement.
4. **Execution.** The validated model is serialized to JSON and passed over stdin to `python -m app.workers.simulate_once` with `shell=False`, a fixed working directory, and a hard timeout. The child returns only counts; failures are summarized publicly.
5. **Response.** Counts are sorted by integer bitstring, probabilities are counts/shots, and measured bits and bit order are included so the UI can teach rather than hide Qiskit's convention.

### Bit order

Qiskit prints classical bits with the highest index leftmost. The API returns `bitstring_order: "c1c0"` for a two-qubit circuit and zero-fills keys to `num_qubits`. The measurement lesson and the results panel both state this explicitly. The canonical fixture `examples/bit-order.json` verifies that `x(q1)` with both qubits measured yields `"10"`.

## Canonical contract and invariants

The contract is intentionally narrower than Qiskit:

```text
Circuit   = { num_qubits: 1..5, gates: Gate[0..50], shots: 128..4096 }
Gate      = { name: "x"|"y"|"z"|"h", target } 
          | { name: "cx", control, target }
          | { name: "measure", target, classical_bit }
```

- All indices are integers, never booleans or strings.
- `classical_bit == target` in this MVP, keeping the mapping unambiguous.
- Measurement is terminal: once any measurement appears, no quantum gate may follow.
- A qubit is measured at most once.
- At least one measurement is required to simulate.

These invariants are enforced once in `validator.py` and reused by every entry point, so the builder, code parser, and API cannot drift apart.

## Restricted Python security boundary

The parser uses `ast.parse` with `mode="exec"` and walks the tree without compiling or executing it. The accepted program shape is:

```python
from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.measure(0, 0)
qc.measure(1, 1)
```

Allowed: one import of `QuantumCircuit`, one assignment of `QuantumCircuit(<int>, <int>)` to `qc`, and call statements on `qc` with integer literals. Everything else — additional imports, other assignments, loops, comprehensions, expressions, attributes, subscripts, lambdas, nested calls, and names such as `os` — raises a `CodeParseError` with a code and line. `parse_code` never calls `compile`, `exec`, or `eval`, and the simulator never receives source text.

The UI surfaces `CODE_INVALID_IMPORT` and similar codes with the source line while preserving the last valid builder circuit and the draft.

## Failure and resource handling

- **Invalid input:** `422` with a stable code and field/gate/line context.
- **Busy simulator:** a non-blocking semaphore admits at most `MAX_CONCURRENT_SIMULATIONS`; excess requests receive `429 SIMULATOR_BUSY`.
- **Timeout:** the child is killed at `SIMULATION_TIMEOUT_SECONDS`; the API returns `504 SIMULATION_TIMEOUT`.
- **Worker failure:** stderr is logged, not returned; the client sees a generic `500` message.
- **Unexpected errors:** a catch-all handler logs the exception and returns `INTERNAL_ERROR` without internals.
- **Stale UI state:** any circuit edit clears or marks results stale; the results panel never labels old counts as live.

## Testing strategy

- **Backend:** deterministic circuits assert exact counts; probabilistic circuits use broad tolerance. Parser tests include malicious programs and assert no execution side effects. API tests cover size limits, concurrency, timeouts, and recovery after an invalid request.
- **Frontend unit/integration:** reducer transitions, insertion/move guards, lesson integrity, canvas rendering/placement, results math, API error mapping, and a full Playground flow with a mocked fetch.
- **Browser E2E:** real backend and real Aer for the Superposition and Bell journeys, plus code edit/apply/run, unsafe-code rejection, all six lesson circuits loaded into the builder, drag-and-drop and keyboard placement, and a mobile-width builder flow with a changed shot count.

## Extension points for the major project

- Replace `QiskitAerAdapter` behind the existing `SimulatorAdapter` protocol with noise models or hardware backends.
- Add persisted progress or accounts around the existing lesson and circuit identifiers; no canonical model change is needed.
- Add statevector/Bloch visualizations as additional result fields while keeping `counts` stable.
- Add more gates by extending the discriminated union, validator, converter, generator, parser allow-list, palette, and diagram together.
- Ground future AI explanations in validated circuit JSON and simulator output, never in free-form user text.
