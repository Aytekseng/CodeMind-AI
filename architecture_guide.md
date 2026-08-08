# CodeMind AI: Mimari Rehberi ve Çalışma Mantığı

Bu rehber, projenin mimarisini, özellikle daha önce deneyimlemediğiniz **Kafka (Mesaj Kuyruğu)** ve **Yapay Zeka (RAG) Entegrasyonu** kısımlarına odaklanarak, adım adım ve anlaşılır bir şekilde açıklamaktadır.

---

## 1. Neden Basit Bir Web Uygulaması Gibi Yapamıyoruz?

Klasik bir web uygulamasında akış şöyledir: İstemci bir istek atar, Sunucu (Backend) veritabanına bağlanır, işlemi yapar ve cevabı döner (genellikle milisaniyeler içinde).

Ancak AI destekli analiz sistemlerinde durum farklıdır. Kullanıcı 10.000 satırlık bir proje yüklediğinde, bu kodun yapay zeka tarafından okunması, parçalanması, vektörlere dönüştürülmesi ve dil modeli (örneğin OpenAI) tarafından incelenip raporlanması **dakikalar** sürebilir. 

Eğer bu işlemi doğrudan Core API (Ana Backend) üzerinden yapmaya çalışırsak:
1. Kullanıcının tarayıcısı dakikalarca bekler ve sonunda "Timeout (Zaman Aşımı)" hatası alır.
2. Core API kilitlenir; o sırada başka bir kullanıcı giriş yapmak istese bile sunucu cevap veremez.

İşte tam bu noktada **Kafka (veya RabbitMQ)** ve ayrı bir **AI Worker Service** devreye girer.

---

## 2. Kafka (Mesaj Kuyruğu) Nasıl Çalışır ve Bize Neden Lazım?

Kafka'yı bir postanenin "Kargolanacaklar Bölümü" gibi düşünebilirsiniz. Core API kargoyu (yapılacak işi) oraya bırakır ve yoluna devam eder. Kargocu (AI Worker) ise oradan kargoyu alıp işleme sokar.

### Temel Kavramlar:
*   **Producer (Üretici):** İşi (mesajı) Kafka'ya gönderen sistemdir. Bizim projemizde bu **Core API**'dir.
*   **Topic (Konu/Kanal):** Mesajların biriktiği kategorilerdir. Örneğin `kod-analiz-istekleri` diye bir Topic'imiz olur.
*   **Consumer (Tüketici):** Topic'leri dinleyen ve oradaki mesajları alıp işleyen sistemdir. Bizim projemizde bu **AI Worker Service**'tir.

### Bizim Projede Akış Nasıl Olacak?
1. Kullanıcı arayüzden dosyasını yükler.
2. **Core API** dosyayı alır, Amazon S3 (veya MinIO) gibi bir yere kaydeder.
3. **Core API**, veritabanına dosyanın durumunu `PENDING` (Beklemede) olarak kaydeder.
4. **Core API**, Kafka'daki `kod-analiz-istekleri` Topic'ine şu mesajı atar: *"145 numaralı şirketin, 350 ID'li dosyası sisteme yüklendi. S3 adresi şudur. Bunu analiz et."*
5. Core API, kullanıcıya hemen cevap döner: *"Dosyanız başarıyla alındı, analiz ediliyor."* (Kullanıcı hiç beklemez).
6. Arka planda çalışan **AI Worker**, Kafka'dan bu mesajı alır.
7. AI Worker, S3'ten dosyayı indirir ve ağır AI işlemlerine başlar.

---

## 3. Yapay Zeka (AI) ve RAG Entegrasyonu Nasıl Çalışır?

RAG (Retrieval-Augmented Generation), "Dil modeline kendi verilerimizi öğreterek cevap aldırtma" yöntemidir. GPT-4 veya Llama gibi modeller sizin şirketinize ait özel kodları bilmezler. Onlara kendi kodlarınızı anlatmanız gerekir.

Bu işlemi doğrudan koca bir projeyi GPT-4'e atarak yapamayız çünkü modelin bir "kelime (token) sınırı" vardır. 

