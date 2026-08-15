# CodeMind AI: Frontend GitHub İş Akışı (Workflow) Stratejisi

Bu belge, CodeMind AI projesinin **Next.js (Frontend)** kısmını geliştirirken izleyeceğimiz parça parça (incremental) Git/GitHub yükleme stratejisini içermektedir. 

Arka plan (Backend) servisleri için oluşturduğumuz `github_workflow.md` stratejisinin devamı niteliğindedir. Frontend geliştirmelerini de tek bir büyük paket (big bang) yerine, atomik (küçük ve anlamlı) commit'ler ve özellik dalları (feature branches) ile GitHub'a yükleyeceğiz.

---

## Geliştirme Aşamalarına Göre "Branch" ve "Commit" Planı

Frontend geliştirme sürecini 4 ana aşamaya (branch) bölerek ilerleyeceğiz:

### Aşama 1: Proje Kurulumu ve İskelet
**Branch:** `feature/frontend-init`
* Commit 1: "chore: initialize Next.js app with Tailwind CSS"
* Commit 2: "chore: setup shadcn/ui and configure dark theme"
* Commit 3: "feat: create basic layout and sidebar navigation"
* **İşlem:** Bu branch `main` dalına birleştirilir (Merge / Pull Request).

### Aşama 2: Sürükle-Bırak Dosya Yükleme (Drag & Drop)
**Branch:** `feature/frontend-upload`
* Commit 1: "feat: build DragDropArea UI component"
* Commit 2: "feat: integrate file upload with C# DocumentController API"
* Commit 3: "fix: add file extension validation and error handling"
* **İşlem:** Bu branch `main` dalına birleştirilir.

### Aşama 3: Yükleme Ekranı ve SignalR Entegrasyonu
**Branch:** `feature/frontend-realtime`
* Commit 1: "feat: build LoadingTerminal animation component"
* Commit 2: "feat: setup @microsoft/signalr client hook (useSignalR)"
* Commit 3: "feat: display Toast notifications on AI analysis completion"
* **İşlem:** Bu branch `main` dalına birleştirilir.

### Aşama 4: Dashboard ve Etkileşimli Kod İnceleme
**Branch:** `feature/frontend-dashboard`
* Commit 1: "feat: build dashboard layout with Recharts charts"
* Commit 2: "feat: integrate react-syntax-highlighter for code diffs"
* Commit 3: "feat: render AI security vulnerabilities on code lines"
* **İşlem:** Bu branch `main` dalına birleştirilir.

---

## İzlenecek Adımlar (Git Komutları)

Frontend tarafında her yeni aşamaya başlarken terminalde şu adımları izleyeceğiz:

1. Ana kolda (main) olduğumuzdan ve en güncel kodu aldığımızdan emin olalım:
   ```bash
   git checkout main
   git pull origin main
   ```

2. O anki görev için (Örn: Aşama 1) yeni bir branch açalım:
   ```bash
   git checkout -b feature/frontend-init
   ```

3. `frontend` klasörü içindeki kodlamalar bittikçe değişiklikleri sahneye alalım:
   ```bash
   git add .
   ```

4. Anlamlı bir mesajla kaydedelim:
   ```bash
   git commit -m "chore: initialize Next.js app with Tailwind CSS"
   ```

5. Dalımızdaki görevler (Commit listesindeki maddeler) tamamen bittiğinde GitHub'a gönderelim:
   ```bash
   git push -u origin feature/frontend-init
   ```

6. GitHub üzerinden bu değişiklikleri `main` dalına aktarmak için bir **Pull Request (PR)** açıp birleştirme (Merge) işlemini tamamlayalım.

Bu strateji sayesinde frontend'i parça parça, test ederek ve güvenle inşa etmiş olacağız.
