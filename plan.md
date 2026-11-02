# QuantumLearn — Coding Agent Implementation Plan

> **Instruction to coding agent:** Treat this file as the authoritative, executable build specification for the **minor-project MVP**. **Implement the application**, not just a prototype, design mockup, or rewritten plan. Work through the phases in order, run the specified tests, and update the checkboxes in this file as verified tasks are completed.
>
> **Project:** QuantumLearn — Interactive Quantum Computing Learning Platform  
> **Target:** 7th-semester minor project with an extensible foundation for a major project  
> **Deliverable:** Running React + FastAPI application with Qiskit Aer simulation, lessons, circuit editor, restricted Python editor, and visualized results  
> **Default mode:** Local-first; no external credentials, paid APIs, authentication, or database required

---

## 0. AGENT OPERATING INSTRUCTIONS — READ FIRST

### Your job

1. Inspect the repository before writing files. If the project is empty, scaffold it using the structure below. If code already exists, **preserve working code** and integrate with it; do not delete or overwrite unrelated files.
2. Build the **P0 MVP** defined here from end to end. Do not stop after generating a landing page or a single API endpoint.
3. Work **phase by phase**. Each phase includes specific tasks and an exit gate. Complete its tests before moving to the next phase.
4. Make reasonable implementation decisions without repeatedly asking for approval. Prioritize correctness, maintainability, accessibility, security, and a working demo. Ask only if essential information is missing or an action would be destructive.
5. Prefer a simple, reliable implementation over a sophisticated but unfinished one. For example, build a functional click-to-place circuit grid first, then add drag-and-drop on top of the same state model.
6. Use **one canonical Circuit JSON contract** across the frontend, code editor, and backend. Never treat rendered DOM positions or arbitrary user Python as the source of truth.
7. Never run user-provided Python using `exec`, `eval`, `subprocess` with user code, notebook kernels, or a general Python interpreter. Only **parse a strict subset of Python into Circuit JSON**, validate it, and execute the resulting **Qiskit circuit assembled by trusted backend code**.
8. Add actual working lesson content, not `TODO` text, lorem ipsum, or placeholder cards. All required buttons and pages must function.
9. Run available lint, typecheck, unit, API, build, and end-to-end checks. Fix failures rather than hiding them. If a check cannot run, clearly record the reason.
10. Keep `README.md` accurate. At the end, report completed phases, commands executed, passing tests, known limitations, and how to run/demo the project. Do not claim success for unrun tests.
11. When editing this plan, change `[ ]` to `[x]` **only after verifying the associated acceptance criterion**. Do not mark a phase complete simply because files exist.
12. Do not add user accounts, AI features, cloud quantum backends, payments, microservices, or a database to the minor project.

### Required end state

A learner must be able to:

**Open the Superposition lesson → launch its sample circuit → modify it visually → run 1,024 shots on Qiskit Aer → see outcome counts and observed probabilities → view/edit the equivalent restricted Qiskit-style Python → apply that code back to the builder → rerun and understand the result.**

Also demonstrate an entangled Bell-state experiment and a rejected unsafe Python snippet.

### Definition of project completion

The project is **NOT finished** until all P0 checklist items in Section 12 pass and the full journey above works on a clean local setup. No static mock result may be substituted for actual Qiskit Aer output.

---

## 1. PRODUCT REQUIREMENTS AND SCOPE

Build five integrated modules:

| Module | Required MVP output | Priority |
|---|---|---|
| 1. Quantum Learning Hub | Six usable lessons with theory, a quantum circuit example, explanation, and a Try in Builder action | P0 |
| 2. Circuit Builder | 1–5 qubits, X/Y/Z/H/CNOT/measurement gates, gate add/move/remove, reset, drag-and-drop and click-to-place | P0 |
| 3. Simulator | Real Qiskit Aer simulation with validated input, 128–4,096 shots, counts, probability calculations, safe errors | P0 |
| 4. Python Code Editor | Syntax-highlighted restricted Qiskit-style code; AST-only parsing; generate code; apply code to builder | P0 |
| 5. Visualization | Live circuit diagram, counts table, probability bar chart, bit-order labels, contextual explanation | P0 |

### Do not build yet (major-project backlog)

- AI tutor, chat, generative explanations, or LLM integration.
- Real quantum hardware, cloud provider integration, or paid compute.
- Full Python execution, notebooks, arbitrary imports or user-defined functions.
- User accounts, classrooms, instructor dashboard, payments, backend data persistence.
- Advanced Bloch sphere animation, noise models, quantum error correction.
- Real-time collaboration and complicated multi-framework support.

**Optional only after every P0 gate passes:** localStorage save/load, undo/redo, result CSV export, lightweight statevector visualization, extra algorithm lessons.

---

## 2. FIXED TECHNICAL DECISIONS

Use this stack unless an existing repository already contains a viable equivalent. Document any unavoidable substitution in `docs/decisions.md`.

