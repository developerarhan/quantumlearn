"""Reusable semantic validation for the canonical circuit contract."""

from __future__ import annotations

from dataclasses import dataclass

from app.models.circuit import Circuit, CxGate, MeasureGate


@dataclass
class CircuitValidationError(Exception):
    """A user-correctable circuit error with a stable public error code."""

    code: str
    message: str
    gate_index: int | None = None
    line: int | None = None
    column: int | None = None

    def __str__(self) -> str:  # pragma: no cover - convenience only
        return self.message


def _check_index(index: int, num_qubits: int, what: str, gate_index: int) -> None:
    if index < 0 or index >= num_qubits:
        raise CircuitValidationError(
            code="QUBIT_OUT_OF_RANGE",
            message=(
                f"{what} index {index} is outside the valid range "
                f"0 to {num_qubits - 1} for a {num_qubits}-qubit circuit."
            ),
            gate_index=gate_index,
        )


def validate_circuit(circuit: Circuit, *, require_measurement: bool = False) -> Circuit:
    """Validate cross-field rules shared by every entry point.

    Raises:
        CircuitValidationError: when a rule is violated.
    """

    num_qubits = circuit.num_qubits
    measured: set[int] = set()
    measurement_started = False

    for gate_index, gate in enumerate(circuit.gates):
        if isinstance(gate, CxGate):
            if measurement_started:
                raise CircuitValidationError(
                    code="GATE_AFTER_MEASUREMENT",
                    message=(
                        "No quantum gates may appear after a measurement. "
                        "Move this gate before the measurement instructions."
                    ),
                    gate_index=gate_index,
                )
            _check_index(gate.control, num_qubits, "Control", gate_index)
            _check_index(gate.target, num_qubits, "Target", gate_index)
            if gate.control == gate.target:
                raise CircuitValidationError(
                    code="INVALID_CNOT_TARGET",
                    message="Control and target must be different qubits.",
                    gate_index=gate_index,
                )
        elif isinstance(gate, MeasureGate):
            _check_index(gate.target, num_qubits, "Target", gate_index)
            _check_index(gate.classical_bit, num_qubits, "Classical bit", gate_index)
            if gate.classical_bit != gate.target:
                raise CircuitValidationError(
                    code="CLASSICAL_BIT_MISMATCH",
                    message=(
                        "In this MVP each measurement must write to the classical "
                        "bit with the same index as its target qubit."
                    ),
                    gate_index=gate_index,
                )
            if gate.target in measured:
                raise CircuitValidationError(
                    code="DUPLICATE_MEASUREMENT",
                    message=(
                        f"Qubit {gate.target} is measured more than once. "
                        "Each qubit may be measured at most once."
                    ),
                    gate_index=gate_index,
                )
            measured.add(gate.target)
            measurement_started = True
        else:
            if measurement_started:
                raise CircuitValidationError(
                    code="GATE_AFTER_MEASUREMENT",
                    message=(
                        "No quantum gates may appear after a measurement. "
                        "Move this gate before the measurement instructions."
                    ),
                    gate_index=gate_index,
                )
            _check_index(gate.target, num_qubits, "Target", gate_index)

    if require_measurement and not measured:
        raise CircuitValidationError(
            code="MISSING_MEASUREMENT",
            message=(
                "Add at least one measurement before running the circuit. "
                "Measurement turns quantum amplitudes into classical counts."
            ),
        )

    return circuit


def measured_bits(circuit: Circuit) -> list[int]:
    return sorted({gate.target for gate in circuit.gates if isinstance(gate, MeasureGate)})
