# CodeMind AI: GitHub İş Akışı (Workflow) Stratejisi

Büyük projeleri GitHub'a tek seferde "ilk sürüm" (big bang) olarak yüklemek yerine **parça parça (incremental)** yüklemek, hem hata takibini kolaylaştırır hem de ilerlemeyi adım adım görmenizi sağlar. 

Bu dökümanda CodeMind AI projesini geliştirirken izleyeceğimiz parça parça yükleme stratejisi anlatılmaktadır.

## 1. Temel Kural: Atomik Commit'ler ve Feature Branch'ler

Her bir commit (kayıt noktası) kendi içinde anlamlı, çalışan ve tek bir işe odaklanan en küçük parça olmalıdır (Atomik Commit). Ayrıca tüm geliştirmeyi doğrudan ana kolda (`main`) yapmak yerine her bir görev için ayrı bir dal (`branch`) açıp, o görev bitince ana kola birleştireceğiz.

## 2. Geliştirme Aşamalarına Göre Örnek "Branch" ve "Commit" Planı

Mimari rehberde bahsettiğimiz aşamaları Git stratejisine şu şekilde yedireceğiz:

### Aşama 1: Core API & Veritabanı
1. **Branch:** `feature/core-api-init`
   * Commit 1: "chore: initialize .NET API project skeleton"
   * Commit 2: "feat: add domain entity models (User, Tenant, Project)"
   * Commit 3: "feat: configure PostgreSQL and EF Core db context"
   * Commit 4: "feat: generate initial database migrations"
   * **İşlem:** Bu branch `main` dalına birleştirilir (Pull Request ile).

2. **Branch:** `feature/core-api-auth`
   * Commit 1: "feat: implement JWT authentication infrastructure"
   * Commit 2: "feat: configure Row-Level Security (RLS)"
   * **İşlem:** Bu branch `main` dalına birleştirilir.

### Aşama 2: Mesajlaşma Altyapısı (Kafka / RabbitMQ)
1. **Branch:** `feature/messaging-setup`
   * Commit 1: "chore: add docker-compose.yml for Kafka/RabbitMQ"
   * Commit 2: "feat: implement message producer in Core API"
   * **İşlem:** Bu branch `main` dalına birleştirilir.

### Aşama 3: AI Worker Servisi
1. **Branch:** `feature/ai-worker-init`
   * Commit 1: "chore: initialize Python worker project and requirements"
   * Commit 2: "feat: implement Kafka consumer in Python worker"
   * **İşlem:** Bu branch `main` dalına birleştirilir.

### Aşama 4: RAG Entegrasyonu
1. **Branch:** `feature/rag-integration`
   * Commit 1: "feat: implement file reading and chunking logic"
   * Commit 2: "feat: integrate OpenAI for text embeddings"
   * Commit 3: "feat: implement vector storage and similarity search with PgVector"
   * Commit 4: "feat: generate RAG response via LLM and save results"
   * **İşlem:** Bu branch `main` dalına birleştirilir.

## 3. İzlenecek Adımlar (Git Komutları)

Her yeni aşamaya (veya göreve) başlarken izlemeniz gereken rutin şu şekilde olmalıdır:

1. Ana kolda olduğunuzdan ve en güncel kodu aldığınızdan emin olun:
   ```bash
   git checkout main
   git pull origin main
   ```

2. Yeni yapacağınız iş için bir dal (branch) açın ve ona geçin:
   ```bash
   git checkout -b feature/gorevin-kisa-adi
   ```

3. Kodunuzu yazın, sadece bir parçayı bitirin ve değişiklikleri sahneye alın (add):
   ```bash
   git add .
   ```

4. Anlamlı bir mesajla kaydedin (commit):
   ```bash
   git commit -m "feat: add user login endpoint"
   ```

5. Eğer dalda başka işleriniz varsa kodlamaya devam edip tekrar add/commit yapın. Dalınızdaki işler tamamen bittiğinde GitHub'a gönderin:
   ```bash
   git push -u origin feature/gorevin-kisa-adi
   ```

6. GitHub üzerinden bu değişiklikleri `main` dalına aktarmak için bir **Pull Request (PR)** açın ve birleştirin (Merge). İşlem bitince 1. adıma dönerek sıradaki göreve başlayın.

## Özet
Bu yöntem sayesinde, ileride "Mesajlaşma sistemini kurduğumuz yerde bir hata var" dediğimizde, yüzlerce dosya arasında kaybolmak yerine doğrudan `feature/messaging-setup` branch'ine ait küçük commitleri inceleyerek sorunu saniyeler içinde tespit edebiliriz. Ayrıca siz de projeyi adım adım geliştirmenin rahatlığını yaşarsınız.