| Layer | Use | Notes |
|---|---|---|
| Frontend | React, TypeScript, Vite | Single-page app, strict TypeScript mode |
| Styling | Tailwind CSS | Consistent modern responsive styles; avoid unnecessary UI frameworks |
| Routing | React Router | `/`, `/learn`, `/learn/:slug`, `/playground` |
| Drag/drop | `@dnd-kit/core` | Provide a click-to-place fallback for mobile and keyboard users |
| Code editor | CodeMirror 6 with Python language mode | Syntax highlighting; code is parsed on backend, **never executed** |
| Charts | Recharts | Measurement counts / probabilities |
| Circuit rendering | SVG + React | Draw wires and gates from structured state; no server image generation |
| State | React Context + `useReducer` | One canonical circuit state; avoid unnecessary Redux/Zustand |
| Backend | Python 3.11+ with FastAPI | Pydantic v2 request validation |
| Quantum simulator | `qiskit`, `qiskit-aer` | `from qiskit_aer import AerSimulator` |
| Backend tests | Pytest + FastAPI TestClient | Validation, code parser, simulation, API |
| Frontend tests | Vitest + React Testing Library | State editing, rendering, errors, routing |
| E2E | Playwright | At least one full journey in a real browser |
| Storage | Versioned static lesson JSON | No DB or login in MVP |

**Dependency policy:** Check installed and available versions, select mutually compatible stable releases, then lock them (`package-lock.json` and pinned backend requirements/constraints). Do not blindly paste obsolete Qiskit imports from old tutorials. Use `AerSimulator`, transpile for the selected simulator as needed, call `run(..., shots=N)`, and extract `get_counts()`.

### Visual design constraints

- Professional educational dashboard rather than a generic marketing landing page.
- Clear page hierarchy, readable typography, good contrast, and accessible focus states.
- Navigation: Home, Learn, Playground; in Playground use **Circuit Builder** and **Python Code** tabs, with Results displayed adjacent/below.
- Desktop: gate palette left, circuit canvas center, run/settings and results right or below.
- Mobile: stack panels, scroll wide circuit diagrams horizontally, retain click-to-place.
- Show loading, empty, success, and error states. No nonfunctional controls.
- Use recognizable labels and short explanations; scientific accuracy matters more than visual effects.

---

## 3. REPOSITORY AND FILE STRUCTURE

Create this structure (adjust only where an existing repo requires it):

```text
quantumlearn/
├── plan.md
├── README.md
├── .gitignore
├── docs/
│   ├── architecture.md
│   ├── decisions.md
│   └── demo-script.md
├── examples/
│   ├── superposition.json
│   ├── bell-state.json
│   └── bit-order.json
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── .env.example
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── LearnPage.tsx
│   │   │   ├── LessonPage.tsx
│   │   │   └── PlaygroundPage.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── circuit/           # GatePalette, CircuitCanvas, GateSlot, controls
│   │   │   ├── code/              # PythonCodeEditor and code actions
│   │   │   ├── results/           # CountsTable, ProbabilityChart, Summary
│   │   │   └── lessons/           # Lesson blocks and TryInBuilder button
│   │   ├── content/lessons/       # At least 6 complete lesson JSON files
│   │   ├── models/circuit.ts     # Shared contract types
│   │   ├── state/circuit.tsx      # Reducer + provider + actions
│   │   ├── services/api.ts       # Typed fetch wrapper and errors
│   │   ├── utils/circuit.ts      # Pure model helpers
│   │   └── tests/
│   └── e2e/
└── backend/
    ├── requirements.txt
    ├── .env.example
    ├── app/
    │   ├── __init__.py
    │   ├── main.py
    │   ├── api/routes.py
    │   ├── models/circuit.py
    │   ├── services/validator.py
    │   ├── services/converter.py
    │   ├── services/code_parser.py
    │   ├── services/code_generator.py
    │   ├── services/explanations.py
    │   ├── services/simulator.py
    │   └── workers/simulate_once.py
    └── tests/
```

**Important:** This is a logical layout, not permission to create empty modules. Only add a file when implementing its actual functionality.

---

## 4. CANONICAL CIRCUIT JSON — STRICT CONTRACT

Every editor and API must use the exact same representation. Use snake_case in JSON and preserve gate-array order.

### 4.1 Valid example: Bell state

```json
{
  "num_qubits": 2,
  "gates": [
    { "name": "h", "target": 0 },
    { "name": "cx", "control": 0, "target": 1 },
    { "name": "measure", "target": 0, "classical_bit": 0 },
    { "name": "measure", "target": 1, "classical_bit": 1 }
  ],
  "shots": 1024
}
```

### 4.2 Hard validation rules

