"""Strict Pydantic models for the canonical Circuit JSON contract.

The same contract is used by the visual builder, the restricted code parser,
and the simulator. Extra keys are always forbidden and integers are strict so
booleans and numeric strings are never silently coerced.
"""

from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class SingleQubitGate(StrictModel):
    name: Literal["x", "y", "z", "h"]
    target: int = Field(ge=0)


class CxGate(StrictModel):
    name: Literal["cx"]
    control: int = Field(ge=0)
    target: int = Field(ge=0)


class MeasureGate(StrictModel):
    name: Literal["measure"]
    target: int = Field(ge=0)
    classical_bit: int = Field(ge=0)


Gate = Annotated[
    Union[SingleQubitGate, CxGate, MeasureGate],
    Field(discriminator="name"),
]


class Circuit(StrictModel):
    """Canonical circuit input. `shots` may be omitted and defaults to 1024."""

    num_qubits: int = Field(ge=1, le=5)
    gates: list[Gate] = Field(max_length=50)
    shots: int = Field(default=1024, ge=128, le=4096)


class CodeParseRequest(StrictModel):
    code: str
    shots: int = Field(default=1024, ge=128, le=4096)

    @field_validator("code")
    @classmethod
    def code_within_byte_limit(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 8192:
            raise ValueError("Code must be at most 8 KiB (8192 bytes).")
        return value
