import json
import time
from confluent_kafka import Consumer, KafkaError
from core.config import settings
from schemas.events import FileUploadedEvent
from kafka_utils.producer import publish

def start_consuming():
    if len(settings.WORKER_SECRET) < 32:
        raise RuntimeError("WORKER_SECRET must contain at least 32 characters")
    consumer = Consumer({"bootstrap.servers": settings.KAFKA_BROKER, "group.id": settings.KAFKA_GROUP_ID,
        "auto.offset.reset": "earliest", "enable.auto.commit": False, "enable.auto.offset.store": False,
        "max.poll.interval.ms": 3600000, "session.timeout.ms": 45000})
    consumer.subscribe([settings.KAFKA_TOPIC])
    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() in (KafkaError._PARTITION_EOF, KafkaError.UNKNOWN_TOPIC_OR_PART):
                    time.sleep(2)
                    continue
                raise RuntimeError("Kafka consumer error")
            try:
                event = FileUploadedEvent.model_validate(json.loads(msg.value()))
            except (ValueError, TypeError):
                delay = 1
                while True:
                    try:
                        publish("file-uploads-dead-letter", msg.value())
                        break
                    except Exception as error:
                        print(f"Dead-letter delivery retry: {type(error).__name__}")
                        time.sleep(delay)
                        delay = min(delay * 2, 30)
                consumer.commit(message=msg, asynchronous=False)
                continue
            from services.ai_service import process_uploaded_file
            # Keep retrying this record on infrastructure/delivery failure; do not advance its offset.
            delay = 1
            while True:
                try:
                    process_uploaded_file(event)
                    consumer.commit(message=msg, asynchronous=False)
                    break
                except Exception as error:
                    print(f"Job {event.file_id} retry: {type(error).__name__}")
                    time.sleep(delay)
                    delay = min(delay * 2, 30)
    finally:
        consumer.close()
