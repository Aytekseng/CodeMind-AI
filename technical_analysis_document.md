# Teknik Analiz Dökümanı: AI Destekli Kod ve Doküman İnceleme Platformu (SaaS)

> [!NOTE]
> Bu doküman, yapay zeka destekli çok kiracılı (multi-tenant) bir kod ve doküman inceleme platformunun teknik gereksinimlerini, mimari tasarımını ve teknoloji yığınını tanımlamaktadır.

## 1. Genel Bakış ve Kapsam

**Proje Adı:** CodeMind AI (Örnek İsim)  
**Amacı:** Şirketlerin ve yazılım ekiplerinin kod depolarını ve dokümanlarını güvenli bir şekilde yükleyebildiği, yapay zeka RAG (Retrieval-Augmented Generation) mimarisi kullanılarak statik kod analizi, güvenlik açığı tespiti ve otomatik doküman özetleme işlemlerinin yapıldığı bir SaaS (Hizmet olarak Yazılım) platformu.

## 2. Sistem Mimarisi

Uygulama, yüksek erişilebilirlik ve asenkron veri işleme gereksinimleri nedeniyle **Mikroservis Yönelimli (veya Modüler Monolit) Mimari** ve **Olay Güdümlü (Event-Driven) Mimari** prensiplerine göre tasarlanacaktır.

### 2.1. Yüksek Seviye Mimari (Mermaid)

```mermaid
graph TD
    A[Kullanıcı / İstemci (React Web App)] -->|HTTPS / WSS| B(API Gateway / Load Balancer)
    B --> C{Core API Service}
    B --> D[WebSocket Service <br> Real-time bildirimler]
    
    C -->|Dosya Meta Verisi| E[(PostgreSQL <br> İlişkisel DB)]
    C -->|Dosya Upload| F[(Object Storage <br> S3 / MinIO)]
    
    C -->|Job Event <br> 'Dosya Yüklendi'| G[Message Broker <br> RabbitMQ / Redis PubSub]
    
    G --> H[AI Worker Service <br> Asenkron İşleyici]
    
    H <-->|Dosya İndirme| F
    H -->|Chunking & Embedding| I[LLM Provider API <br> OpenAI / Llama]
    H -->|Vektör Kaydı / Sorgulama| J[(Vector Database <br> PgVector / Pinecone)]
    H -->|Analiz Sonucu Kaydı| E
    H -->|Job Tamamlandı Eventi| G
    
    G -->|Bildirim İletimi| D
```

### 2.2. Mimari Bileşenlerin Rolleri
*   **API Gateway / Core API:** İstemciden gelen HTTP isteklerini karşılar, kimlik doğrulamayı (Auth) yapar ve ilişkisel veritabanı (Kullanıcılar, Şirketler, Projeler) ile konuşur.
*   **Message Broker (RabbitMQ):** Yüklenen dosyaların analiz işlemi uzun süreceğinden (bazen dakikalarca), istekler kuyruğa alınır. Bu, sistemin çökmesini engeller.
*   **AI Worker Service:** Kuyruktan işi alır, dosyayı nesne depolamadan çeker, parçalara böler (chunking), OpenAI API'sine gönderip embedding'leri alır ve Vektör DB'ye yazar. Analiz bittiğinde sonuçları DB'ye işler.
*   **Vector Database:** Kodun semantik (anlamsal) aranabilmesi için vektörleri tutar.

## 3. Teknoloji Yığını (Tech Stack)

> [!TIP]
> Performans, geliştirme hızı ve AI ekosistemine uygunluk göz önüne alınarak aşağıdaki teknolojiler seçilmiştir.

