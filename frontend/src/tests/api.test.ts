import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../models/circuit';
import { generateCode, parseCode, simulateCircuit, validateCircuit } from '../services/api';

function mockFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('API client', () => {
  it('posts the canonical circuit to the simulator', async () => {
    const fetchMock = mockFetch({ counts: { 0: 1024 }, shots: 1024 });
    const circuit = {
      num_qubits: 1,
      gates: [{ name: 'measure' as const, target: 0, classical_bit: 0 }],
      shots: 1024,
    };
    await simulateCircuit(circuit);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/circuits/simulate',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(circuit) }),
    );
  });

  it('sends shots separately when parsing code', async () => {
    const fetchMock = mockFetch({ circuit: { num_qubits: 1, gates: [], shots: 512 } });
    await parseCode('qc = QuantumCircuit(1, 1)', 512);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body).toEqual({ code: 'qc = QuantumCircuit(1, 1)', shots: 512 });
  });

  it('generates code from the canonical circuit', async () => {
    mockFetch({ code: 'from qiskit import QuantumCircuit\n' });
    const result = await generateCode({ num_qubits: 1, gates: [], shots: 1024 });
    expect(result.code).toContain('QuantumCircuit');
  });

  it('validates a circuit through the backend', async () => {
    const fetchMock = mockFetch({ valid: true, circuit: { num_qubits: 1, gates: [], shots: 1024 } });
    const response = await validateCircuit({ num_qubits: 1, gates: [], shots: 1024 });
    expect(response.valid).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('throws a typed ApiError with parser location', async () => {
    mockFetch(
      {
        error: {
          code: 'CODE_INVALID_IMPORT',
          message: 'The only allowed import is: from qiskit import QuantumCircuit',
          line: 1,
          column: 1,
        },
      },
      422,
    );
    await expect(parseCode('import os', 1024)).rejects.toMatchObject({
      name: 'ApiError',
      code: 'CODE_INVALID_IMPORT',
      line: 1,
      column: 1,
    });
  });

  it('reports a friendly network error when the backend is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(validateCircuit({ num_qubits: 1, gates: [], shots: 1024 })).rejects.toBeInstanceOf(
      ApiError,
    );
    await expect(validateCircuit({ num_qubits: 1, gates: [], shots: 1024 })).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });
});
