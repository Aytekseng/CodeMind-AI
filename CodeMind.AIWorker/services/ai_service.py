import re
import boto3
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_postgres import PGVector
from langchain_core.documents import Document
from langchain_core.messages import SystemMessage, HumanMessage

from schemas.events import FileUploadedEvent, AnalysisCompletedEvent
from core.config import settings
from kafka_utils.producer import send_analysis_result, send_analysis_failure

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

import requests

def resolve_ephemeral_api_key(key_token: str) -> str:
    """
    Kafka event'inde gelen tek kullanımlık geçici bileti (KeyToken)
    .NET API'nin In-Memory anahtar kasasına sorarak anahtarı sadece RAM'e çeker.
    Kafka'da veya diskte asla açık anahtar saklanmaz.
    """
    if not key_token:
        return ""
    try:
        url = f"{settings.INTERNAL_API_URL}/api/internal/keys/consume"
        resp = requests.post(url, json={"KeyToken": key_token}, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            api_key = data.get("ApiKey") or data.get("apiKey") or data.get("key") or ""
            if api_key:
                print(f"[AI Service] 🔑 Ephemeral API Key başarıyla RAM'e çekildi (Token: {key_token[:8]}..., Uzunluk: {len(api_key)} karakter)")
            else:
                print(f"[AI Service] ⚠️ Kasadan anahtar çözülemedi (Boş yanıt alındı)")
            return api_key
        else:
            print(f"[AI Service] ⚠️ Geçici bilet doğrulanamadı ({resp.status_code}): {key_token}")
            return ""
    except Exception as e:
        print(f"[AI Service] ⚠️ Dahili anahtar kasasına erişilemedi ({settings.INTERNAL_API_URL}): {e}")
        return ""

def resolve_best_gemini_model(api_key: str) -> str:
    """
    Kullanıcının API anahtarının yetkili olduğu en güncel ve hızlı Gemini Flash modelini otomatik tespit eder.
    Google eski model isimlerini (örn: gemini-1.5-flash) v1beta'dan emekli ettiği için
    hesabın erişebildiği en iyi flash modelini dinamik seçer.
    """
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            models = [
                m["name"].replace("models/", "")
                for m in data.get("models", [])
                if "generateContent" in m.get("supportedGenerationMethods", [])
            ]
            print(f"[AI Service] 📋 Hesabın erişebildiği Gemini modelleri: {models}")
            
            # Tercih sıralaması: Google'ın resmi olarak önerdiği en güncel flash modeller
            preferences = [
                "gemini-3.8-flash",
                "gemini-3.7-flash",
                "gemini-3.6-flash",
                "gemini-3.5-flash",
                "gemini-3.1-flash-lite",
                "gemini-3-flash-preview",
                "gemini-flash-latest",
            ]
            for pref in preferences:
                if pref in models:
                    print(f"[AI Service] 🎯 Seçilen optimum Gemini modeli: {pref}")
                    return pref
            
            flash_models = [m for m in models if "flash" in m.lower() and "2.5" not in m and "1.5" not in m]
            if flash_models:
                print(f"[AI Service] 🎯 Seçilen ilk uygun flash modeli: {flash_models[0]}")
                return flash_models[0]
            if models:
                print(f"[AI Service] 🎯 Seçilen genel Gemini modeli: {models[0]}")
                return models[0]
        else:
            print(f"[AI Service] ⚠️ Gemini model listesi alınamadı ({resp.status_code}): {resp.text[:100]}")
    except Exception as e:
        print(f"[AI Service] ⚠️ Gemini model listesi sorgulanırken hata: {e}")
    
    return "gemini-3.8-flash"

def get_llm_instance(model_name: str = "llama3", custom_api_key: str = ""):
    """
    Kullanıcının seçtiği modele göre uygun LangChain ChatModel nesnesini döndürür:
    - 🦙 Llama 3 (Yerel Ollama - Ücretsiz)
    - 💻 Qwen 2.5 Coder 7B (Yerel Ollama - Ücretsiz)
    - ⚡ Google Gemini Flash (Entegre Bulut - Ücretsiz)
    - 🚀 Groq Llama 3.3 70B (Entegre Bulut - Ücretsiz)
    - ⚡ OpenAI GPT-4o / GPT-4o-mini (BYOK)
    - 🧠 Anthropic Claude 3.5 Sonnet (BYOK)
    """
    model_lower = (model_name or "llama3").lower().strip()

    # 1. Google Gemini Flash (Entegre Bulut & Ücretsiz Tier)
    if "gemini" in model_lower:
        from langchain_google_genai import ChatGoogleGenerativeAI
        key = custom_api_key or settings.GEMINI_API_KEY
        if not key:
            raise ValueError(
                "Google Gemini için API anahtarı bulunamadı. "
                "Lütfen sistem yöneticisinin .env dosyasına GEMINI_API_KEY eklemesini sağlayın "
                "veya kendi Google AI Studio anahtarınızı girin."
            )
        resolved_model = resolve_best_gemini_model(key)
        print(f"[AI Service] ⚡ Google Gemini ({resolved_model}) modeli başlatılıyor...")
        return ChatGoogleGenerativeAI(
            model=resolved_model,
            google_api_key=key,
            temperature=0.2
        ), f"Google Gemini ({resolved_model})"

    # 2. Groq Llama 3.3 70B (Ultra Hızlı Çıkarım & Ücretsiz Tier)
    elif "groq" in model_lower:
        from langchain_groq import ChatGroq
        key = custom_api_key or settings.GROQ_API_KEY
        if not key:
            raise ValueError(
                "Groq Llama 3.3 70B için API anahtarı bulunamadı. "
                "Lütfen sistem yöneticisinin .env dosyasına GROQ_API_KEY eklemesini sağlayın "
                "veya kendi Groq API anahtarınızı girin."
            )
        print("[AI Service] 🚀 Groq Llama 3.3 70B Versatile modeli başlatılıyor...")
        return ChatGroq(
            model_name="llama-3.3-70b-versatile",
            groq_api_key=key,
            temperature=0.2
        ), "Groq Llama 3.3 70B"

    # 3. Qwen 2.5 Coder 7B (Yerel Ollama - Ücretsiz & Sınırsız)
    elif "qwen" in model_lower:
        print("[AI Service] 💻 Yerel Ollama Qwen 2.5 Coder (qwen2.5-coder:7b) başlatılıyor...")
        return ChatOllama(
            model="qwen2.5-coder:7b",
            base_url=settings.OLLAMA_BASE_URL,
            num_ctx=settings.OLLAMA_NUM_CTX,
            num_gpu=settings.OLLAMA_NUM_GPU,
            temperature=0.2
        ), "Qwen 2.5 Coder 7B (Yerel)"

    # 4. OpenAI GPT-4o / GPT-4o-mini (BYOK)
    elif "gpt" in model_lower or "openai" in model_lower:
        from langchain_openai import ChatOpenAI
        key = custom_api_key or settings.OPENAI_API_KEY
        if not key:
            raise ValueError("OpenAI modelleri için API anahtarı gereklidir. Lütfen geçerli bir OpenAI API Key girin.")
        
        target_model = "gpt-4o" if "gpt-4o" in model_lower else "gpt-4o-mini"
        print(f"[AI Service] ⚡ OpenAI ({target_model}) modeli başlatılıyor...")
        return ChatOpenAI(
            model=target_model,
            api_key=key,
            temperature=0.2
        ), f"OpenAI {target_model.upper()}"

    # 5. Anthropic Claude 3.5 Sonnet (BYOK)
    elif "claude" in model_lower or "anthropic" in model_lower:
        from langchain_anthropic import ChatAnthropic
        key = custom_api_key or settings.ANTHROPIC_API_KEY
        if not key:
            raise ValueError("Claude modeli için API anahtarı gereklidir. Lütfen geçerli bir Anthropic API Key girin.")
        
        print("[AI Service] 🧠 Anthropic Claude 3.5 Sonnet modeli başlatılıyor...")
        return ChatAnthropic(
            model="claude-3-5-sonnet-20241022",
            api_key=key,
            temperature=0.2
        ), "Claude 3.5 Sonnet"

    # 6. Varsayılan / Yerel: Ollama Llama 3 8B
    else:
        print(f"[AI Service] 🦙 Yerel Ollama Llama 3 ({settings.OLLAMA_LLM_MODEL}) modeli başlatılıyor...")
        return ChatOllama(
            model=settings.OLLAMA_LLM_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
            num_ctx=settings.OLLAMA_NUM_CTX,
            num_gpu=settings.OLLAMA_NUM_GPU,
            temperature=0.2,
            top_p=0.9,
            repeat_penalty=1.20,
            repeat_last_n=256,
            stop=["<|eot_id|>", "<|end_of_text|>"]
        ), "Llama 3 (Yerel)"

def extract_severity(response_text: str) -> str:
    """
    LLM analiz çıktısını tarayarak koddaki en yüksek zafiyet düzeyini belirler.
    Öncelik Sıralaması: Kritik > Yüksek > Orta > Düşük
    """
    if not isinstance(response_text, str):
        response_text = str(response_text)

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
    model_name = event_data.model or "llama3"
    key_token = event_data.key_token

    # Yerel modeller (Llama 3, Qwen) asla key token aramaz ve tüketmeye çalışmaz
    model_clean = (model_name or "llama3").lower().strip()
    is_local_model = model_clean in ["llama3", "llama"] or model_clean.startswith("qwen")
    custom_api_key = resolve_ephemeral_api_key(key_token) if (key_token and not is_local_model) else ""

    print(f"\n[AI Service] 📥 {file_name} dosyası MinIO'dan indiriliyor... (Kullanıcı ID: {user_id} | Şirket ID: {tenant_id} | Model: {model_name})")

    # 1. Gerçek dosyayı MinIO'dan çek.
    try:
        document_text = get_file_from_minio(object_key)
        print("[AI Service] Dosya içeriği başarıyla okundu!")
    except Exception as e:
        err = f"Dosya depolama alanından okunamadı: {str(e)}"
        print(f"[AI Service] ❌ {err}")
        send_analysis_failure(file_id, err, model_name)
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
            
            # Dinamik Çoklu Model Yükleyici (Llama 3 / Qwen 2.5 / Gemini / Groq / GPT-4o / Claude)
            llm, model_display_name = get_llm_instance(model_name, custom_api_key)
            
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
            
            print(f"[AI Service] {detected_language} dosyası için {model_display_name} ile kodsuz, açıklayıcı ve %100 Türkçe analiz yapılıyor...")

            response = llm.invoke(messages)
            raw_content = response.content
            if isinstance(raw_content, list):
                text_parts = []
                for part in raw_content:
                    if isinstance(part, dict) and "text" in part:
                        text_parts.append(part["text"])
                    elif isinstance(part, str):
                        text_parts.append(part)
                raw_content = "\n".join(text_parts) if text_parts else str(raw_content)
            elif not isinstance(raw_content, str):
                raw_content = str(raw_content)

            print(f"\nAI Cevabı ({model_display_name}):\n{raw_content}")

            # Dinamik Zafiyet Düzeyi Tespiti
            detected_severity = extract_severity(raw_content)
            print(f"[AI Service] 🎯 Tespit Edilen Zafiyet Düzeyi: {detected_severity} (Model: {model_display_name})")
            
            # Analiz Bitti -> Sonucu Kafka'ya Geri Gönder
            result_event = AnalysisCompletedEvent(
                FileId=file_id, 
                Severity=detected_severity, 
                AiSuggestion=raw_content,
                ModelUsed=model_display_name
            )
            send_analysis_result(result_event)
    except Exception as e:
        err_str = str(e)
        if "not found" in err_str.lower() and "qwen" in err_str.lower():
            friendly_err = "Yerel Ollama üzerinde 'qwen2.5-coder:7b' modeli yüklü değil. Terminalinizde 'ollama run qwen2.5-coder:7b' çalıştırarak modeli indirin veya Ayarlar sayfasından hazır olan 'Llama 3' modelini seçin."
        elif "not found" in err_str.lower() and "llama" in err_str.lower():
            friendly_err = "Yerel Ollama üzerinde 'llama3' modeli yüklü değil. Terminalinizde 'ollama run llama3' çalıştırarak modeli indirin."
        elif "connection refused" in err_str.lower() or "11434" in err_str:
            friendly_err = "Ollama servisine bağlanılamadı. Lütfen Ollama uygulamasının arka planda çalıştığından emin olun."
        else:
            friendly_err = f"Yapay zeka analiz hatası: {err_str}"

        print(f"[AI Service] ❌ {friendly_err}")
        send_analysis_failure(file_id, friendly_err, model_name)

    print("[AI Service] İşlem tamamlandı!\n")