### Adım Adım AI Akışı:

1. **Chunking (Parçalama):** 
   AI Worker, S3'ten indirdiği kodu mantıksal küçük parçalara (fonksiyonlar, sınıflar vs.) böler.
   *Örnek Parça:* `def login(user, pass): ...`

2. **Embedding (Vektörleştirme):**
   Yapay zeka metinden anlamaz, sayılardan anlar. AI Worker, her bir kod parçasını bir "Embedding API'sine" (örneğin OpenAI'ın `text-embedding-ada-002` modeline) gönderir. Model bize bu kod parçasının "anlamını" ifade eden uzun bir sayı dizisi (vektör) döner: `[0.12, 0.45, -0.89, ...]`

3. **Vektör Veritabanı (Vector DB):**
   Elde edilen bu vektörleri, ilişkisel bir veritabanına değil, matematikten anlayan bir **Vektör Veritabanına** (örneğin PostgreSQL PgVector eklentisi veya Pinecone) kaydederiz. Böylece, anlam olarak birbirine benzeyen kodları bulabiliriz.

4. **Sorgulama (Retrieval):**
   Kullanıcı "Kullanıcı verilerini kaydederken güvenlik açığı var mı?" diye sorduğunda (veya sistem otomatik analiz yaparken), biz bu soruyu da vektöre çeviririz. Vektör DB'ye şunu sorarız: *"Benim bu soruma matematiksel olarak (Cosine Similarity) en yakın olan 5 kod parçasını getir."* DB bize içinde SQL sorgularının veya şifreleme işlemlerinin olduğu kod parçalarını döndürür.

5. **Üretim (Generation):**
   Artık elimizde ne var? Kullanıcının sorusu ve bu soruyla alakalı spesifik kod parçaları. Bunların ikisini birleştirip (buna "Prompt" diyoruz) GPT-4 gibi bir modele göndeririz: 
   *"Aşağıdaki kod parçalarına bakarak, kullanıcı verileri kaydedilirken bir güvenlik açığı olup olmadığını söyle. Kod parçaları: [Sistemden çekilen parçalar]"*
   Model de bize net ve halüsinasyonsuz bir rapor üretir.

6. **Sonuçların Kaydı:**
   AI Worker bu raporu alır, Core DB'ye (PostgreSQL) yazar. İşi bittiği için Kafka'ya veya ayrı bir sisteme (örn. SignalR / WebSocket) *"Analiz Bitti"* eventi fırlatır ve Frontend'deki kullanıcıya gerçek zamanlı olarak "Analiziniz Hazır" bildirimi düşer.

---

## 4. İskeleti Oluşturma Yaklaşımı

Tüm bunları tek seferde yapmak karmaşıktır. Bu yüzden projeyi parçalara bölerek geliştireceğiz:

1. **Aşama (Core API ve DB):** Kafka veya AI olmadan, sadece kullanıcıların üye olabildiği, şirketlerin oluşturulduğu (Multi-tenancy RLS ile) ve basit CRUD (Ekle/Sil/Güncelle) işlemlerinin yapıldığı temel API'nin yazılması.
2. **Aşama (Mesajlaşma Altyapısı):** Kafka'nın (veya geliştirme ortamı için daha hafif olan RabbitMQ'nun) Docker ile ayağa kaldırılması ve Core API'nin sadece mesaj gönderebilir hale getirilmesi.
3. **Aşama (AI Worker):** Python ile ayrı bir servis oluşturulması. Bu servisin Kafka'dan mesajları alıp konsola yazdırması (şimdilik AI işlemi yapmadan, sadece kuyruk iletişimini doğrulamak için).
4. **Aşama (RAG Entegrasyonu):** Python Worker içerisine LangChain kütüphanesi eklenerek, OpenAI API ve Vektör DB (PgVector) bağlantılarının yapılıp asıl AI işlemlerinin kodlanması.

Bu şekilde karmaşıklığı soyutlayarak ve her bileşeni kendi içinde test ederek ilerleyebiliriz.
