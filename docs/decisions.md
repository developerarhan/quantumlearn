# Design decisions

Short records of the choices that shape the MVP, with the trade-offs accepted.

## ADR-001 — One strict canonical Circuit JSON for every path

**Decision:** The builder, lessons, code parser, generator, and simulator all use the same discriminated-union `Circuit` model.

**Why:** A single contract removes translation drift between the UI and backend. Cross-field rules live in one Python validator and are mirrored by the TypeScript types and client-side guards.

**Trade-off:** The model is narrower than Qiskit (five gates, fixed classical-bit mapping, terminal measurement). That is deliberate for a teaching MVP; extension requires touching each layer together.

## ADR-002 — Validate semantically on the backend even when the UI already prevents errors

**Decision:** The API re-validates every circuit, including requests produced by the builder.

**Why:** The browser is not a trust boundary. Direct API calls, stale clients, and future integrations must not be able to run an invalid circuit. Stable error codes also make frontend handling predictable.

**Trade-off:** Slight duplication between `utils/circuit.ts` guards and `services/validator.py`. The duplication is small and intentional: the client guards UX, the server guards correctness.

## ADR-003 — Run Aer in a bounded child process

**Decision:** The API serializes validated Circuit JSON to stdin of `python -m app.workers.simulate_once`, with a hard timeout, `shell=False`, and no window on Windows.

**Why:** Simulation is the heaviest and least trusted operation. Process isolation gives a hard kill path for timeouts and prevents a simulator crash or unexpected output from taking down the API process. It also keeps the adapter boundary honest: the worker sees JSON, never Python source.

**Trade-off:** Process startup adds latency (roughly 1–3 seconds for the first run on Windows). Acceptable for an interactive teaching app with 1–5 qubits.

## ADR-004 — Restrict Python with an AST allow-list, never execute it

**Decision:** Parse source with `ast.parse` and accept only one import, one `QuantumCircuit` assignment, and integer-literal gate calls. Never call `compile`, `exec`, or `eval`.

**Why:** “Safe execution” sandboxes are hard to get right. Parsing removes the entire class of runtime attacks. The teaching goal is translating between a circuit and code, not running arbitrary programs.

**Trade-off:** Users cannot write loops or variables. The UI states the allowed shape explicitly and reports a source line on rejection.

## ADR-005 — Teach Qiskit bit order instead of hiding it

**Decision:** Return `bitstring_order` and `measured_bits`, zero-fill keys to `num_qubits`, and explain that the highest-index classical bit prints leftmost.

**Why:** Bit-order confusion is a common source of wrong conclusions. Hiding it would make the app easier but pedagogically worse. A dedicated lesson and a canonical `"10"` fixture make the convention testable.

**Trade-off:** One-qubit results are `"0"`/`"1"` while two-qubit results read `c1c0`; the UI labels this every time.

## ADR-006 — Keep results in memory and mark them stale on edits

**Decision:** Results live in the React reducer, not local storage. Any circuit mutation invalidates them.

**Why:** Showing an old histogram next to a newly edited circuit is actively misleading. A local-first MVP has no need for persistence, and clearing state avoids stale-data bugs.

**Trade-off:** Refreshing loses the circuit and results. Shareable links and saved progress are major-project work.

## ADR-007 — Use a custom ASGI body-size middleware

**Decision:** Buffer `/api/v1/*` request bodies and return `422 REQUEST_TOO_LARGE` above 16 KiB.

**Why:** A `BaseHTTPMiddleware` implementation that reads the body can consume it before the route sees it. A raw ASGI middleware can inspect and replay messages safely. The limit protects the parser and simulator from oversized payloads before validation.

**Trade-off:** More code than a header-only check, but it works with chunked bodies and cannot be bypassed by omitting `Content-Length`.

## ADR-008 — Click-to-place is a first-class path, not a fallback

**Decision:** Every cell is a native button and every gate can be placed by two clicks. Drag-and-drop uses the same cells through @dnd-kit with `closestCorners` collision detection.

**Why:** Drag-only interfaces exclude keyboard and some motor-impaired users, and are awkward on small screens. Native buttons also simplify testing. The default `rectIntersection` strategy did not reliably report a droppable when the drag overlay crossed the SVG `foreignObject` cells; `closestCorners` targets the intended cell even with the overlay on top, and it was verified against a two-qubit, three-step drag sequence.

**Trade-off:** More DOM nodes inside the SVG (`foreignObject` buttons), which is fine at the 1–5 qubit scale. Collision detection is proximity-based rather than strict pointer containment, so a drop between cells chooses the nearest one.

## ADR-009 — Keep the code panel mounted while the Builder tab is active

**Decision:** The Code tab panel stays in the DOM but hidden, and generates code lazily when activated.

**Why:** Unmounting would discard drafts. Lazy generation avoids an API call on every builder keystroke while still keeping the editor in sync when opened. Dirty drafts survive builder changes with an explicit warning.

**Trade-off:** Slightly more complex effect logic and two possible sources of truth (draft vs. builder), resolved by an explicit dirty flag and fingerprint comparison.

## ADR-010 — Explicit error envelopes instead of FastAPI defaults

**Decision:** All errors return `{"error": {"code", "message", ...}}`, including schema failures, 404s, 429s, and 504s.

**Why:** The frontend needs stable codes for tests and user-facing messages. Default FastAPI validation payloads expose implementation details and vary in shape.

**Trade-off:** A custom handler translates Pydantic errors into friendly text. New validation types may need a new mapping.

## ADR-011 — Tailwind v4 without a component library

**Decision:** Use Tailwind v4 through `@tailwindcss/vite`, with small shared `.btn-*`, `.card`, `.badge`, and `.input` classes.

**Why:** A component library would add weight and opinionated markup for a small app. Utility classes keep the visual system transparent. Tailwind v4 cannot `@apply` custom component classes, so shared classes are defined with base utilities rather than composed.

**Trade-off:** Some class strings repeat across components. The consistency and small bundle are worth it.

## ADR-012 — Playwright starts and reuses both servers

**Decision:** The Playwright config declares two `webServer` entries (backend and frontend) with `reuseExistingServer: true`.

**Why:** E2E should be a single command and should exercise the real API and Aer, not a mock. Reuse keeps local iteration fast when dev servers are already running.

**Trade-off:** The frontend URL is `http://localhost:5173` because Vite binds to localhost (IPv6 on Windows), while the backend health check uses `127.0.0.1:8000`. The config documents both explicitly.
