import re
import boto3
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_postgres import PGVector
from langchain_core.documents import Document

from schemas.events import FileUploadedEvent, AnalysisCompletedEvent
from core.config import settings
from kafka_utils.producer import send_analysis_result

def get_file_from_minio(object_key: str) -> str:
    """MinIO'dan dosyayı indirip içeriğini string olarak döndürür."""
    s3_client = boto3.client('s3',
                             endpoint_url = 'http://localhost:9000',
                             aws_access_key_id = 'admin',
                             aws_secret_access_key = 'adminpassword')
    response = s3_client.get_object(Bucket = 'codemind-uploads', Key = object_key)
    return response['Body'].read().decode('utf-8')

def get_vector_store():
    """PgVector bağlantısını ve koleksiyonunu ayarlar."""
    embeddings = OllamaEmbeddings(
        model = settings.OLLAMA_EMBEDDING_MODEL,
        base_url = settings.OLLAMA_BASE_URL
    )

    vector_store = PGVector(
        embeddings=embeddings,
        collection_name="codemind_documents_ollama",
        connection=settings.DATABASE_URL,
        use_jsonb=True
    )

    return vector_store

def extract_severity(response_text: str) -> str:
    """
    LLM analiz çıktısını tarayarak koddaki en yüksek zafiyet düzeyini belirler.
    Öncelik Sıralaması: Kritik > Yüksek > Orta > Düşük
    """
    # 1. Öncelikli etiket kontrolü: [ZAFİYET_DÜZEYİ: ...]
    tag_match = re.search(r'\[(?:GENEL_)?ZAF[İI]YET_D[ÜU]ZEY[İI]\s*:\s*([^\]]+)\]', response_text, re.IGNORECASE)
    if tag_match:
        tag_val = tag_match.group(1).strip().lower()
        if "kritik" in tag_val or "critical" in tag_val:
            return "Kritik"
        elif "yüksek" in tag_val or "yuksek" in tag_val or "high" in tag_val:
            return "Yüksek"
        elif "orta" in tag_val or "medium" in tag_val:
            return "Orta"
        elif "düşük" in tag_val or "dusuk" in tag_val or "low" in tag_val or "temiz" in tag_val:
            return "Düşük"

    # 2. Metin içi semantik arama (özellikle 1. Güvenlik Açıkları bölümü)
    text_lower = response_text.lower()
    security_section = text_lower
    if "### 1." in text_lower and "### 2." in text_lower:
        security_section = text_lower[text_lower.find("### 1."):text_lower.find("### 2.")]

    if any(k in security_section for k in ["kritik", "critical", "(kritik)", "risk: kritik", "seviye: kritik", "seviyesi: kritik", "command injection", "uzaktan kod çalıştırma", "rce", "sql injection"]):
        return "Kritik"
    elif any(k in security_section for k in ["yüksek", "yuksek", "high", "(yüksek)", "risk: yüksek", "seviye: yüksek", "seviyesi: yüksek", "xss", "csrf", "yetkisiz erişim"]):
        return "Yüksek"
    elif any(k in security_section for k in ["orta", "medium", "(orta)", "risk: orta", "seviye: orta", "seviyesi: orta"]):
        return "Orta"
    elif any(k in security_section for k in ["düşük", "dusuk", "low", "(düşük)", "risk: düşük", "seviye: düşük", "seviyesi: düşük", "bilgi", "temiz", "açık bulunamadı"]):
        return "Düşük"

    return "Orta"

