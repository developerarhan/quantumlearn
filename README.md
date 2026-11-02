# QuantumLearn

QuantumLearn is a local-first teaching application for quantum computing fundamentals. It pairs six complete lessons with a visual circuit builder and a real Qiskit Aer simulator. Every circuit is validated against one strict JSON contract, and the optional Python editor accepts only a small Qiskit-style subset that is parsed — never executed.

This repository is the **minor-project MVP**. Accounts, cloud hardware, AI tutors, and databases are intentionally out of scope.

## What works

- **Learning hub** — six lessons (bits vs. qubits, superposition, gates, measurement and shots, entanglement, and a first Bernstein–Vazirani algorithm) with objectives, diagrams, expected behaviour, and knowledge checks.
- **Visual builder** — 1–5 qubits; X, Y, Z, H, CNOT, and measurement; click-to-place and drag-and-drop; insert at any step; move, delete, clear, reset, add/remove qubits, and choose 128–4,096 shots.
- **Real simulation** — validated Circuit JSON is converted to a Qiskit `QuantumCircuit` and sampled with `AerSimulator` in a bounded child process with a hard timeout.
- **Readable results** — counts, observed probabilities, measured-bit labels, explicit Qiskit bit order, a bar chart, and circuit-pattern explanations.
- **Restricted Python** — generate code from the builder, edit it, apply it back to the canonical state, and run it. Imports, loops, variables, expressions, and arbitrary calls are rejected with a source line.
- **Safe failure handling** — invalid circuits return stable error codes and friendly messages; results are marked stale when the circuit changes; a failed parse preserves both the builder state and the draft.

## Technology

| Layer | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, React Router 7, @dnd-kit, CodeMirror 6, Recharts |
| Backend | FastAPI, Pydantic v2, Qiskit 2.6, Qiskit Aer 0.18, Uvicorn |
| Tests | Pytest, Vitest + Testing Library, Playwright |

## Repository layout

```text
quantumlearn/
├─ backend/
│  ├─ app/
│  │  ├─ api/routes.py          # /api/v1 endpoints
│  │  ├─ models/circuit.py      # strict canonical contract
│  │  ├─ services/              # validation, conversion, simulation, code tools
│  │  ├─ workers/simulate_once.py
│  │  ├─ config.py
│  │  └─ main.py                # app, CORS, body limit, error handlers
│  ├─ tests/                    # physics, API, and parser-security tests
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  │  ├─ components/            # builder, results, code editor, lessons, layout
│  │  ├─ content/lessons/       # six lesson JSON files + typed loader
│  │  ├─ pages/                 # Home, Learn, Lesson, Playground, 404
│  │  ├─ services/api.ts        # typed API client
│  │  ├─ state/circuit.tsx      # Context + useReducer
│  │  ├─ tests/                 # Vitest suites
│  │  └─ utils/                 # circuit helpers and labels
│  ├─ e2e/journey.spec.ts       # Playwright user journeys
│  └─ playwright.config.ts
├─ docs/
│  ├─ architecture.md
│  ├─ decisions.md
│  └─ demo-script.md
├─ examples/                    # canonical fixture circuits
└─ plan.md                      # implementation plan and verification record
```

## Run locally

Requirements: Python 3.11–3.13 (verified on 3.13), Node.js 20.19+ or 22.12+ (verified on 22.17), npm 10+.

### 1. Backend (PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Linux/macOS equivalents:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Check it with `GET http://127.0.0.1:8000/api/v1/health`.

### 2. Frontend (a second terminal)

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open <http://localhost:5173>. The API base URL defaults to `http://localhost:8000/api/v1` through `VITE_API_BASE_URL`.

### Configuration

