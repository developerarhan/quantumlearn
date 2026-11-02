"""Simulator adapter boundary and bounded child-process execution."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Protocol

from app.config import get_settings
from app.models.circuit import Circuit
from app.services.converter import build_quantum_circuit


class SimulatorAdapter(Protocol):
    name: str

    def run(self, circuit: Circuit) -> dict[str, object]:
        """Return normalized counts, circuit depth, and theoretical statevector."""


class QiskitAerAdapter:
    """Concrete ideal-shot simulator backed by Qiskit Aer."""

    name = "qiskit-aer"

    def run(self, circuit: Circuit) -> dict[str, object]:
        import math
        from qiskit import QuantumCircuit
        from qiskit_aer import AerSimulator
        from qiskit.quantum_info import Statevector

        qc = build_quantum_circuit(circuit)
        depth = qc.depth()
        simulator = AerSimulator()

        # Transpile for the selected simulator; ideal Aer accepts the circuit,
        # but transpiling keeps this adapter valid for future backends.
        try:
            from qiskit import transpile
        except ImportError:  # pragma: no cover - Qiskit 2.x compatibility
            from qiskit.compiler import transpile

        compiled = transpile(qc, simulator)
        result = simulator.run(compiled, shots=circuit.shots).result()
        raw_counts = result.get_counts()

        counts: dict[str, int] = {}
        for key, value in raw_counts.items():
            bits = str(key).replace(" ", "")
            bits = bits.zfill(circuit.num_qubits)
            counts[bits] = counts.get(bits, 0) + int(value)

        # Compute theoretical statevector before terminal measurements
        sub_qc = QuantumCircuit(circuit.num_qubits)
        for gate in circuit.gates:
            if gate.name == "x":
                sub_qc.x(gate.target)
            elif gate.name == "y":
                sub_qc.y(gate.target)
            elif gate.name == "z":
                sub_qc.z(gate.target)
            elif gate.name == "h":
                sub_qc.h(gate.target)
            elif gate.name == "cx":
                sub_qc.cx(gate.control, gate.target)

        sv = Statevector(sub_qc)
        statevector_entries: list[dict[str, object]] = []
        n = circuit.num_qubits
        for idx, amp in enumerate(sv.data):
            bitstring = format(idx, f"0{n}b")
            mag = round(float(abs(amp)), 6)
            prob = round(float(abs(amp) ** 2), 6)
            phase_rad = math.atan2(float(amp.imag), float(amp.real))
            phase_deg = round(math.degrees(phase_rad), 2)
            statevector_entries.append({
                "bitstring": bitstring,
                "real": round(float(amp.real), 6),
                "imag": round(float(amp.imag), 6),
                "magnitude": mag,
                "phase_deg": phase_deg,
                "probability": prob,
            })

        return {
            "counts": counts,
            "circuit_depth": depth,
            "statevector": statevector_entries,
        }


class SimulationFailed(Exception):
    """The simulator worker failed for a reason safe to summarize publicly."""


class SimulationTimedOut(Exception):
    """The simulator worker exceeded the configured hard timeout."""


BACKEND_ROOT = Path(__file__).resolve().parents[2]


def run_simulation(circuit: Circuit) -> dict[str, object]:
    """Run a validated circuit in a controlled child process with a hard timeout.

    The child receives validated Circuit JSON only. It never receives or runs
    user Python source.
    """

    settings = get_settings()
    payload = json.dumps(circuit.model_dump(mode="json"))
    creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0) if os.name == "nt" else 0
    started = time.perf_counter()
    try:
        completed = subprocess.run(
            [sys.executable, "-m", "app.workers.simulate_once"],
            input=payload,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=settings.simulation_timeout_seconds,
            cwd=str(BACKEND_ROOT),
            shell=False,
            creationflags=creationflags,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise SimulationTimedOut("Simulation exceeded the time limit.") from exc

    if completed.returncode != 0:
        # stderr is logged by the caller; never return it to the client.
        raise SimulationFailed("The simulator could not complete this circuit.")

    try:
        data = json.loads(completed.stdout)
        counts = data["counts"]
        circuit_depth = data.get("circuit_depth", 0)
        statevector = data.get("statevector")
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        raise SimulationFailed("The simulator returned an unexpected response.") from exc

    if not isinstance(counts, dict) or sum(counts.values()) != circuit.shots:
        raise SimulationFailed("The simulator returned an inconsistent result.")

    elapsed = time.perf_counter() - started
    return {
        "counts": counts,
        "circuit_depth": circuit_depth,
        "statevector": statevector,
        "duration_seconds": round(elapsed, 4),
    }
