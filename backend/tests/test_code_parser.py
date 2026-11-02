from __future__ import annotations

import pytest

from app.services.code_generator import generate_code
from app.services.code_parser import CodeParseError, parse_code
from app.models.circuit import Circuit

VALID_SOURCE = """from qiskit import QuantumCircuit

# Bell state
qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.measure(0, 0)
qc.measure(1, 1)
"""


def test_valid_program_parses():
    circuit = parse_code(VALID_SOURCE, shots=2048)
    assert circuit.num_qubits == 2
    assert circuit.shots == 2048
    assert [gate.name for gate in circuit.gates] == ["h", "cx", "measure", "measure"]


@pytest.mark.parametrize(
    "source, expected_code",
    [
        (
            "import os\nos.system('echo unsafe')",
            "CODE_INVALID_IMPORT",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nfor i in range(10):\n    qc.h(0)",
            "CODE_UNSUPPORTED_STATEMENT",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nqc.h(__import__('os').getpid())",
            "CODE_INVALID_ARGUMENT",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nexec('print(1)')",
            "CODE_INVALID_CALL",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nqc.h(0 + 0)",
            "CODE_INVALID_ARGUMENT",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nqc.h(True)",
            "CODE_INVALID_ARGUMENT",
        ),
        (
            "qc = QuantumCircuit(1, 1, 1)",
            "CODE_INVALID_ASSIGNMENT",
        ),
        (
            "qc = QuantumCircuit(1)\nqc.h(0)",
            "CODE_INVALID_ASSIGNMENT",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nqc.swap(0, 1)",
            "CODE_INVALID_CALL",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nother = 3",
            "CODE_INVALID_ASSIGNMENT",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nqc.h(0)\nqc = QuantumCircuit(2, 2)",
            "CODE_INVALID_ASSIGNMENT",
        ),
        (
            "from qiskit import QuantumCircuit as QC\nqc = QuantumCircuit(1, 1)",
            "CODE_INVALID_IMPORT",
        ),
        (
            "from qiskit import QuantumCircuit, transpile\nqc = QuantumCircuit(1, 1)",
            "CODE_INVALID_IMPORT",
        ),
        (
            "from os import system\nqc = QuantumCircuit(1, 1)",
            "CODE_INVALID_IMPORT",
        ),
        (
            "qc.h(0)",
            "CODE_UNSUPPORTED_STATEMENT",
        ),
        (
            "",
            "CODE_MISSING_CIRCUIT",
        ),
        (
            "qc = QuantumCircuit(6, 6)",
            "CODE_INVALID_ASSIGNMENT",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nqc.cx(0, 0)",
            "INVALID_CNOT_TARGET",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nqc.measure(0, 0)\nqc.h(0)",
            "GATE_AFTER_MEASUREMENT",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nqc.h(0) if True else None",
            "CODE_UNSUPPORTED_STATEMENT",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nqc.h(-1)",
            "CODE_INVALID_ARGUMENT",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nqc.h(1.0)",
            "CODE_INVALID_ARGUMENT",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nqc.h(target=0)",
            "CODE_INVALID_ARGUMENT",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nqc.h(*[0])",
            "CODE_INVALID_ARGUMENT",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nqc.h(0).measure(0, 0)",
            "CODE_INVALID_CALL",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nqc.h()",
            "CODE_INVALID_ARGUMENT",
        ),
        (
            "from qiskit import QuantumCircuit\nqc = QuantumCircuit(1, 1)\nqc.h(0)\nimport os",
            "CODE_INVALID_IMPORT",
        ),
        (
            "qc = QuantumCircuit(1, 1)\ndef helper():\n    return 1",
            "CODE_UNSUPPORTED_STATEMENT",
        ),
        (
            "qc = QuantumCircuit(1, 1)\nclass Thing:\n    pass",
            "CODE_UNSUPPORTED_STATEMENT",
        ),
        (
            "qc = QuantumCircuit(2, 2)\nqc.measure(0, 1)",
            "CLASSICAL_BIT_MISMATCH",
        ),
    ],
)
def test_unsafe_or_invalid_programs_are_rejected(source, expected_code):
    with pytest.raises(CodeParseError) as exc_info:
        parse_code(source)
    assert exc_info.value.code == expected_code


def test_syntax_error_reports_location():
    with pytest.raises(CodeParseError) as exc_info:
        parse_code("qc = QuantumCircuit(1, 1)\nqc.h(0")
    assert exc_info.value.code == "CODE_SYNTAX_ERROR"
    assert exc_info.value.line is not None


def test_source_size_limit():
    with pytest.raises(CodeParseError) as exc_info:
        parse_code("#" * 8200)
    assert exc_info.value.code == "CODE_TOO_LARGE"


def test_ast_node_limit():
    with pytest.raises(CodeParseError) as exc_info:
        parse_code("qc = QuantumCircuit(1, 1)\n" + "(" * 500 + ")" * 500)
    assert exc_info.value.code in {"CODE_TOO_COMPLEX", "CODE_SYNTAX_ERROR"}


def test_round_trip_generate_and_parse():
    circuit = Circuit(
        num_qubits=3,
        gates=[
            {"name": "h", "target": 0},
            {"name": "cx", "control": 0, "target": 1},
            {"name": "y", "target": 2},
            {"name": "measure", "target": 0, "classical_bit": 0},
            {"name": "measure", "target": 1, "classical_bit": 1},
            {"name": "measure", "target": 2, "classical_bit": 2},
        ],
        shots=512,
    )
    code = generate_code(circuit)
    reparsed = parse_code(code, shots=512)
    assert reparsed.model_dump() == circuit.model_dump()
    assert generate_code(reparsed) == code


def test_parse_api_returns_normalized_circuit(client):
    response = client.post("/api/v1/code/parse", json={"code": VALID_SOURCE, "shots": 1024})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["circuit"]["num_qubits"] == 2
    assert body["circuit"]["shots"] == 1024
    assert body["circuit"]["gates"][1] == {"name": "cx", "control": 0, "target": 1}


def test_parse_api_rejects_unsafe_without_execution(client, tmp_path):
    marker = tmp_path / "should-not-exist.txt"
    source = f"import os\nos.system('echo unsafe > {marker.as_posix()}')"
    response = client.post("/api/v1/code/parse", json={"code": source, "shots": 1024})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "CODE_INVALID_IMPORT"
    assert not marker.exists()


def test_parse_api_rejects_invalid_circuit_semantics(client):
    source = "qc = QuantumCircuit(2, 2)\nqc.cx(1, 1)"
    response = client.post("/api/v1/code/parse", json={"code": source, "shots": 1024})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_CNOT_TARGET"


def test_generate_api(client):
    response = client.post(
        "/api/v1/code/generate",
        json={
            "num_qubits": 1,
            "gates": [
                {"name": "h", "target": 0},
                {"name": "measure", "target": 0, "classical_bit": 0},
            ],
            "shots": 1024,
        },
    )
    assert response.status_code == 200
    code = response.json()["code"]
    assert code == (
        "from qiskit import QuantumCircuit\n\n"
        "qc = QuantumCircuit(1, 1)\n"
        "qc.h(0)\n"
        "qc.measure(0, 0)\n"
    )


def test_code_byte_limit_is_enforced_at_api(client):
    response = client.post(
        "/api/v1/code/parse",
        json={"code": "é" * 5000, "shots": 1024},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_REQUEST"