- Top-level keys: **exactly** `num_qubits`, `gates`, `shots` (default `shots=1024` is allowed when omitted from incoming input; normalized output always includes it).
- `num_qubits`: strict integer from **1 to 5**; never coerce booleans or strings to integers.
- `gates`: ordered array containing **0–50** instructions; all fields are strict, unknown fields rejected.
- Allowed names: `x`, `y`, `z`, `h`, `cx`, `measure` (case-sensitive canonical names).
- `x`, `y`, `z`, `h`: exactly `name` and `target`.
- `cx`: exactly `name`, `control`, and `target` with `control != target`.
- `measure`: exactly `name`, `target`, and `classical_bit`; **classical_bit must equal target** for MVP.
- Every qubit/classical-bit index is an integer in `[0, num_qubits - 1]`.
- A given qubit may be measured **at most once**.
- Once the first measurement occurs, **only further measurement instructions are allowed**. No quantum gate after any measurement; defer mid-circuit measurements to major project.
- `shots`: strict integer in **128–4096**, default **1024**.
- Builder may contain an empty gate list. **Simulation** must reject any circuit without at least one measurement, with an actionable error.
- Request size limit: **16 KiB** for circuit endpoints; code text limit **8 KiB**.
- Gate order determines execution, **not** screen coordinates.

### 4.3 Required Pydantic and TypeScript behavior

- Implement a discriminated union (or equivalent strict validation) for gate variants.
- Reject unknown keys using forbidden extras.
- Validate cross-field rules in one reusable validator for both validate and simulate endpoints.
- Define matching TypeScript interfaces/unions; frontend validation helps UX, but backend remains authoritative.
- Provide pure helper functions for adding/removing/reordering a gate and changing qubit count safely.
- Removing the final qubit must require confirmation if its index is used by a gate. Do not silently remap gates.
- When the circuit changes, **invalidate previous simulation results** immediately.

### 4.4 Bit order (must be taught and tested)

Qiskit displays the highest-index classical bit on the **left**. For two qubits, bitstrings are `c1 c0`.

- `X(q1)` followed by measurements of both qubits must yield `"10"` (not `"01"`).
- `H(q0) → CX(q0,q1) → measure both` ideally produces only `"00"` and `"11"`.
- With classical bits `0 .. n-1` allocated for all qubits, an unmeasured classical bit remains `0`. Label which qubits were measured so this is not misleading.
- Keep **observed** probabilities (`count / shots`) separate from any **theoretical** statements; do not falsely guarantee precisely 50/50 counts.

### 4.5 Canonical sample fixtures

Create real files in `examples/`:

**`superposition.json`**

```json
{
  "num_qubits": 1,
  "gates": [
    { "name": "h", "target": 0 },
    { "name": "measure", "target": 0, "classical_bit": 0 }
  ],
  "shots": 1024
}
```

**`bell-state.json`:** use the Bell-state example above.  
**`bit-order.json`:** two qubits, `x(target=1)`, measurements on both, expected `"10"`.

---

## 5. BACKEND API CONTRACT

Base URL: `http://localhost:8000/api/v1` in development. Generate OpenAPI docs automatically through FastAPI.

| Method | Route | Request | Success response |
|---|---|---|---|
| GET | `/health` | none | `{"status":"ok","simulator":"qiskit-aer"}` |
| POST | `/circuits/validate` | Circuit JSON | `{"valid":true,"circuit": <normalized circuit>}` |
| POST | `/circuits/simulate` | Circuit JSON | SimulationResult below |
| POST | `/code/parse` | `{"code":"...","shots":1024}` | `{"circuit": <normalized circuit>}` |
| POST | `/code/generate` | Circuit JSON | `{"code":"..."}` |

All invalid user input: HTTP **422** with consistent error JSON. Rate/concurrency limit: **429**. Unexpected failure: **500** without raw stack traces. Simulation timeout: **504** or a documented, consistent service-timeout response.

### 5.1 Successful simulation response

```json
{
  "counts": { "0": 501, "1": 523 },
  "probabilities": { "0": 0.489258, "1": 0.510742 },
  "shots": 1024,
  "measured_bits": [0],
  "bitstring_order": "c0",
  "simulator": "qiskit-aer",
  "explanation_key": "superposition"
}
```

This response shows **illustrative** counts; actual simulation results vary. Sum of `counts` must equal `shots`, and each probability must be computed from returned counts (round for presentation, not for internal comparisons). The `explanation_key` is optional/null for unrecognized circuits; do not invent claims about arbitrary circuits.

### 5.2 Standard invalid-input response

```json
{
  "error": {
    "code": "INVALID_CNOT_TARGET",
    "message": "Control and target must be different qubits.",
    "gate_index": 1
  }
}
```

For code parsing errors, include `line` and `column` when known. Never reveal server tracebacks, local file paths, or submitted code in the public error response.

### 5.3 Exact simulator implementation rules

1. Validate circuit using strict Pydantic models and the shared circuit rules.
2. Create `QuantumCircuit(num_qubits, num_qubits)`.
3. Iterate through gates in exact array order and apply:
   - `x`: `qc.x(target)`
   - `y`: `qc.y(target)`
   - `z`: `qc.z(target)`
   - `h`: `qc.h(target)`
   - `cx`: `qc.cx(control, target)`
   - `measure`: `qc.measure(target, classical_bit)`
