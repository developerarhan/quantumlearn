from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


def circuit_payload(num_qubits: int, gates: list[dict], shots: int = 1024) -> dict:
    return {"num_qubits": num_qubits, "gates": gates, "shots": shots}
