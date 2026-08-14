import json
from confluent_kafka import Consumer, KafkaError
from core.config import settings
from schemas.events import FileUploadedEvent

def start_consuming():
    """
    Kafka'ya bağlanır ve belirtilen topic'i dinlemeye başlar.
    """
    # Kafka Consumer ayarları
    conf = {
        'bootstrap.servers': settings.KAFKA_BROKER,
        'group.id': settings.KAFKA_GROUP_ID,
        'auto.offset.reset': 'earliest' # Eğer daha önce okunmamış mesaj varsa baştan okur
    }

    consumer = Consumer(conf)
    consumer.subscribe([settings.KAFKA_TOPIC])

    print(f"[*] Kafka dinleniyor... Broker: {settings.KAFKA_BROKER} | Topic: {settings.KAFKA_TOPIC}")

    try:
        while True:
            # 1 saniyelik zaman aşımı ile mesaj bekler
            msg = consumer.poll(timeout=1.0)

            if msg is None:
                continue

            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    # Partition sonuna gelindi, bu bir hata değil
                    continue
                elif msg.error().code() == KafkaError.UNKNOWN_TOPIC_OR_PART:
                    # Topic henüz oluşturulmamış (veri gelmemiş), beklemeye devam et
                    print(f"[!] Uyarı: Topic henüz yok ({msg.error()}). Bekleniyor...")
                    import time
                    time.sleep(2)
                    continue
                else:
                    print(f"[!] Kafka Hatası: {msg.error()}")
                    break

            # Mesaj başarıyla alındı!
            # Byte formatındaki veriyi string (utf-8) formatına çeviriyoruz
            raw_data = msg.value().decode('utf-8')
            print(f"\n[+] Yeni Mesaj Yakalandı: {raw_data}")

            try:
                # JSON metnini ayrıştırıp Pydantic modelimize dönüştürüyoruz
                json_dict = json.loads(raw_data)
                event = FileUploadedEvent(**json_dict)
                
                print(f"    - Dosya Adı: {event.file_name}")
                print(f"    - Yükleyen Kullanıcı: {event.user_id}")
                
                # AI / Chunking işlemlerini çağırıyoruz
                from services.ai_service import process_uploaded_file
                process_uploaded_file(event)
                
            except Exception as e:
                print(f"[-] Mesaj işlenirken hata oluştu: {e}")

    except KeyboardInterrupt:
        print("\n[!] Kullanıcı tarafından sonlandırıldı.")
    finally:
        # Program kapanırken consumer'ı temiz bir şekilde kapatır
        consumer.close()