4. Use `AerSimulator` for ideal shot-based simulation. Transpile to the simulator as required by installed Qiskit APIs.
5. Execute with requested shots; use real `result.get_counts(...)` output.
6. Normalize count keys and return the structured response. Do not output placeholder count values.
7. Keep actual Aer calls behind a `SimulatorAdapter` interface with a concrete `QiskitAerAdapter` implementation, to allow future simulators.
8. Derive only scientifically safe explanation keys from **known, exact patterns** (e.g. initial zero, X, H, H+H, Bell). Unknown circuits get a generic explanation of sampling without claiming an exact state.
9. Before release, bound concurrent simulations (e.g. 2 workers), and run the **validated circuit JSON** in a controlled child process with a hard timeout to prevent a hung simulation from blocking the API. It must receive JSON, never user Python source. Use container OS limits for CPU/memory on public hosting.

### 5.4 CORS, configuration, and operational limits

- Environment settings: `FRONTEND_ORIGIN`, `SIMULATION_TIMEOUT_SECONDS`, `MAX_CONCURRENT_SIMULATIONS`, `LOG_LEVEL`.
- Development frontend origin typically `http://localhost:5173`; production CORS must be explicitly configured, never wildcard with credentials.
- No API tokens or secrets in frontend. No telemetry requiring signup.
- Structured logs for errors and execution durations; do not log raw submitted code by default.
- A friendly failed request must **not** erase the learner's circuit.

---

## 6. RESTRICTED PYTHON EDITOR — SECURITY-CRITICAL

The editor teaches a Qiskit-shaped **subset** of Python. It is **not** a Python runtime.

### 6.1 Allowed program example

```python
from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.measure(0, 0)
qc.measure(1, 1)
```

### 6.2 Exact allowed grammar

- Optional single import: exactly `from qiskit import QuantumCircuit`.
- Exactly one top-level assignment of literal constructor form `qc = QuantumCircuit(N, N)`; require **two identical literal integer arguments**, each from 1 to 5.
- Only top-level expression statements of the form `qc.x(INT)`, `qc.y(INT)`, `qc.z(INT)`, `qc.h(INT)`, `qc.cx(INT, INT)`, `qc.measure(INT, INT)`.
- Arguments must be plain non-negative integer literals (no names, booleans, arithmetic, keyword arguments, starred args, slices, or calls).
- There may be blank lines or comments.
- Source max **8 KiB**, AST max **800 nodes**, generated gate count max **50**.
- Any other statement or AST shape must be rejected: imports (except the one permitted), assignments, reassignment, attributes/chained calls, functions, loops, classes, conditions, comprehensions, `open`, `os`, `sys`, `exec`, `eval`, and `__import__`.
- Analyze via Python's `ast.parse()` with explicit allowlists and verify the **entire** AST; never run, evaluate, import, or compile submitted source.
- Return precise parsing error location when possible.
- After parsing, pass output through the **same circuit validator** as graphical input.
- `shots` is **not embedded in Qiskit program source**: it is a separate UI setting submitted with parse requests, preserved during code-view round trips.

### 6.3 Shared model sync semantics

- On opening Code tab, generate Python from the current canonical circuit if no unapplied code draft exists.
- Editing source marks it as **dirty**; preserve text while switching tabs.
- **Apply Code to Builder** calls `/code/parse`; on success replace canonical circuit, clear dirty flag, and invalidate old results.
- On parse failure, **preserve** both unsaved source text and the last valid builder circuit; display error with source line.
- If the builder has changed and returning to Code would overwrite a dirty draft, ask before overwriting it. No silent loss of edits.
- `/code/generate` returns deterministic Python and `/code/parse` of generated code must reproduce the same circuit and shots (shots passed separately).
- Provide **Run Circuit** from Code view by applying/validating the code first, then using the same `/circuits/simulate` endpoint; do not introduce a raw-code execution endpoint.

### 6.4 Mandatory negative tests

The parser must reject all of these without running them:

```python
import os
os.system('echo unsafe')
```

```python
qc = QuantumCircuit(1, 1)
for i in range(10):
    qc.h(0)
```

```python
qc = QuantumCircuit(1, 1)
qc.h(__import__('os').getpid())
```

```python
qc = QuantumCircuit(1, 1)
exec('print(1)')
```

Also reject `qc.h(0 + 0)`, `qc.h(True)`, extra constructor parameters, unsupported methods, and assignments to any other variable.

---

## 7. FRONTEND FUNCTIONAL SPECIFICATION

### 7.1 Pages

| Route | What the agent must implement |
|---|---|
| `/` | Short product overview; entry buttons to Learn and Playground; featured lessons and experiments |
| `/learn` | Grid/list of six lessons, topic summaries, learning sequence |
| `/learn/:slug` | Full lesson, objectives, theory, worked example, diagram, simple check question(s), **Try in Builder** |
| `/playground` | Circuit builder and Python editor tabs, live diagram, shots input, Run/Reset, charts/results |
| Unknown path | Friendly 404 with working navigation |

### 7.2 Circuit builder UX

Build the builder around **ordered instruction steps**. Each step occupies a grid column; each qubit occupies a row. This avoids ambiguous gate order and overlapping operations. Treat a CNOT as **one** step spanning its control and target rows.

