"""Strict, AST-only parser for the restricted Qiskit-style teaching language.

Submitted source is parsed with :func:`ast.parse` and inspected against an
explicit allowlist. It is never compiled, imported, evaluated, or executed.
"""

from __future__ import annotations

import ast
from dataclasses import dataclass

from app.models.circuit import Circuit, CxGate, MeasureGate, SingleQubitGate
from app.services.validator import CircuitValidationError, validate_circuit

MAX_SOURCE_BYTES = 8192
MAX_AST_NODES = 800
MAX_GATES = 50

_SINGLE_QUBIT_METHODS = {"x", "y", "z", "h"}
_ALLOWED_METHODS = _SINGLE_QUBIT_METHODS | {"cx", "measure"}


@dataclass
class CodeParseError(Exception):
    code: str
    message: str
    line: int | None = None
    column: int | None = None
    gate_index: int | None = None

    def __str__(self) -> str:  # pragma: no cover - convenience only
        return self.message


def _fail(code: str, message: str, node: ast.AST | None = None) -> None:
    line = getattr(node, "lineno", None)
    column = getattr(node, "col_offset", None)
    raise CodeParseError(
        code=code,
        message=message,
        line=line,
        column=(column + 1) if column is not None else None,
    )


def _integer_literal(node: ast.AST) -> int:
    if not isinstance(node, ast.Constant):
        _fail(
            "CODE_INVALID_ARGUMENT",
            "Arguments must be plain non-negative integer literals (for example 0 or 1).",
            node,
        )
    value = node.value
    if isinstance(value, bool) or not isinstance(value, int):
        _fail(
            "CODE_INVALID_ARGUMENT",
            "Arguments must be plain non-negative integer literals, not names, booleans, or expressions.",
            node,
        )
    if value < 0:
        _fail("CODE_INVALID_ARGUMENT", "Qubit indices must be non-negative integers.", node)
    return value


def _parse_import(stmt: ast.ImportFrom) -> None:
    valid = (
        stmt.level == 0
        and stmt.module == "qiskit"
        and len(stmt.names) == 1
        and stmt.names[0].name == "QuantumCircuit"
        and stmt.names[0].asname is None
    )
    if not valid:
        _fail(
            "CODE_INVALID_IMPORT",
            "The only allowed import is: from qiskit import QuantumCircuit",
            stmt,
        )


def _parse_assignment(stmt: ast.Assign) -> int:
    if len(stmt.targets) != 1:
        _fail("CODE_INVALID_ASSIGNMENT", "Assign the circuit exactly once, as: qc = QuantumCircuit(n, n)", stmt)
    target = stmt.targets[0]
    if not isinstance(target, ast.Name) or target.id != "qc":
        _fail("CODE_INVALID_ASSIGNMENT", "The circuit must be assigned to the variable named qc.", target)
    call = stmt.value
    if not isinstance(call, ast.Call):
        _fail("CODE_INVALID_ASSIGNMENT", "qc must be created with QuantumCircuit(n, n).", stmt)
    if not isinstance(call.func, ast.Name) or call.func.id != "QuantumCircuit":
        _fail("CODE_INVALID_ASSIGNMENT", "Only QuantumCircuit(n, n) may be assigned to qc.", call)
    if call.keywords:
        _fail("CODE_INVALID_ASSIGNMENT", "QuantumCircuit does not accept keyword arguments here.", call)
    if len(call.args) != 2:
        _fail(
            "CODE_INVALID_ASSIGNMENT",
            "QuantumCircuit must receive exactly two identical integer arguments: (n, n).",
            call,
        )
    left = _integer_literal(call.args[0])
    right = _integer_literal(call.args[1])
    if left != right:
        _fail(
            "CODE_INVALID_ASSIGNMENT",
            "The two QuantumCircuit arguments must be identical in this MVP.",
            call,
        )
    if not 1 <= left <= 5:
        _fail("CODE_INVALID_ASSIGNMENT", "The circuit size must be between 1 and 5 qubits.", call)
    return left


