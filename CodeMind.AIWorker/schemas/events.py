from typing import Literal
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator

class FileUploadedEvent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    file_id: str = Field(alias="FileId")

    @field_validator("file_id")
    @classmethod
    def valid_id(cls, value):
        return str(UUID(value))

class Finding(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    title: str = Field(alias="Title", min_length=1, max_length=500)
    severity: Literal["Kritik", "Yüksek", "Orta", "Düşük"] = Field(alias="Severity")
    line_number: int = Field(alias="LineNumber", ge=1)
    description: str = Field(alias="Description", min_length=1, max_length=6000)
    recommendation: str = Field(alias="Recommendation", min_length=1, max_length=6000)

class ChunkAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")
    findings: list[Finding] = Field(max_length=100)

class AnalysisCompletedEvent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    file_id: str = Field(alias="FileId")
    severity: str = Field(alias="Severity", default="Temiz")
    ai_suggestion: str = Field(alias="AiSuggestion", default="")
    model_used: str = Field(alias="ModelUsed", default="")
    is_success: bool = Field(alias="IsSuccess", default=True)
    error_message: str | None = Field(alias="ErrorMessage", default=None)
    findings: list[Finding] = Field(alias="Findings", default_factory=list)