Required capabilities:

- Initialize `num_qubits=1`, `gates=[]`, `shots=1024` on a blank Playground visit.
- Add qubits up to 5; remove from the end only, with confirmation if the qubit is referenced.
- Click or drag a gate from palette to an appropriate wire/step; insert at the chosen step in the gate sequence.
- Support X, Y, Z, H, CNOT, and Measurement.
- CNOT placement: user selects a control wire and a different target wire; show linked control dot + target symbol. Invalid connections are blocked with an explanation.
- Move/reorder a gate via drag or explicit move-left/move-right controls.
- Delete an individual gate, clear circuit (with confirmation), change shots via bounded numeric input.
- Once measurement has begun, disable insertion of later non-measurement gates or show a rule warning. The backend makes the final decision.
- Diagram updates immediately from canonical state; do not depend on running the backend to redraw.
- `Validate` (optional separate button) and `Run Circuit` call real API routes; show loading, success, and errors.
- While running, disable duplicate submits. On any circuit edit, remove or visibly mark previous results as stale.
- Add accessible labels, keyboard-operable buttons, and click fallback where drag-and-drop is difficult.

**Reducer actions** (use equivalent explicit actions if names differ): `ADD_QUBIT`, `REMOVE_LAST_QUBIT`, `INSERT_GATE`, `MOVE_GATE`, `DELETE_GATE`, `CLEAR_GATES`, `SET_SHOTS`, `REPLACE_CIRCUIT`, `RUN_START`, `RUN_SUCCESS`, `RUN_ERROR`.

### 7.3 Results and explanation

- Show counts as a table: `Bitstring | Count | Observed probability`.
- Show Recharts probability bar chart (0–100%) with clearly labeled axes and consistent bitstring ordering.
- Show simulator name, shots, measured bits, and how bitstrings are ordered.
- Include accessible readable chart summaries (chart is not the only way to see results).
- Known patterns get short accurate explanations:
  - `Measure |0⟩`: all `0` in ideal simulation.
  - `X → measure`: all `1`.
  - `H → measure`: approximately half `0`, half `1` over many shots.
  - `H → H → measure`: all `0`.
  - `H(q0) → CX(q0,q1) → measure both`: only `00` and `11` ideally.
  - `Z` on `|0⟩`: does not change its computational-basis measurement outcome, although phase gates can affect interference.
- Unknown circuits: explain that measurement results represent sampled outcomes, not guaranteed exact probabilities. Avoid pretending to infer arbitrary state semantics.
- When a run fails, show the error in a visible message without resetting the circuit or code.

### 7.4 State navigation from lessons

Each lesson contains a complete validated `example_circuit` object. The **Try in Builder** action loads it into canonical circuit state and navigates to `/playground`. If an existing circuit will be overwritten, ask for confirmation. Do not merely link to an empty playground.

---

## 8. LEARNING CONTENT — WRITE COMPLETE LESSONS

Store static, type-checked lesson JSON files in `frontend/src/content/lessons/`. Define a schema with fields like `slug`, `title`, `duration_minutes`, `objectives`, `prerequisites`, `sections`, `example_circuit`, `expected_behavior`, and `check_questions` (with answers and explanations). A short structured-renderer is fine; avoid raw untrusted HTML.

Required lessons:

| ID / slug | Subject | Required explanation and working circuit |
|---|---|---|
| `L01` / `bits-vs-qubits` | Classical bits vs. quantum bits | Deterministic 0/1 versus normalized quantum state; measure initial `|0⟩`, then try X |
| `L02` / `superposition` | Superposition and amplitudes | `|+⟩ = (|0⟩ + |1⟩)/√2`; `H(q0) → measure(q0)` |
| `L03` / `quantum-gates` | X, Y, Z, H, CNOT | Meaning of each supported gate, phase-vs-measurement distinction, two H gates as a reversible example |
| `L04` / `measurement` | Quantum measurement and shots | Difference between quantum state and classical result; compare measured `|0⟩`, `|1⟩`, and `|+⟩` |
| `L05` / `entanglement` | Entanglement and Bell states | `H(q0) → CX(q0,q1) → measure both`; correlation `00` or `11` |
| `L06` / `basic-algorithms` | Intro to quantum algorithms | Explain oracle queries and interference through the **1-bit Bernstein–Vazirani algorithm** with hidden bit `s=1`. Use the exact circuit specified immediately below and explain its output; do not promise a fully general algorithm engine. |

**L06 required runnable circuit (Bernstein–Vazirani, one secret bit):**

```json
{
  "num_qubits": 2,
  "gates": [
    { "name": "x", "target": 1 },
    { "name": "h", "target": 0 },
    { "name": "h", "target": 1 },
    { "name": "cx", "control": 0, "target": 1 },
    { "name": "h", "target": 0 },
    { "name": "measure", "target": 0, "classical_bit": 0 }
  ],
  "shots": 1024
}
```

