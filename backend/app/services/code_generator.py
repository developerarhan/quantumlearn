"""Deterministic generation of restricted Qiskit-style Python."""

from __future__ import annotations

from app.models.circuit import Circuit, CxGate, MeasureGate


def generate_code(circuit: Circuit) -> str:
    lines = [
        "from qiskit import QuantumCircuit",
        "",
        f"qc = QuantumCircuit({circuit.num_qubits}, {circuit.num_qubits})",
    ]
    for gate in circuit.gates:
        if isinstance(gate, CxGate):
            lines.append(f"qc.cx({gate.control}, {gate.target})")
        elif isinstance(gate, MeasureGate):
            lines.append(f"qc.measure({gate.target}, {gate.classical_bit})")
        else:
            lines.append(f"qc.{gate.name}({gate.target})")
    return "\n".join(lines) + "\n"
