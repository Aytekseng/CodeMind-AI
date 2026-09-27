import json
from confluent_kafka import Producer
from core.config import settings
from schemas.events import AnalysisCompletedEvent

def send_analysis_result(event: AnalysisCompletedEvent):
    conf = {'bootstrap.servers': settings.KAFKA_BROKER}
    producer = Producer(conf)

    # Pydantic objesini JSON formatına (Alias'ları kullanarak) çeviriyoruz
    json_data = event.model_dump_json(by_alias=True)
    producer.produce("analysis-results", value=json_data.encode('utf-8'))
    producer.flush()
    print("[Kafka Producer] Analiz sonucu 'analysis-results' kuyruğuna fırlatıldı!")

def send_analysis_failure(file_id: str, error_message: str, model_used: str = ""):
    failure_event = AnalysisCompletedEvent(
        FileId=file_id,
        Severity="HATA",
        AiSuggestion="",
        ModelUsed=model_used or "Yapay Zeka",
        IsSuccess=False,
        ErrorMessage=error_message
    )
    send_analysis_result(failure_event)
    print(f"[Kafka Producer] ❌ Analiz başarısızlık bildirimi gönderildi: {error_message}")