This implements the `s=1` oracle by CNOT, with the ancilla prepared as `|−⟩`. The query qubit `q0` measures `1` in ideal simulation, giving count string `"01"`: `c1` (leftmost) was **not measured** and remains initialized to `0`. Explain this explicitly; do not present the `0` for `c1` as an observed ancilla measurement.

Each lesson must have:

1. A beginner-friendly explanation that is **scientifically accurate**.
2. At least one equation, conceptual comparison, or worked example, where appropriate.
3. A circuit diagram generated from the same model as the playground.
4. A **Try in Builder** action that opens a functioning sample.
5. An expected result explanation and at least one knowledge-check question with the correct answer.

Avoid claiming: “superposition means a measured qubit is simultaneously 0 and 1,” “quantum computing is always faster,” or “H has exactly 512/512 observed counts.” Distinguish pre-measurement amplitudes from observed samples.

---

## 9. EXECUTION PHASES — IMPLEMENT IN THIS ORDER

> **Agent rule:** Every phase has an **exit gate**. Run the relevant commands/tests, fix failures, and update this checklist only when verified. If something is blocked by the environment, continue other unblocked tasks and record the blocker accurately.

### Phase 0 — Repository inspection and scaffold

- [x] Inspect existing files and current environment; preserve useful existing code.
- [x] Create frontend Vite + React + TypeScript application with routing and Tailwind styles.
- [x] Create backend FastAPI project with dependencies and test setup.
- [x] Add `.env.example` files, `.gitignore`, initial `README.md`, and `docs/decisions.md`.
- [x] Confirm frontend dev server, backend server, and `/api/v1/health` start locally.

**Exit gate:** `npm run dev`, `npm run build`, and FastAPI startup succeed; GET `/api/v1/health` returns `200`.

### Phase 1 — Shared circuit schema, validation, simulator

- [x] Implement strict Pydantic circuit/gate schemas and reusable validation.
- [x] Implement matching TypeScript types and pure circuit helpers.
- [x] Implement `QuantumCircuit` converter and Qiskit Aer simulator adapter.
- [x] Implement `/circuits/validate` and `/circuits/simulate` with documented errors.
- [x] Create `superposition.json`, `bell-state.json`, and `bit-order.json` fixtures.
- [x] Add Python tests for deterministic results, Bell state, statistical superposition, and invalid circuits.

**Exit gate:** Real API simulation produces valid counts, `sum(counts.values()) == shots`, and bit-order test yields `"10"`.

### Phase 2 — Functional circuit editor

- [x] Build global/reducer circuit state and Playground page.
- [x] Render an SVG circuit from canonical Circuit JSON.
- [x] Implement wire count, add/remove gates, measurement, CNOT control-target selection, reset, gate ordering, and shot input.
- [x] Implement click-to-place interaction and dnd-kit drag-and-drop.
- [x] Add live API integration; provide loading/errors and stale-result clearing.
- [x] Test builder model changes, gate ordering, CNOT validation, and reset.

**Exit gate:** A user can build, run, and modify both `H→measure` and the Bell-state circuit entirely from the browser.

### Phase 3 — Visualization

- [x] Add counts table and observed-probability bar chart.
- [x] Add correct measured-bit and bitstring-order labeling.
- [x] Add accurate predefined explanations and generic fallback.
- [x] Add responsive layout and readable error/empty states.
- [x] Verify that editing the circuit clears stale charts.

**Exit gate:** Real simulation results are intelligible for superposition, Bell state, and deterministic X cases.

### Phase 4 — Restricted Python code editor

- [x] Implement strict AST parser and `/code/parse`; **no execution of submitted code**.
- [x] Implement deterministic `/code/generate` and round-trip tests.
- [x] Integrate CodeMirror Python editor and Apply/Generate/Run flows.
- [x] Handle dirty drafts and prevent accidental overwrite of unsaved code.
- [x] Add malicious-code rejection tests and source-line errors.
- [x] Enforce concurrency and subprocess timeout rules on the simulation boundary.

**Exit gate:** Builder ↔ restricted Python round-trip works; unsafe code is rejected without execution; simulator has bounded resource handling.

### Phase 5 — Complete learning hub

- [x] Write and render the six full lessons from Section 8.
- [x] Add Learn index, lesson routes, chapter navigation, and knowledge checks.
- [x] Load lesson sample circuit into Playground through Try in Builder.
- [x] Add Home page that links to real lesson and playground routes.
- [x] Verify all lesson circuits run successfully.

**Exit gate:** Each lesson has theory, example, correct explanation, knowledge check, and a working Try in Builder action.

### Phase 6 — Integration, accessibility, tests, and delivery

- [x] Run backend suite, frontend suite, TypeScript check, and production frontend build.
- [x] Add at least one Playwright E2E test for lesson → builder → simulation → code flow.
- [x] Test keyboard controls, small-screen layout, errors, and empty states.
- [x] Update README with exact install/run/test commands and troubleshooting.
- [x] Add `docs/architecture.md`, `docs/demo-script.md`, and a concise major-project expansion section.
- [x] Verify clean checkout/start without access to private accounts or APIs.
- [x] Walk through the complete live demo in Section 13.

