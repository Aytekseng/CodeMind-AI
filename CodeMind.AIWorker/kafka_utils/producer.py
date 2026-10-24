from confluent_kafka import Producer
from core.config import settings
from schemas.events import AnalysisCompletedEvent

def publish(topic: str, payload: bytes):
    producer = Producer({"bootstrap.servers": settings.KAFKA_BROKER, "enable.idempotence": True, "message.timeout.ms": 15000})
    errors = []
    def delivered(error, message):
        if error:
            errors.append(error)
    producer.produce(topic, value=payload, on_delivery=delivered)
    remaining = producer.flush(20)
    if remaining or errors:
        raise RuntimeError("Kafka delivery failed")

def send_analysis_result(event: AnalysisCompletedEvent):
    publish("analysis-results", event.model_dump_json(by_alias=True).encode("utf-8"))

def send_analysis_failure(file_id: str, error_message: str, model_used: str = ""):
    send_analysis_result(AnalysisCompletedEvent(FileId=file_id, IsSuccess=False, ErrorMessage=error_message, ModelUsed=model_used))
