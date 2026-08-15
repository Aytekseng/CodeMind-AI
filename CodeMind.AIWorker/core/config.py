from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    KAFKA_BROKER: str = "localhost:9092"
    KAFKA_TOPIC: str = "file-uploads"
    KAFKA_GROUP_ID: str = "ai-worker-group"
    
    # RAG ve Veritabanı Ayarları
    OLLAMA_LLM_MODEL: str = "llama3"
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    DATABASE_URL: str = "postgresql+psycopg://codemind:codemindpassword@localhost:5433/codemind_db"

    class Config:
        env_file = "../../.env"  # Points to the root .env file
        extra = "ignore" # .env içindeki diğer değerleri yok say

settings = Settings()
