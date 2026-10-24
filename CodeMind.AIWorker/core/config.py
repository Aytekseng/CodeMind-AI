from pathlib import Path
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    KAFKA_BROKER: str = "localhost:9094"
    KAFKA_TOPIC: str = "file-uploads"
    KAFKA_GROUP_ID: str = "ai-worker-group"
    
    OPENAI_MODEL: str = "gpt-6.1-sol"
    ANTHROPIC_MODEL: str = "claude-sonnet-5-5"
    GEMINI_MODEL: str = "gemini-3.8-flash"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    OLLAMA_LLM_MODEL: str = "llama3"
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # GPU & Performans Optimizasyonu Ayarları
    OLLAMA_NUM_CTX: int = 8192       # VRAM tüketimini optimize eden context penceresi
    OLLAMA_NUM_GPU: int = 99         # Harici güçlü GPU'ya maksimum katmanı zorla (NVIDIA CUDA)
    OLLAMA_TEMPERATURE: float = 0.2  # Kod analizi için deterministik ve kararlı çıktı

    WORKER_SECRET: str = ""
    INTERNAL_API_URL: str = "http://localhost:5083"

    # MinIO Depolama Ayarları
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = Field(default="minioadmin", validation_alias=AliasChoices("MINIO_ACCESS_KEY", "MINIO_ROOT_USER"))
    MINIO_SECRET_KEY: str = Field(default="minioadmin", validation_alias=AliasChoices("MINIO_SECRET_KEY", "MINIO_ROOT_PASSWORD"))
    MINIO_BUCKET_NAME: str = "codemind-uploads"

    model_config = SettingsConfigDict(env_file=str(Path(__file__).resolve().parents[2] / ".env"), extra="ignore")

settings = Settings()
