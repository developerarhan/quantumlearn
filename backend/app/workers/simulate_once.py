"""One-shot simulator worker.

Reads validated Circuit JSON from stdin, runs Qiskit Aer, and writes counts as
JSON to stdout. The worker never reads or executes user Python source.
"""

from __future__ import annotations

import json
import sys

from app.models.circuit import Circuit
from app.services.simulator import QiskitAerAdapter
from app.services.validator import validate_circuit


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        circuit = Circuit.model_validate(payload)
        validate_circuit(circuit, require_measurement=True)
        simulation_data = QiskitAerAdapter().run(circuit)
        json.dump(simulation_data, sys.stdout)
        return 0
    except Exception as exc:  # pragma: no cover - reported via parent process
        print(f"simulation worker failed: {type(exc).__name__}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
