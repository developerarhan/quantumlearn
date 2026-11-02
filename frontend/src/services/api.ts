import { ApiError, type ApiErrorPayload, type Circuit, type SimulationResult } from '../models/circuit';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000/api/v1';

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Could not reach the QuantumLearn API. Check that the backend is running on port 8000.',
    });
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // The error below explains the failure without exposing internals.
  }

  if (!response.ok) {
    const payload =
      body && typeof body === 'object' && 'error' in body
        ? (body as { error: ApiErrorPayload }).error
        : { code: 'REQUEST_FAILED', message: `Request failed with status ${response.status}.` };
    throw new ApiError(payload, response.status);
  }

  return body as T;
}

export async function fetchHealth(): Promise<{ status: string; simulator: string }> {
  return request('/health', { method: 'GET' });
}

export async function validateCircuit(circuit: Circuit): Promise<{ valid: boolean; circuit: Circuit }> {
  return request('/circuits/validate', {
    method: 'POST',
    body: JSON.stringify(circuit),
  });
}

export async function simulateCircuit(circuit: Circuit): Promise<SimulationResult> {
  return request('/circuits/simulate', {
    method: 'POST',
    body: JSON.stringify(circuit),
  });
}

export async function parseCode(code: string, shots: number): Promise<{ circuit: Circuit }> {
  return request('/code/parse', {
    method: 'POST',
    body: JSON.stringify({ code, shots }),
  });
}

export async function generateCode(circuit: Circuit): Promise<{ code: string }> {
  return request('/code/generate', {
    method: 'POST',
    body: JSON.stringify(circuit),
  });
}

export async function exportQasm(circuit: Circuit): Promise<{ qasm: string }> {
  return request('/circuits/qasm', {
    method: 'POST',
    body: JSON.stringify(circuit),
  });
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError({
    code: 'UNEXPECTED_ERROR',
    message: 'Something went wrong. Your circuit has been preserved.',
  });
}

export { API_BASE_URL };
