"""Versioned API routes for validation, simulation, and code translation."""

from __future__ import annotations

import logging
import threading

from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.models.circuit import Circuit, CodeParseRequest
from app.services.code_generator import generate_code
from app.services.code_parser import parse_code
from app.services.explanations import explanation_key
from app.services.qasm_exporter import generate_qasm
from app.services.simulator import SimulationFailed, SimulationTimedOut, run_simulation
from app.services.validator import measured_bits, validate_circuit

logger = logging.getLogger("quantumlearn.api")
router = APIRouter(prefix="/api/v1")

_settings = get_settings()
_simulation_slots = threading.BoundedSemaphore(_settings.max_concurrent_simulations)


def _bitstring_order(num_qubits: int) -> str:
    """Qiskit renders the highest-index classical bit leftmost: c1c0."""

    return "".join(f"c{index}" for index in reversed(range(num_qubits)))


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "simulator": "qiskit-aer"}


@router.post("/circuits/validate")
def validate_endpoint(payload: Circuit) -> dict[str, object]:
    validate_circuit(payload)
    return {"valid": True, "circuit": payload.model_dump()}


@router.post("/circuits/simulate")
def simulate_endpoint(payload: Circuit) -> dict[str, object]:
    validate_circuit(payload, require_measurement=True)

    if not _simulation_slots.acquire(blocking=False):
        raise HTTPException(
            status_code=429,
            detail="The simulator is busy. Wait a moment and try again.",
        )

    try:
        result = run_simulation(payload)
    except SimulationTimedOut as exc:
        logger.warning("Simulation timed out after %.1fs", _settings.simulation_timeout_seconds)
        raise HTTPException(
            status_code=504,
            detail="The simulation exceeded the time limit. Try fewer shots.",
        ) from exc
    except SimulationFailed as exc:
        logger.exception("Simulation worker failed")
        raise HTTPException(
            status_code=500,
            detail="The simulator could not complete this circuit. Please try again.",
        ) from exc
    finally:
        _simulation_slots.release()

    counts: dict[str, int] = result["counts"]  # type: ignore[assignment]
    ordered_counts = {key: counts[key] for key in sorted(counts, key=lambda item: int(item, 2))}
    probabilities = {
        key: round(value / payload.shots, 6) for key, value in ordered_counts.items()
    }
    logger.info(
        "Simulated %d qubits, %d gates, %d shots in %.3fs",
        payload.num_qubits,
        len(payload.gates),
        payload.shots,
        float(result["duration_seconds"]),
    )

    return {
        "counts": ordered_counts,
        "probabilities": probabilities,
        "shots": payload.shots,
        "measured_bits": measured_bits(payload),
        "bitstring_order": _bitstring_order(payload.num_qubits),
        "simulator": "qiskit-aer",
        "explanation_key": explanation_key(payload),
        "circuit_depth": int(result.get("circuit_depth", 0)),
        "statevector": result.get("statevector"),
    }


@router.post("/circuits/qasm")
def qasm_endpoint(payload: Circuit) -> dict[str, str]:
    validate_circuit(payload)
    return {"qasm": generate_qasm(payload)}


@router.post("/code/parse")
def parse_code_endpoint(payload: CodeParseRequest) -> dict[str, object]:
    circuit = parse_code(payload.code, shots=payload.shots)
    return {"circuit": circuit.model_dump()}


@router.post("/code/generate")
def generate_code_endpoint(payload: Circuit) -> dict[str, str]:
    validate_circuit(payload)
    return {"code": generate_code(payload)}
