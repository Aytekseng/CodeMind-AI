from pydantic import BaseModel, Field
from typing import Optional

class FileUploadedEvent(BaseModel):
    """
    .NET Core API'den Kafka'ya gönderilen mesajın (event) Python karşılığı.
    Buradaki alan adları, C# tarafındaki record veya class özellikleri ile (JSON formatında) birebir eşleşmelidir.
    """
    file_id: str = Field(alias="FileId", default="")
    file_name: str = Field(alias="FileName", default="")
    file_path: str = Field(alias="FilePath", default="")
    object_key: str = Field(alias="ObjectKey", default="")
    user_id: str = Field(alias="UploadedByUserId", default="")
    tenant_id: Optional[str] = Field(alias="TenantId", default=None)

    # Pydantic, hem camelCase hem de snake_case ile çalışabilmesi için populate_by_name kullanır
    class Config:
        populate_by_name = True

class AnalysisCompletedEvent(BaseModel):
    """AI Worker'dan C# tarafına gönderilecek sonuç mesajı."""
    file_id: str = Field(alias="FileId")
    severity: str = Field(alias="Severity", default="Medium")
    ai_suggestion: str = Field(alias="AiSuggestion", default="")
    class Config:
        populate_by_name = True
