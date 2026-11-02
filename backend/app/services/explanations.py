"""Scientifically safe explanation keys for exact, known circuit patterns."""

from __future__ import annotations

from app.models.circuit import Circuit, CxGate, MeasureGate, SingleQubitGate


def _quantum_gates(circuit: Circuit) -> list:
    return [gate for gate in circuit.gates if not isinstance(gate, MeasureGate)]


def _measured_targets(circuit: Circuit) -> set[int]:
    return {gate.target for gate in circuit.gates if isinstance(gate, MeasureGate)}


def explanation_key(circuit: Circuit) -> str | None:
    """Return a key only for exact recognized patterns, otherwise None."""

    quantum = _quantum_gates(circuit)
    measured = _measured_targets(circuit)

    if circuit.num_qubits == 1 and measured == {0}:
        if not quantum:
            return "initial_zero"
        if len(quantum) == 1 and isinstance(quantum[0], SingleQubitGate):
            gate = quantum[0]
            if gate.name == "x" and gate.target == 0:
                return "x_flip"
            if gate.name == "z" and gate.target == 0:
                return "z_no_change"
            if gate.name == "h" and gate.target == 0:
                return "superposition"
        if (
            len(quantum) == 2
            and all(isinstance(g, SingleQubitGate) and g.name == "h" and g.target == 0 for g in quantum)
        ):
            return "hh_identity"

    if (
        circuit.num_qubits == 2
        and measured == {0, 1}
        and len(quantum) == 2
        and isinstance(quantum[0], SingleQubitGate)
        and quantum[0].name == "h"
        and quantum[0].target == 0
        and isinstance(quantum[1], CxGate)
        and quantum[1].control == 0
        and quantum[1].target == 1
    ):
        return "bell_state"

    # One-bit Bernstein-Vazirani with secret bit s=1.
    if (
        circuit.num_qubits == 2
        and measured == {0}
        and len(quantum) == 5
        and isinstance(quantum[0], SingleQubitGate)
        and quantum[0].name == "x"
        and quantum[0].target == 1
        and isinstance(quantum[1], SingleQubitGate)
        and quantum[1].name == "h"
        and quantum[1].target == 0
        and isinstance(quantum[2], SingleQubitGate)
        and quantum[2].name == "h"
        and quantum[2].target == 1
        and isinstance(quantum[3], CxGate)
        and quantum[3].control == 0
        and quantum[3].target == 1
        and isinstance(quantum[4], SingleQubitGate)
        and quantum[4].name == "h"
        and quantum[4].target == 0
    ):
        return "bv_s1"

    return None
