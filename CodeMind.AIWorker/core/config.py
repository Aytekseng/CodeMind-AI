from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    KAFKA_BROKER: str = "localhost:9092"
    KAFKA_TOPIC: str = "file-uploads"
    KAFKA_GROUP_ID: str = "ai-worker-group"

    class Config:
        env_file = "../../.env"  # Points to the root .env file

settings = Settings()