def _parse_call(stmt: ast.Expr, gate_count: int) -> object:
    call = stmt.value
    if not isinstance(call, ast.Call):
        _fail("CODE_UNSUPPORTED_STATEMENT", "Only qc gate calls and one circuit assignment are allowed.", stmt)
    func = call.func
    if not isinstance(func, ast.Attribute):
        _fail("CODE_INVALID_CALL", "Calls must use the form qc.<gate>(...).", call)
    if not isinstance(func.value, ast.Name) or func.value.id != "qc":
        _fail("CODE_INVALID_CALL", "Calls must use the form qc.<gate>(...); other objects are not allowed.", func)
    method = func.attr
    if method not in _ALLOWED_METHODS:
        _fail(
            "CODE_INVALID_CALL",
            f"Unsupported method qc.{method}. Allowed methods: x, y, z, h, cx, measure.",
            func,
        )
    if call.keywords:
        _fail("CODE_INVALID_ARGUMENT", "Keyword arguments, starred arguments, and unpacking are not allowed.", call)
    if gate_count >= MAX_GATES:
        _fail("CODE_TOO_MANY_GATES", f"A circuit may contain at most {MAX_GATES} gates.", stmt)

    args = [_integer_literal(arg) for arg in call.args]
    if method in _SINGLE_QUBIT_METHODS:
        if len(args) != 1:
            _fail("CODE_INVALID_ARGUMENT", f"qc.{method} takes exactly one qubit index.", call)
        return SingleQubitGate(name=method, target=args[0])
    if method == "cx":
        if len(args) != 2:
            _fail("CODE_INVALID_ARGUMENT", "qc.cx takes exactly two qubit indices: control, target.", call)
        return CxGate(name="cx", control=args[0], target=args[1])
    if len(args) != 2:
        _fail("CODE_INVALID_ARGUMENT", "qc.measure takes exactly two indices: qubit, classical bit.", call)
    return MeasureGate(name="measure", target=args[0], classical_bit=args[1])


def parse_code(source: str, shots: int = 1024) -> Circuit:
    """Parse the restricted source into a validated canonical Circuit."""

    if len(source.encode("utf-8")) > MAX_SOURCE_BYTES:
        raise CodeParseError("CODE_TOO_LARGE", "Code must be at most 8 KiB (8192 bytes).")

    try:
        tree = ast.parse(source, mode="exec")
    except SyntaxError as exc:
        raise CodeParseError(
            code="CODE_SYNTAX_ERROR",
            message=exc.msg or "The source could not be parsed.",
            line=exc.lineno,
            column=exc.offset,
        ) from exc
    except (ValueError, TypeError) as exc:
        raise CodeParseError("CODE_SYNTAX_ERROR", "The source could not be parsed.") from exc

    if sum(1 for _ in ast.walk(tree)) > MAX_AST_NODES:
        raise CodeParseError("CODE_TOO_COMPLEX", "The program is too complex to analyze safely.")

    import_seen = False
    assigned = False
    num_qubits: int | None = None
    gates: list[object] = []

    for stmt in tree.body:
        if isinstance(stmt, ast.ImportFrom):
            if import_seen:
                _fail("CODE_INVALID_IMPORT", "Only one import statement is allowed.", stmt)
            if assigned:
                _fail("CODE_INVALID_IMPORT", "Place the import before creating the circuit.", stmt)
            _parse_import(stmt)
            import_seen = True
        elif isinstance(stmt, ast.Import):
            _fail(
                "CODE_INVALID_IMPORT",
                "The only allowed import is: from qiskit import QuantumCircuit",
                stmt,
            )
        elif isinstance(stmt, ast.Assign):
            if assigned:
                _fail("CODE_INVALID_ASSIGNMENT", "qc may be assigned only once.", stmt)
            if gates:
                _fail("CODE_INVALID_ASSIGNMENT", "Create the circuit before adding gates.", stmt)
            num_qubits = _parse_assignment(stmt)
            assigned = True
        elif isinstance(stmt, ast.Expr):
            if not assigned or num_qubits is None:
                _fail("CODE_UNSUPPORTED_STATEMENT", "Create qc = QuantumCircuit(n, n) before adding gates.", stmt)
            gates.append(_parse_call(stmt, len(gates)))
        else:
            _fail(
                "CODE_UNSUPPORTED_STATEMENT",
                "Only one import, one QuantumCircuit assignment, and qc gate calls are allowed. "
                "Loops, functions, conditions, and other statements are not supported.",
                stmt,
            )

    if not assigned or num_qubits is None:
        raise CodeParseError(
            "CODE_MISSING_CIRCUIT",
            "The program must create a circuit with: qc = QuantumCircuit(n, n)",
        )

    circuit = Circuit(num_qubits=num_qubits, gates=gates, shots=shots)  # type: ignore[arg-type]
    try:
        validate_circuit(circuit)
    except CircuitValidationError as exc:
        raise CodeParseError(
            code=exc.code,
            message=exc.message,
            gate_index=exc.gate_index,
        ) from exc
    return circuit
