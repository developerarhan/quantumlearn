"""Convert the trusted canonical circuit into a Qiskit QuantumCircuit."""

from __future__ import annotations

from qiskit import QuantumCircuit

from app.models.circuit import Circuit, CxGate, MeasureGate


def build_quantum_circuit(circuit: Circuit) -> QuantumCircuit:
    """Assemble a Qiskit circuit by iterating gates in canonical array order.

    Only this trusted converter touches Qiskit. User Python is never executed.
    """

    qc = QuantumCircuit(circuit.num_qubits, circuit.num_qubits)
    for gate in circuit.gates:
        if gate.name == "x":
            qc.x(gate.target)
        elif gate.name == "y":
            qc.y(gate.target)
        elif gate.name == "z":
            qc.z(gate.target)
        elif gate.name == "h":
            qc.h(gate.target)
        elif isinstance(gate, CxGate):
            qc.cx(gate.control, gate.target)
        elif isinstance(gate, MeasureGate):
            qc.measure(gate.target, gate.classical_bit)
        else:  # pragma: no cover - discriminated union makes this unreachable
            raise ValueError(f"Unsupported gate: {gate!r}")
    return qc