*   **Frontend:** React, Next.js (SEO ve hızlı yükleme için), Tailwind CSS (Hızlı stilizasyon), Monaco Editor (Kod görüntüleme ve diff için).
*   **Backend:** 
    *   **Core API:** .NET 8 (C#) veya Spring Boot (Java) - Kurumsal SaaS ve Multi-tenant yönetimi için en güçlü framework'ler. 
    *   **Worker Service:** Python (FastAPI veya Celery tabanlı) - AI kütüphaneleri (LangChain, LlamaIndex) Python'da çok daha olgun olduğu için worker servisinin Python olması büyük avantaj sağlar.
*   **Veritabanları:** 
    *   *İlişkisel:* PostgreSQL (Tenant ayrımı, kullanıcılar, analiz sonuçları).
    *   *Vektör:* PgVector (PostgreSQL eklentisi olarak, mimariyi basitleştirmek için) veya Pinecone.
    *   *Önbellek & Mesaj Kuyruğu:* Redis ve RabbitMQ.
*   **Depolama:** AWS S3 (veya lokal geliştirme için MinIO).

## 4. Veritabanı ve Multi-Tenancy Stratejisi

Güvenlik (Security) bu projenin en kritik noktasıdır. Şirketlerin kaynak kodları işleneceği için veri sızıntısı kesinlikle engellenmelidir.

### Multi-Tenancy Modeli:
**Row-level İzolasyon (Satır Bazlı):** Maliyeti düşük tutmak için tüm veriler aynı veritabanında tutulacak, ancak PostgreSQL'in "Row-Level Security (RLS)" özelliği kullanılarak her sorguya `tenant_id` (Şirket ID) zorunlu tutulacaktır.

### Temel Şema Tasarımı:
1.  **Tenants (Şirketler):** `id`, `name`, `subscription_tier`
2.  **Users:** `id`, `tenant_id`, `email`, `password_hash`, `role`
3.  **Projects / Repositories:** `id`, `tenant_id`, `name`, `language`
4.  **Documents / Source_Files:** `id`, `project_id`, `file_name`, `storage_url`, `status (PENDING, PROCESSING, COMPLETED)`
5.  **Analysis_Reports:** `id`, `file_id`, `severity`, `line_number`, `ai_suggestion`, `original_code`

## 5. RAG (Retrieval-Augmented Generation) Akışı

> [!IMPORTANT]
> Uygulamanın "Akıllı" olmasını sağlayan temel iş mantığı RAG mimarisidir.

1.  **Ingestion (Veri Alma):** Kullanıcı `UserService.java` dosyasını yükler.
2.  **Chunking (Parçalama):** AI Worker, bu dosyayı fonksiyon veya sınıf bazında mantıksal parçalara (chunk) böler.
3.  **Embedding (Vektörleştirme):** Her bir parça, LLM'in `text-embedding` modeline gönderilir ve [0.12, 0.45, -0.89...] gibi sayısal vektör dizilerine dönüştürülür.
4.  **Retrieval (Geri Çağırma - Sorgu):** Kullanıcı "Kullanıcı verilerini kaydederken SQL Injection açığı var mı?" diye sorduğunda, bu soru da vektöre çevrilir. Vektör DB'de kosinüs benzerliği (cosine similarity) ile koddaki en ilgili parçalar (örneğin SQL sorgusunun yapıldığı fonksiyon) bulunur.
5.  **Generation (Üretme):** Bulunan kod parçası ve kullanıcının sorusu büyük dil modeline (GPT-4) *Prompt* olarak gönderilir. Model bu bağlama (context) bakarak kesin ve halüsinasyonsuz bir güvenlik raporu üretir.

## 6. Güvenlik ve Uyumluluk

*   **Veri Gizliliği:** OpenAI API'si kullanılırken, verilerin model eğitiminde kullanılmaması için "Zero Data Retention" (Sıfır Veri Tutma) politikasına sahip Enterprise tier (Kurumsal seviye) API anlaşmaları yapılmalıdır.
*   **Geçici Depolama:** Yüklenen kod dosyaları analiz tamamlandıktan sonra obje depolamadan (S3) silinebilir, sadece vektör karşılıkları tutulabilir (Güvenlik hissiyatını artırır).
*   **Kimlik Doğrulama:** JWT (JSON Web Tokens) tabanlı, Role-Based Access Control (RBAC).

## 7. Dağıtım (Deployment) Stratejisi
Uygulama Docker container'ları halinde paketlenecek ve ölçeklenebilirlik için Kubernetes veya Docker Swarm üzerinde çalıştırılacaktır.
- AI Worker servisleri yatayda (horizontal) kolayca ölçeklenebilecek şekilde yapılandırılacaktır. Kuyruk (RabbitMQ) dolmaya başladığında Worker container sayısı otomatik artırılabilir.
