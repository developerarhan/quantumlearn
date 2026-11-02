from __future__ import annotations

import threading
from types import SimpleNamespace

import pytest

from app.models.circuit import Circuit
from app.services.simulator import SimulationTimedOut, run_simulation
from tests.conftest import circuit_payload


def simulate(client, num_qubits: int, gates: list[dict], shots: int = 1024):
    return client.post(
        "/api/v1/circuits/simulate",
        json=circuit_payload(num_qubits, gates, shots),
    )


def test_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "simulator": "qiskit-aer"}


def test_initial_state_measures_zero(client):
    response = simulate(
        client,
        1,
        [{"name": "measure", "target": 0, "classical_bit": 0}],
    )
    assert response.status_code == 200, response.text
    assert response.json()["counts"] == {"0": 1024}


def test_x_gate_flips_to_one(client):
    response = simulate(
        client,
        1,
        [{"name": "x", "target": 0}, {"name": "measure", "target": 0, "classical_bit": 0}],
    )
    assert response.status_code == 200
    assert response.json()["counts"] == {"1": 1024}
    assert response.json()["probabilities"] == {"1": 1.0}


def test_x_twice_returns_zero(client):
    response = simulate(
        client,
        1,
        [
            {"name": "x", "target": 0},
            {"name": "x", "target": 0},
            {"name": "measure", "target": 0, "classical_bit": 0},
        ],
    )
    assert response.status_code == 200
    assert response.json()["counts"] == {"0": 1024}


def test_h_twice_returns_zero(client):
    response = simulate(
        client,
        1,
        [
            {"name": "h", "target": 0},
            {"name": "h", "target": 0},
            {"name": "measure", "target": 0, "classical_bit": 0},
        ],
    )
    assert response.status_code == 200
    assert response.json()["counts"] == {"0": 1024}
    assert response.json()["explanation_key"] == "hh_identity"


def test_z_on_zero_does_not_change_measurement(client):
    response = simulate(
        client,
        1,
        [{"name": "z", "target": 0}, {"name": "measure", "target": 0, "classical_bit": 0}],
    )
    assert response.status_code == 200
    assert response.json()["counts"] == {"0": 1024}
    assert response.json()["explanation_key"] == "z_no_change"


def test_superposition_is_statistical(client):
    response = simulate(
        client,
        1,
        [{"name": "h", "target": 0}, {"name": "measure", "target": 0, "classical_bit": 0}],
        shots=2048,
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body["counts"]) == {"0", "1"}
    assert sum(body["counts"].values()) == 2048
    assert 0.35 <= body["counts"]["0"] / 2048 <= 0.65
    assert 0.35 <= body["counts"]["1"] / 2048 <= 0.65
    assert body["explanation_key"] == "superposition"
    assert body["bitstring_order"] == "c0"
    assert body["measured_bits"] == [0]
    assert body["simulator"] == "qiskit-aer"


def test_bell_state_is_correlated(client):
    response = simulate(
        client,
        2,
        [
            {"name": "h", "target": 0},
            {"name": "cx", "control": 0, "target": 1},
            {"name": "measure", "target": 0, "classical_bit": 0},
            {"name": "measure", "target": 1, "classical_bit": 1},
        ],
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body["counts"]).issubset({"00", "11"})
    assert sum(body["counts"].values()) == 1024
    assert body["explanation_key"] == "bell_state"
    assert body["bitstring_order"] == "c1c0"


def test_bit_order_uses_high_index_on_left(client):
    response = simulate(
        client,
        2,
        [
            {"name": "x", "target": 1},
            {"name": "measure", "target": 0, "classical_bit": 0},
            {"name": "measure", "target": 1, "classical_bit": 1},
        ],
    )
    assert response.status_code == 200
    assert response.json()["counts"] == {"10": 1024}


