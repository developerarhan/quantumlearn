# Evaluation demo script (5–7 minutes)

A walkthrough that shows the real simulator, the canonical contract, and the security boundary without relying on slides.

## Before you start (2 minutes, outside the demo)

```powershell
# Terminal 1
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2
cd frontend
npm run dev
```

Open <http://localhost:5173> and confirm the page loads. Keep the browser at a desktop width for the first half; the mobile check is a short optional beat.

## 1. Learning hub and superposition (60–90 seconds)

1. Click **Learn** in the header. Point out the six lessons and that each has a circuit rendered from the same model as the playground.
2. Open **L02 Superposition and Amplitudes**.
3. Read the key equation from the lesson: `H|0⟩ = (|0⟩ + |1⟩)/√2`.
4. Point out the **Lesson circuit** card and the knowledge check at the bottom.

**Say:** “The lessons are data, not screenshots. Each example is canonical Circuit JSON that can be loaded and run.”

## 2. Lesson → builder → real Aer (90 seconds)

1. Click **Try in Builder** (either the header or the sidebar card).
2. Confirm the builder shows a 1-qubit, 2-step circuit: H on q0, then measurement.
3. Leave shots at **1024** and click **Run circuit**.
4. When results appear, point out:
   - the **Live Aer output** badge,
   - counts around 500/500 but almost never exactly 512/512,
   - the observed-probability table and chart,
   - the explanation “H creates an equal-amplitude superposition”.
5. Optional: change shots to **128** and rerun to show more sampling noise.

**Say:** “These are sampled shots from Qiskit Aer, not a hard-coded 50/50. The counts are evidence of sampling variation.”

## 3. Build the Bell state (60–90 seconds)

1. Click **Reset playground** and confirm.
2. Click **Add a qubit**; the header shows `2 / 5`.
3. Select **H**, click the step 1 cell on q0.
4. Select **CNOT**, click q0 in step 2 as the control, then q1 in step 2 as the target.
5. Select **Measure**, click q1 in step 3; select **Measure** again, click q0 in step 4.
6. Click **Run circuit**.

Point out that only `00` and `11` appear, and that the explanation says the outcomes are correlated, not a faster-than-light signal.

**Say:** “The canonical validator forces CNOT control and target to differ, and measurement to be terminal. The backend re-checks all of it before Aer runs.”

## 4. Code tab and a supported edit (90 seconds)

1. Click the **Python Code** tab. Wait for the generated source; the badge should say **In sync**.
2. Show the generated program: `from qiskit import QuantumCircuit`, `qc.h(0)`, `qc.cx(0, 1)`, and the two measurements.
3. Replace the program with a supported edit, for example:

```python
from qiskit import QuantumCircuit

qc = QuantumCircuit(1, 1)
qc.x(0)
qc.measure(0, 0)
```

4. Click **Apply to builder**, then **Apply & run circuit**.
5. Show that the result is now only `1`, and the explanation is “X flips the computational state”.

**Say:** “The editor is not executing Python. The backend parses the AST, builds the same canonical circuit, and then runs it.”

## 5. Safety check (45 seconds)

1. In the editor, replace everything with `import os`.
2. Click **Apply to builder**.
3. Show the error **Code could not be parsed**, the `CODE_INVALID_IMPORT` code, and the line number.
4. Switch back to **Circuit Builder** and confirm the last valid circuit is still there.

**Say:** “Imports, loops, variables, and expressions are rejected before anything is built. No source is ever executed, and a failed parse never destroys the builder state.”

## 6. Architecture close (60 seconds)

1. Open `examples/bell-state.json` and show the canonical contract.
2. Explain the path: strict Pydantic model → shared semantic validator → Qiskit converter → child-process Aer worker with a hard timeout.
3. Explain the extension points: the simulator adapter, the canonical model, and the lesson format are what a major project would build on for accounts, saved progress, noise models, or hardware backends.
4. Optional mobile beat: narrow the window to phone width, place H and measurement by clicking, and run. The palette stacks and the canvas scrolls horizontally.

**Close:** “The MVP is complete: six lessons, a real builder, real Aer output, safe code translation, and a strict contract that keeps every layer honest.”

## Troubleshooting during the demo

| Symptom | Check |
| --- | --- |
| “Simulation could not run” / network error | Backend running on port 8000; `GET /api/v1/health` returns `ok`. |
| CORS error in console | `FRONTEND_ORIGIN` in `backend/.env` matches the frontend URL (`http://localhost:5173`). |
| Code tab says “No code generated yet” | Click **Generate from builder**; the backend must be reachable. |
| Run returns `429` | Another simulation is in flight; wait a moment (limit is 2 by default). |
| Run returns `504` | Timeout is 30 seconds; use fewer shots or a smaller circuit. |
| E2E fails to start servers | Ports 5173/8000 are occupied by unrelated processes; stop them or let the config reuse the correct servers. |

## Timing summary

| Section | Time |
| --- | --- |
| 1. Learning hub and superposition | 1:00–1:30 |
| 2. Lesson → builder → Aer | 1:30 |
| 3. Bell state | 1:00–1:30 |
| 4. Code tab and supported edit | 1:30 |
| 5. Safety check | 0:45 |
| 6. Architecture close | 1:00 |
| **Total** | **~6–7 minutes** |