Backend (`backend/.env`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Comma-separated allowed CORS origins |
| `SIMULATION_TIMEOUT_SECONDS` | `30` | Hard timeout for the child simulator |
| `MAX_CONCURRENT_SIMULATIONS` | `2` | Concurrent simulation slots; extra requests get `429` |
| `LOG_LEVEL` | `INFO` | Uvicorn/application log level |

Frontend (`frontend/.env`): `VITE_API_BASE_URL`.

Real `.env` files are ignored by Git; only `.env.example` is committed.

## Commands

| Task | Command (from the named directory) |
| --- | --- |
| Backend tests | `cd backend` → `python -m pytest -q` |
| Frontend unit tests | `cd frontend` → `npm run test` |
| Type check | `cd frontend` → `npm run typecheck` |
| Lint | `cd frontend` → `npm run lint` |
| Production build | `cd frontend` → `npm run build` |
| Browser E2E | `cd frontend` → `npx playwright install chromium` (once), then `npm run test:e2e` |

The Playwright config starts both servers automatically when they are not already running, and reuses them when they are.

## API

All routes are under `/api/v1`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | `{"status":"ok","simulator":"qiskit-aer"}` |
| `POST` | `/circuits/validate` | Validate a circuit and echo it back |
| `POST` | `/circuits/simulate` | Validate, simulate, and return counts |
| `POST` | `/code/parse` | Parse restricted Python into Circuit JSON |
| `POST` | `/code/generate` | Generate restricted Python from Circuit JSON |

Simulation response (abridged):

```json
{
  "counts": { "00": 521, "11": 503 },
  "probabilities": { "00": 0.508789, "11": 0.491211 },
  "shots": 1024,
  "measured_bits": [0, 1],
  "bitstring_order": "c1c0",
  "simulator": "qiskit-aer",
  "explanation_key": "bell_state"
}
```

Errors always use the shape `{"error": {"code", "message", "gate_index?", "line?", "column?"}}`. Codes include `INVALID_REQUEST`, `REQUEST_TOO_LARGE`, `MISSING_MEASUREMENT`, `INVALID_CNOT_TARGET`, `QUBIT_OUT_OF_RANGE`, `GATE_AFTER_MEASUREMENT`, `DUPLICATE_MEASUREMENT`, `CLASSICAL_BIT_MISMATCH`, `SIMULATOR_BUSY`, `SIMULATION_TIMEOUT`, `CODE_INVALID_IMPORT`, and `CODE_UNSUPPORTED_SYNTAX`.

## Canonical Circuit JSON

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

Rules enforced on both sides of the API:

- `num_qubits` is 1–5; at most 50 gates; shots are 128–4,096 (default 1,024).
- Unknown fields, booleans used as integers, and numeric strings are rejected.
- Every qubit index must be in range; CNOT control and target must differ.
- Each qubit may be measured at most once, and every measurement must come after all quantum gates.
- In this MVP `classical_bit` must equal the measured qubit index.
- Simulation requires at least one measurement; validation and code generation do not.

**Bit order:** Qiskit prints the highest-index classical bit on the left. Measuring only `q0` therefore yields the one-character strings `0` and `1`. For `x(q1)` with both qubits measured, the result is `"10"` (`c1c0`), which is taught explicitly in the measurement lesson.

## Security model

- The browser never runs Qiskit and never executes Python.
- User Python is parsed with Python's `ast` module against a strict allow-list: one `from qiskit import QuantumCircuit`, one `QuantumCircuit(n, n)` assignment, and integer-literal calls to `x`, `y`, `z`, `h`, `cx`, and `measure`.
- Imports, assignments other than the constructor, loops, comprehensions, expressions, attributes, subscripts, lambdas, `exec`, `eval`, and nested calls are rejected before any circuit is built.
- The simulator receives validated JSON only, in a separate process with a hard timeout; stderr and tracebacks are never returned to clients.
- API request bodies are capped at 16 KiB and code at 8 KiB; CORS is an explicit origin allow-list; concurrent simulations are bounded.
- No accounts, cookies, database, or persisted user data.

## Tests and verification

- Backend: 76 Pytest tests covering gate physics, reversal identities, superposition tolerance, Bell correlation, Qiskit bit order, every validation rule, malformed payloads, body limits, concurrency, worker timeout, and parser-safety attacks.
- Frontend: 52 Vitest tests covering circuit utilities, the reducer, lesson content, canvas rendering and placement, results, the API client, and a full Playground integration flow.
- Browser: 5 Playwright journeys covering lesson → builder → real simulation → code generation → valid edit/apply/run → unsafe-code rejection, the Bell circuit, drag-and-drop plus keyboard placement, a 390 px mobile builder flow with a changed shot count, and loading all six lesson circuits into the builder.
- Typecheck, ESLint, and the production build pass.

See `plan.md` for the phase-by-phase record and `docs/architecture.md` for design details.

## Accessibility and responsiveness

- Gate palette and circuit cells are native buttons; gates can be selected and moved with the keyboard, and Escape cancels a pending placement.
- The builder exposes a click-to-place path in addition to drag-and-drop, so pointer dragging is never required.
- The layout stacks the palette, canvas, and settings on narrow screens; the circuit canvas scrolls horizontally instead of shrinking labels.
- Results include a real table with captions and scope attributes, plus text explanations of every chart.
- Alerts use `aria-live` where placement feedback matters; tabs follow the tablist/tabpanel pattern.

## Out of scope (major-project backlog)

Accounts and saved progress, instructor dashboards, Bloch spheres and statevectors, noise models, real quantum hardware, batch jobs, an AI tutor, and shareable circuits. The canonical JSON contract, simulator adapter, validation layer, and lesson format are the intended extension points.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — layers, data flow, contract, and security boundaries.
- [`docs/decisions.md`](docs/decisions.md) — key trade-offs and why they were chosen.
- [`docs/demo-script.md`](docs/demo-script.md) — a 5–7 minute evaluation walkthrough.