def process_uploaded_file(event_data: FileUploadedEvent):
    # Kafka'dan gelen mesaj
    object_key = event_data.object_key
    file_name = event_data.file_name
    file_id = event_data.file_id

    user_id = event_data.user_id or "Bilinmiyor"
    tenant_id = event_data.tenant_id or "Bilinmiyor"

    print(f"\n[AI Service] 📥 {file_name} dosyası MinIO'dan indiriliyor... (Kullanıcı ID: {user_id} | Şirket ID: {tenant_id})")

    # 1. Gerçek dosyayı MinIO'dan çek.
    try:
        document_text = get_file_from_minio(object_key)
        print("[AI Service] Dosya içeriği başarıyla okundu!")
    except Exception as e:
        print(f"[AI Service] Dosya okuma hatası: {e}")
        return

    # 2. Chunking
    text_splitter = RecursiveCharacterTextSplitter(chunk_size = 300, chunk_overlap = 50)
    chunks = text_splitter.split_text(document_text)

    documents = [
        Document(page_content=chunk, metadata={"file_name": file_name, "file_id": file_id})
        for chunk in chunks
    ]

    # 3. Vektör kaydı ve analiz
    try: 
        vector_store = get_vector_store()
        vector_store.add_documents(documents)
        print(f"[AI Service] {len(chunks)} vektör başarıyla PgVector'a kaydedildi.")

        # Dosya uzantısından dili tespit et
        ext = file_name.split('.')[-1].lower() if '.' in file_name else 'kod'
        lang_map = {
            'py': 'Python', 'cs': 'C# (.NET)', 'js': 'JavaScript', 'ts': 'TypeScript',
            'java': 'Java', 'go': 'Go', 'cpp': 'C++', 'c': 'C', 'php': 'PHP', 'sql': 'SQL'
        }
        detected_language = lang_map.get(ext, ext.upper())

        # Genel kod analizi sorgusu
        query = f"Bu {detected_language} kod dosyasında herhangi bir güvenlik açığı, performans sorunu veya kötü kodlama pratiği (bad practice) var mı?"
        docs = vector_store.similarity_search(query, k=4)

        if docs:
            context = "\n\n".join([doc.page_content for doc in docs])
            
            # Büyük projeler ve geniş analizler için dinamik ve tekrarsız LLM parametreleri
            llm = ChatOllama(
                model=settings.OLLAMA_LLM_MODEL,
                base_url=settings.OLLAMA_BASE_URL,
                num_ctx=settings.OLLAMA_NUM_CTX,
                num_gpu=settings.OLLAMA_NUM_GPU,
                temperature=0.2,
                top_p=0.9,
                repeat_penalty=1.20,
                repeat_last_n=256,
                stop=["<|eot_id|>", "<|end_of_text|>"]
            )
            from langchain_core.messages import SystemMessage, HumanMessage
            
            system_prompt = f"""Sen uzman bir Kıdemli Yazılım Mimarı ve Siber Güvenlik Baş Denetçisisin.
Şu anda bir {detected_language} kaynak kod dosyasını inceliyorsun.

GÖREVİN: Verilen {detected_language} kod bağlamını derinlemesine analiz edip koddaki güvenlik açıklarını, riskleri ve yapılması gereken düzeltmeleri açıklayıcı bir denetim raporu halinde sunmaktır.

KESİN KURALLAR:
1. 🇹🇷 DİL ZORUNLULUĞU (KESİNLİKLE TÜRKÇE): 
   - Tüm analizini, açıklamalarını ve tavsiyelerini KESİNLİKLE VE YALNIZCA TÜRKÇE olarak yaz.
   - İngilizce cümle veya açıklama yazmak KESİNLİKLE YASAKTIR.

2. 🚫 KOD BLOĞU YAZMA:
   - Kesinlikle kod bloğu (``` ile kod parçası) üretme! Yalnızca sözel olarak hatanın nerede olduğunu ve nasıl düzeltileceğini detaylıca açıkla.

3. 🛡️ ANLAMSIZ TEKRARLARDAN KAÇIN:
   - Her zafiyeti ve tavsiyeyi yalnızca 1 kez açık ve net belirt.

4. 📋 FORMAT ŞABLONU: Raporunu mutlaka en başta zafiyet düzeyi etiketiyle başlatarak aşağıdaki Türkçe Markdown başlıkları altında düzenle:

[ZAFİYET_DÜZEYİ: Kritik / Yüksek / Orta / Düşük / Temiz]

### 1. 🛡️ Tespit Edilen Güvenlik Açıkları & Risk Seviyeleri
- **[Zafiyet Adı / Türü]** (Kritik / Yüksek / Orta / Düşük): Koddaki hatanın hangi fonksiyonda/satırda yer aldığı, neden tehlike oluşturduğu ve saldırganın bunu nasıl istismar edebileceği.

### 2. ⚡ Performans ve Kod Kalitesi Değerlendirmesi
- Kodun güvenilirliği, olası performans darboğazları ve standartlara aykırı durumlar.

### 3. 🛠️ Çözüm İçin Yapılması Gerekenler (Adım Adım Eylem Planı)
- Geliştiricinin bu açıkları kapatmak için atması gereken somut adımlar, kullanılması gereken güvenli kütüphaneler/fonksiyonlar ve mimari öneriler (kod bloğu yazmadan, sözel talimatlarla).

Doğrudan Türkçe teknik rapora odaklan."""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"İncelenecek {detected_language} Dosyası ({file_name}):\n```\n{context}\n```\n\nÖNEMLİ TALİMAT: Kod bloğu yazmadan, bu {detected_language} kodundaki tüm açıkları ve yapılması gereken adımları KESİNLİKLE VE TAMAMEN TÜRKÇE olarak yukarıdaki şablonda açıkla.")
            ]
            
            print(f"[AI Service] {detected_language} dosyası için kodsuz, açıklayıcı ve %100 Türkçe analiz yapılıyor (Llama 3)...")

            response = llm.invoke(messages)
            raw_content = response.content
            print(f"\nAI Cevabı:\n{raw_content}")

            # Dinamik Zafiyet Düzeyi Tespiti
            detected_severity = extract_severity(raw_content)
            print(f"[AI Service] 🎯 Tespit Edilen Zafiyet Düzeyi: {detected_severity}")
            
            # Analiz Bitti -> Sonucu Kafka'ya Geri Gönder
            result_event = AnalysisCompletedEvent(FileId=file_id, Severity=detected_severity, AiSuggestion=raw_content)
            send_analysis_result(result_event)
    except Exception as e:
        print(f"[AI Service] Hata oluştu: {str(e)}")

    print("[AI Service] İşlem tamamlandı!\n")