**Exit gate:** All Section 12 acceptance tests pass and a new developer can start and demonstrate the application from README instructions.

---

## 10. LOCAL COMMANDS AND DEVELOPER EXPERIENCE

Implement package scripts so these commands work. Record exact steps in the generated README and adapt only if existing project tooling requires it.

### Backend

```bash
cd backend
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend tests (in a separate terminal with venv active):

```bash
cd backend
python -m pytest -q
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Required scripts in `frontend/package.json`:

```bash
npm run build
npm run typecheck
npm run lint
npm run test
npm run test:e2e
```

Use a typed API client and `VITE_API_BASE_URL=http://localhost:8000/api/v1` in `frontend/.env.example`. Do not check real `.env` secrets into source control. No authentication is required.

**Windows compatibility:** Document PowerShell venv activation; avoid Linux-only shell scripts for ordinary development. E2E browser installation (`npx playwright install`) should be documented if required.

---

## 11. TEST PLAN — REQUIRED ASSERTIONS

### Backend physics and API tests

| Test case | Circuit or input | Exact assertion |
|---|---|---|
| Initial state | `measure(q0)` | `counts == {"0": shots}` |
| X gate | `x(q0), measure(q0)` | `counts == {"1": shots}` |
| X reversal | `x(q0), x(q0), measure(q0)` | all outcomes `"0"` |
| H reversal | `h(q0), h(q0), measure(q0)` | all outcomes `"0"` |
| Z on zero | `z(q0), measure(q0)` | all outcomes `"0"` |
| Superposition | `h(q0), measure(q0)` with 1024 shots | sum 1024, keys `0` and `1`; use a broad non-flaky tolerance, e.g. each between 35%–65% |
| Bell state | `h(q0), cx(q0,q1), measure both` | outcomes subset of `{00, 11}`, counts sum to shots |
| Bit order | `x(q1), measure(q0), measure(q1)` | `counts == {"10": shots}` |
| Missing measurement | H only | simulation `422`, helpful error |
| Bad CNOT | same control/target | `422`, `INVALID_CNOT_TARGET` |
| Bad qubit | index outside range | `422`, no simulation |
| Bad gate/name | unsupported gate | `422` |
| Gate after measurement | measurement then X | `422` |
| Duplicate measurement | same qubit twice | `422` |
| Excess limits | qubits/gates/shots/code size too high | rejected correctly |
| Unknown fields and wrong types | additional keys, booleans, numeric strings | rejected correctly |
| Parser safety | imports, exec, loops, nested calls, expressions | rejected; no execution |
| Code round-trip | generate(parse-able source) | semantically identical canonical circuit; shots preserved separately |
| Health | GET health | `200` JSON status |
| Failure isolation | invalid request followed by valid request | valid request still succeeds |

### Frontend and integration tests

- [x] Builder gate placement changes rendered diagram **and** canonical state.
- [x] CNOT uses two different qubits and renders a control line.
- [x] Move/delete/reset work without corrupting the remaining gate sequence.
- [x] Changing shots submits the selected number.
- [x] Failed validation displays a useful error without losing the circuit.
- [x] Editing the circuit removes/marks old results stale.
- [x] Lesson Try in Builder loads the correct runnable JSON example.
- [x] Code parse errors preserve original builder state and unsaved text.
- [x] Code generation then parsing round-trips supported circuits.
- [x] Results chart percentages agree with counts and shots.
- [x] UI works at mobile and desktop widths; users can place gates without dragging.
- [x] E2E: open Superposition lesson → Try in Builder → run → verify counts + chart → Code tab → modify valid code → Apply → run again.

**No statistical test may expect exactly 512/512 results from 1,024 shots.** Deterministic test circuits can and should assert exact outcomes.

---

## 12. FINAL P0 ACCEPTANCE CHECKLIST

Mark `[x]` only after confirming behavior in a running app.

- [x] Fresh local install succeeds from README.
- [x] Home, Learn, lesson detail, and Playground routes work.
- [x] Six complete, technically correct lessons are available.
- [x] Each lesson loads a valid circuit through Try in Builder.
- [x] Visual editor supports X, Y, Z, H, CNOT, measurement, 1–5 qubits, move, delete, reset, and shot selection.
- [x] Drag-and-drop and click-to-place both function.
- [x] Backend rejects invalid circuits and returns friendly errors.
- [x] Simulation uses actual **Qiskit Aer**, not mocks or random placeholders.
- [x] Superposition circuit produces approximately 50/50 samples; Bell produces correlated outcomes.
- [x] Counts, probabilities, bit-order labels, and circuit diagram are correct.
- [x] Restricted Python editor generates, parses, and applies supported code safely.
- [x] Attempted unsafe Python is rejected and never executed.
- [x] Circuit/code synchronization and unsaved-edit handling work.
- [x] No stale result is shown as current after circuit modification.
- [x] Backend pytest suite passes.
- [x] Frontend typecheck, lint, unit tests, and production build pass.
- [x] At least one browser end-to-end user-journey test passes. (If blocked by the environment, record the blocker and leave unchecked.)
- [x] Accessible click/keyboard alternative and responsive mobile layout work.
- [x] README, architecture explanation, and demo script are complete.
- [x] No required MVP screen contains dummy results, placeholder content, or dead-end buttons.

