"""Export trusted canonical Circuit JSON to OpenQASM 2.0."""

from __future__ import annotations

from qiskit import qasm2

from app.models.circuit import Circuit
from app.services.converter import build_quantum_circuit


def generate_qasm(circuit: Circuit) -> str:
    """Generate deterministic OpenQASM 2.0 source from canonical Circuit JSON."""
    qc = build_quantum_circuit(circuit)
    return qasm2.dumps(qc)