def test_probabilities_match_counts(client):
    response = simulate(
        client,
        1,
        [{"name": "h", "target": 0}, {"name": "measure", "target": 0, "classical_bit": 0}],
    )
    body = response.json()
    for bitstring, count in body["counts"].items():
        assert body["probabilities"][bitstring] == pytest.approx(count / body["shots"], abs=1e-6)


def test_validate_endpoint_normalizes_default_shots(client):
    response = client.post(
        "/api/v1/circuits/validate",
        json={"num_qubits": 1, "gates": []},
    )
    assert response.status_code == 200
    assert response.json() == {
        "valid": True,
        "circuit": {"num_qubits": 1, "gates": [], "shots": 1024},
    }


def test_missing_measurement_is_rejected(client):
    response = simulate(client, 1, [{"name": "h", "target": 0}])
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "MISSING_MEASUREMENT"
    assert "measurement" in response.json()["error"]["message"].lower()


def test_bad_cnot_is_rejected(client):
    response = simulate(
        client,
        2,
        [
            {"name": "cx", "control": 0, "target": 0},
            {"name": "measure", "target": 0, "classical_bit": 0},
        ],
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_CNOT_TARGET"
    assert response.json()["error"]["gate_index"] == 0


def test_out_of_range_qubit_is_rejected(client):
    response = simulate(
        client,
        1,
        [{"name": "x", "target": 3}, {"name": "measure", "target": 0, "classical_bit": 0}],
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "QUBIT_OUT_OF_RANGE"


def test_gate_after_measurement_is_rejected(client):
    response = simulate(
        client,
        1,
        [
            {"name": "measure", "target": 0, "classical_bit": 0},
            {"name": "x", "target": 0},
        ],
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "GATE_AFTER_MEASUREMENT"


def test_duplicate_measurement_is_rejected(client):
    response = simulate(
        client,
        1,
        [
            {"name": "measure", "target": 0, "classical_bit": 0},
            {"name": "measure", "target": 0, "classical_bit": 0},
        ],
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "DUPLICATE_MEASUREMENT"


def test_classical_bit_must_match_target(client):
    response = simulate(
        client,
        2,
        [
            {"name": "measure", "target": 0, "classical_bit": 1},
            {"name": "measure", "target": 1, "classical_bit": 1},
        ],
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "CLASSICAL_BIT_MISMATCH"


@pytest.mark.parametrize(
    "payload",
    [
        {"num_qubits": 0, "gates": []},
        {"num_qubits": 6, "gates": []},
        {"num_qubits": True, "gates": []},
        {"num_qubits": "2", "gates": []},
        {"num_qubits": 1, "gates": [], "shots": 127},
        {"num_qubits": 1, "gates": [], "shots": 4097},
        {"num_qubits": 1, "gates": [], "shots": True},
        {"num_qubits": 1, "gates": [], "unexpected": 1},
        {"num_qubits": 1, "gates": [{"name": "x", "target": 0, "extra": 1}]},
        {"num_qubits": 1, "gates": [{"name": "x", "target": True}]},
        {"num_qubits": 1, "gates": [{"name": "swap", "target": 0}]},
    ],
)
def test_invalid_shapes_are_rejected(client, payload):
    response = client.post("/api/v1/circuits/validate", json=payload)
    assert response.status_code == 422
    assert "error" in response.json()
    assert "code" in response.json()["error"]
    assert "message" in response.json()["error"]


def test_gate_limit_is_enforced(client):
    gates = [{"name": "x", "target": 0} for _ in range(51)]
    response = client.post("/api/v1/circuits/validate", json=circuit_payload(1, gates))
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_invalid_then_valid_request_still_succeeds(client):
    bad = simulate(client, 1, [{"name": "x", "target": 9}])
    assert bad.status_code == 422
    good = simulate(
        client,
        1,
        [{"name": "x", "target": 0}, {"name": "measure", "target": 0, "classical_bit": 0}],
    )
    assert good.status_code == 200
    assert good.json()["counts"] == {"1": 1024}


def test_oversized_request_is_rejected(client):
    huge = {"num_qubits": 1, "gates": [], "padding": "x" * 20000}
    response = client.post("/api/v1/circuits/validate", json=huge)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "REQUEST_TOO_LARGE"


def test_missing_gates_field_is_rejected(client):
    response = client.post("/api/v1/circuits/validate", json={"num_qubits": 1})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_bernstein_vazirani_one_bit_circuit(client):
    response = simulate(
        client,
        2,
        [
            {"name": "x", "target": 1},
            {"name": "h", "target": 0},
            {"name": "h", "target": 1},
            {"name": "cx", "control": 0, "target": 1},
            {"name": "h", "target": 0},
            {"name": "measure", "target": 0, "classical_bit": 0},
        ],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["counts"] == {"01": 1024}
    assert body["measured_bits"] == [0]
    assert body["bitstring_order"] == "c1c0"
    assert body["explanation_key"] == "bv_s1"


def test_unknown_pattern_has_no_explanation_key(client):
    response = simulate(
        client,
        1,
        [{"name": "y", "target": 0}, {"name": "measure", "target": 0, "classical_bit": 0}],
    )
    assert response.status_code == 200
    assert response.json()["explanation_key"] is None


def test_simulation_worker_timeout(monkeypatch):
    from app.services import simulator

    monkeypatch.setattr(
        simulator,
        "get_settings",
        lambda: SimpleNamespace(simulation_timeout_seconds=0.0001),
    )
    circuit = Circuit(
        num_qubits=1,
        gates=[{"name": "measure", "target": 0, "classical_bit": 0}],
        shots=128,
    )
    with pytest.raises(SimulationTimedOut):
        run_simulation(circuit)


def test_simulation_concurrency_limit_returns_429(client, monkeypatch):
    from app.api import routes

    locked = threading.BoundedSemaphore(1)
    locked.acquire()
    monkeypatch.setattr(routes, "_simulation_slots", locked)
    try:
        response = simulate(
            client,
            1,
            [{"name": "measure", "target": 0, "classical_bit": 0}],
        )
        assert response.status_code == 429
        assert response.json()["error"]["code"] == "SIMULATOR_BUSY"
    finally:
        locked.release()


def test_simulation_returns_depth_and_statevector(client):
    response = simulate(
        client,
        2,
        [
            {"name": "h", "target": 0},
            {"name": "cx", "control": 0, "target": 1},
            {"name": "measure", "target": 0, "classical_bit": 0},
            {"name": "measure", "target": 1, "classical_bit": 1},
        ],
    )
    assert response.status_code == 200
    data = response.json()
    assert data["circuit_depth"] >= 2
    assert "statevector" in data
    sv = data["statevector"]
    assert len(sv) == 4  # 2^2 states
    # |00> and |11> should have ~0.5 probability, |01> and |10> should be 0.0
    probs = {item["bitstring"]: item["probability"] for item in sv}
    assert probs["00"] == pytest.approx(0.5, rel=1e-3)
    assert probs["11"] == pytest.approx(0.5, rel=1e-3)
    assert probs["01"] == 0.0
    assert probs["10"] == 0.0


def test_qasm_export_endpoint(client):
    response = client.post(
        "/api/v1/circuits/qasm",
        json={
            "num_qubits": 2,
            "gates": [
                {"name": "h", "target": 0},
                {"name": "cx", "control": 0, "target": 1},
                {"name": "measure", "target": 0, "classical_bit": 0},
                {"name": "measure", "target": 1, "classical_bit": 1},
            ],
            "shots": 1024,
        },
    )
    assert response.status_code == 200
    qasm = response.json()["qasm"]
    assert "OPENQASM 2.0;" in qasm
    assert "qreg q[2];" in qasm
    assert "h q[0];" in qasm
    assert "cx q[0],q[1];" in qasm