---

## 13. EVALUATION DEMO SCRIPT (5–7 MINUTES)

1. Show the Learn index and open **Superposition**. Explain `H|0⟩ = (|0⟩+|1⟩)/√2`.
2. Click **Try in Builder**; verify the H + measurement circuit appears.
3. Run 1,024 shots. Explain that around half the outcomes are `0`, half `1`, with sampling variation.
4. Build a Bell-state circuit with two qubits, H on q0, CNOT q0→q1, measure both. Show correlated `00`/`11` counts.
5. Open the Code tab and show the equivalent generated Qiskit-style Python.
6. Make a supported code edit, apply it to the builder, rerun, and compare results.
7. Enter an unsupported Python statement and demonstrate an understandable parser error, not code execution.
8. Explain the JSON contract, Qiskit adapter, and how the minor project becomes the foundation for the major project.

---

## 14. FUTURE MAJOR PROJECT (DO NOT IMPLEMENT NOW)

Preserve architectural extension points for later features:

1. **Learning:** accounts, saved progress, instructor dashboard, more quizzes and algorithms.
2. **Visualization:** Bloch sphere, statevectors, noise models, fidelity, richer gate set.
3. **Execution:** pluggable simulators, batch jobs, optional real quantum hardware integrations and quotas.
4. **AI learning assistant:** grounded explanations tied to validated circuit data and real results.
5. **Collaboration:** assignments, shareable circuit links, classroom activities.

Maintain a versionable canonical Circuit JSON model, simulator adapter boundary, strict validation, and separation of circuit editing from execution.

---

## 15. REFERENCES AND CORRECTNESS SOURCES

Use these when implementing or reviewing behavior; prefer installed-version API docs where they differ:

- [Qiskit Aer — simulator tutorial](https://qiskit.github.io/qiskit-aer/tutorials/1_aersimulator.html)
- [Qiskit Aer — getting started](https://qiskit.github.io/qiskit-aer/getting_started.html)
- [Qiskit — official bit-ordering guide](https://qiskit.qotlabs.org/docs/guides/bit-ordering)
- [Qiskit — QuantumCircuit API](https://qiskit.qotlabs.org/docs/api/qiskit/qiskit.circuit.QuantumCircuit)
- [Qiskit Aer repository](https://github.com/Qiskit/qiskit-aer) — currently notes reduced maintenance; keep adapter modular.

---

## 16. AGENT FINAL REPORT FORMAT

When implementation work is finished, report:

```text
IMPLEMENTATION SUMMARY
- Phases complete: ...
- Working frontend/backend features: ...
- Important architectural decisions: ...

VERIFICATION
- Backend tests: [command] — [pass/fail/not run]
- Frontend tests: [command] — [pass/fail/not run]
- Typecheck/lint/build: [commands] — [status]
- Browser E2E: [command] — [status]
- Manual end-to-end demo: [status]

RUN LOCALLY
- Backend: ...
- Frontend: ...
- URLs: ...

KNOWN LIMITATIONS / BLOCKERS
- ...

NEXT STEP
- The single highest-priority unfinished P0 task (if any).
```

**Final directive:** Ship a dependable educational quantum circuit playground with real simulation and a safe, understandable coding interface. Complete the minor-project workflow before adding major-project features.

---

## Verification record (2026-10-31)

All checkboxes above were marked only after the following commands passed locally on Windows.

| Check | Command | Result |
| --- | --- | --- |
| Backend suite | `backend\.venv\Scripts\python.exe -m pytest -q` | 76 passed (1 Starlette deprecation warning) |
| Frontend unit/integration | `npm run test` (in `frontend`) | 52 passed |
| Type check | `npm run typecheck` | passed |
| Lint | `npm run lint` | 0 errors, 3 fast-refresh warnings in `src/state/circuit.tsx` |
| Production build | `npm run build` | passed; 1.26 MB JS bundle, Vite chunk-size warning only |
| Browser E2E | `npm run test:e2e` | 5 passed in Chromium against the real FastAPI + Qiskit Aer servers |
| Fresh install | New temp copy: new venv, `pip install -r requirements.txt`, `pytest`; `npm ci`, `npm run build` | 76 backend tests passed; frontend build passed |
| Lesson circuits | Validated and simulated each `example_circuit` through the real worker | 6/6 succeeded; outcome sets: `0`, `0/1`, `0`, `1`, `00/11`, `01` |
| Manual browser | Superposition H + measurement, 1024 shots | 526 zeros / 498 ones; chart, table, explanation, and generated Python verified |

Known non-blocking warnings: Vite reports a >500 kB bundle (Recharts + CodeMirror); ESLint reports three `react-refresh/only-export-components` warnings for the reducer/context module; `npm audit` reports dev-only advisories in Vitest/ESLint, while `npm audit --omit=dev` reports 0 vulnerabilities.