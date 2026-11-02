"""FastAPI application entry point."""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import router
from app.config import get_settings
from app.services.code_parser import CodeParseError
from app.services.validator import CircuitValidationError

settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("quantumlearn")

app = FastAPI(
    title="QuantumLearn API",
    description=(
        "Strict circuit validation and real Qiskit Aer simulation for the "
        "QuantumLearn teaching playground. User Python is parsed, never executed."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(router)


@app.get("/")
def root():
    return {
        "service": "QuantumLearn API",
        "status": "online",
        "docs": "/docs",
        "health": "/api/v1/health",
    }

MAX_BODY_BYTES = 16 * 1024


class BodySizeLimitMiddleware:
    """Buffer API request bodies and reject anything above the byte limit.

    Buffering is necessary because reading the body inside BaseHTTPMiddleware
    would consume it before the route could parse it.
    """

    def __init__(self, app, max_body_bytes: int = MAX_BODY_BYTES) -> None:
        self.app = app
        self.max_body_bytes = max_body_bytes

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http" or not scope.get("path", "").startswith("/api/v1/"):
            await self.app(scope, receive, send)
            return

        messages: list[dict] = []
        total = 0
        more_body = True
        while more_body:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body = message.get("body", b"")
            total += len(body)
            if total > self.max_body_bytes:
                response = JSONResponse(
                    status_code=422,
                    content={
                        "error": {
                            "code": "REQUEST_TOO_LARGE",
                            "message": "Request body must be at most 16 KiB.",
                        }
                    },
                )
                await response(scope, receive, send)
                return
            messages.append(message)
            more_body = bool(message.get("more_body", False))

        index = 0

        async def replay():
            nonlocal index
            if index < len(messages):
                message = messages[index]
                index += 1
                return message
            return await receive()

        await self.app(scope, replay, send)


app.add_middleware(BodySizeLimitMiddleware, max_body_bytes=MAX_BODY_BYTES)


def _error(
    status_code: int,
    code: str,
    message: str,
    *,
    gate_index: int | None = None,
    line: int | None = None,
    column: int | None = None,
) -> JSONResponse:
    error: dict[str, object] = {"code": code, "message": message}
    if gate_index is not None:
        error["gate_index"] = gate_index
    if line is not None:
        error["line"] = line
    if column is not None:
        error["column"] = column
    return JSONResponse(status_code=status_code, content={"error": error})


@app.exception_handler(CircuitValidationError)
async def circuit_validation_handler(_: Request, exc: CircuitValidationError) -> JSONResponse:
    return _error(
        422,
        exc.code,
        exc.message,
        gate_index=exc.gate_index,
        line=exc.line,
        column=exc.column,
    )


@app.exception_handler(CodeParseError)
async def code_parse_handler(_: Request, exc: CodeParseError) -> JSONResponse:
    return _error(
        422,
        exc.code,
        exc.message,
        gate_index=exc.gate_index,
        line=exc.line,
        column=exc.column,
    )


def _friendly_validation_message(err: dict) -> str:
    error_type = str(err.get("type", ""))
    location = [str(part) for part in err.get("loc", ()) if part != "body"]
    field = ".".join(location)
    if error_type == "extra_forbidden":
        return f"Unknown field '{field}' is not allowed."
    if error_type == "literal_error" and location and location[-1] == "name":
        return "Unsupported gate name. Allowed names are x, y, z, h, cx, and measure."
    if error_type in {"int_type", "int_parsing", "int_from_float"}:
        return f"Field '{field}' must be a whole number (booleans and strings are not accepted)."
    if error_type == "missing":
        return f"Required field '{field}' is missing."
    if error_type == "string_type":
        return f"Field '{field}' must be a string."
    if error_type == "too_long":
        return f"Field '{field}' is too long."
    if error_type == "value_error":
        return str(err.get("msg", "Invalid value.")).removeprefix("Value error, ")
    detail = str(err.get("msg", "Invalid value."))
    return f"Invalid value for '{field}': {detail}" if field else detail


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    first = errors[0] if errors else {}
    loc = list(first.get("loc", ()))
    gate_index = None
    if len(loc) >= 3 and loc[0] == "body" and loc[1] == "gates" and isinstance(loc[2], int):
        gate_index = loc[2]
    return _error(
        422,
        "INVALID_REQUEST",
        _friendly_validation_message(first),
        gate_index=gate_index,
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    code = {
        404: "NOT_FOUND",
        429: "SIMULATOR_BUSY",
        504: "SIMULATION_TIMEOUT",
    }.get(exc.status_code, "REQUEST_FAILED")
    return _error(exc.status_code, code, str(exc.detail))


@app.exception_handler(Exception)
async def unexpected_error_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server error")
    return _error(
        500,
        "INTERNAL_ERROR",
        "An unexpected server error occurred. Please try again.",
    )
