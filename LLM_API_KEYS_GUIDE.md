# 🔑 CodeMind-AI | Yapay Zeka Modelleri & API Anahtarı Temin Rehberi

CodeMind-AI, hibrit bir yapay zeka mimarisi sunar. İster **tamamen ücretsiz ve çevrimdışı yerel modelleri**, ister **ücretsiz bulut modellerini**, isterseniz de **endüstri standardı ticari modelleri (BYOK)** tek tıkla kullanabilirsiniz.

Bu rehber, sistemde desteklenen tüm yapay zeka modelleri için API anahtarlarını **nereden ve nasıl ücretsiz temin edeceğinizi** adım adım açıklamaktadır.

---

## 📊 1. Desteklenen Modeller Özet Tablosu

| Model Adı | Sağlayıcı | Tür / Barındırma | Ücret Durumu | API Key Gerekir mi? | Temin Adresi |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **🦙 Llama 3 8B** | Meta / Ollama | Yerel (Cihazınızda) | **Tamamen Ücretsiz** | ❌ Hayır | Otomatik / Yerel Ollama |
| **💻 Qwen 2.5 Coder 7B** | Alibaba / Ollama | Yerel (Cihazınızda) | **Tamamen Ücretsiz** | ❌ Hayır | `ollama run qwen2.5-coder:7b` |
| **⚡ Gemini 3.8 Flash** | Google Cloud | Bulut API | BYOK (Google AI Key / Free Tier) | ✅ Evet | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| **🚀 Groq Llama 3.3 70B** | Groq LPU Cloud | Bulut API | **Ücretsiz Tier (300+ token/s)** | ✅ Evet | [Groq Cloud Console](https://console.groq.com/keys) |
| **🧠 OpenAI GPT-4o** | OpenAI | Bulut API | Ücretli / BYOK | ✅ Evet | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **🛡️ Claude 3.5 Sonnet** | Anthropic | Bulut API | Ücretli / BYOK | ✅ Evet | [Anthropic Console](https://console.anthropic.com/settings/keys) |

---

## 💻 2. Yerel Modeller (API Key Gerektirmez - %100 Ücretsiz & Çevrimdışı)

Bu modeller doğrudan kendi bilgisayarınızın GPU / CPU gücünü kullanır. Dış dünyaya hiçbir veri göndermez, internet bağlantısı gerektirmez ve API anahtarına ihtiyaç duymaz.

### 1) 🦙 Meta Llama 3 8B (Varsayılan Model)
- **Durum:** Sistemde önceden yapılandırılmıştır.
- **Kullanım:** Terminalinizde Ollama açık olduğu sürece hiçbir ayar yapmadan doğrudan kullanılabilir.
- Model bilgisayarınızda yoksa terminalden indirme komutu:
  ```powershell
  ollama run llama3
  ```

### 2) 💻 Qwen 2.5 Coder 7B
- **Durum:** Dünyanın en başarılı açık kaynak kod analiz modellerinden biridir.
- **Kurulum:** İlk kullanım öncesinde tek seferlik yerel Ollama motorunuza indirilmelidir:
  ```powershell
  ollama run qwen2.5-coder:7b
  ```
- İndirme tamamlandıktan sonra CodeMind-AI Ayarlar sayfasından Qwen 2.5 Coder'ı seçip doğrudan sıfır anahtarla kullanabilirsiniz.

---

## ⚡ 3. Bulut Modelleri & API Anahtarları (BYOK)

Kendi API anahtarınızı (Bring Your Own Key) girerek dünyanın en güçlü bulut yapay zeka modelleriyle derinlemesine güvenlik ve kod denetimi yapabilirsiniz.

### 1) ⚡ Google Gemini 3.8 Flash (Yeni Nesil Akıl Yürütme & Hızlı Çıkarım)
Google AI Studio veya Google Cloud Console üzerinden alacağınız API anahtarıyla Google'ın en yeni 3.8 nesil Flash modelini kullanabilirsiniz (Google AI Studio yeni hesaplara ücretsiz geliştirici kotası da sağlamaktadır).

**Adım Adım API Key Alma:**
1. [Google AI Studio](https://aistudio.google.com/app/apikey) sayfasına gidin.
2. Google hesabınızla giriş yapın.
3. Mavi renkli **"Create API key"** (API Anahtarı Oluştur) butonuna tıklayın.
4. Yeni bir proje seçin veya varsayılan projeyi onaylayıp anahtarı oluşturun.
5. Oluşan anahtarı kopyalayın (`AIzaSy...` formatında başlar).
6. CodeMind-AI arayüzünde **Ayarlar (`/settings`)** sayfasına girin, **Gemini 3.8 Flash** modelini seçin ve bu anahtarı yapıştırın.

---

### 2) 🚀 Groq Llama 3.3 70B (Ultra Hızlı 300+ Token/Saniye)
Groq LPU (Language Processing Unit) mimarisi sayesinde devasa 70 Milyar parametreli Llama 3.3 modelini neredeyse anında (sıfır gecikmeyle) çalıştırır. Bireysel kullanım için ücretsiz kota sunar.

**Adım Adım API Key Alma:**
1. [Groq Cloud Console](https://console.groq.com/keys) adresine gidin.
2. GitHub veya Google hesabınızla ücretsiz kayıt olun/giriş yapın.
3. Sol menüden **"API Keys"** sekmesine gelin.
4. **"Create API Key"** butonuna basıp bir isim verin (Örn: `CodeMind-AI`).
5. Ekrana gelen anahtarı kopyalayın (`gsk_...` formatında başlar).
6. CodeMind-AI arayüzünde **Ayarlar (`/settings`)** sekmesinden **Groq Llama 3.3 70B**'yi seçip anahtarınızı kaydedin.

---

## 🔑 4. Gelişmiş Ticari Modeller (BYOK - Kendi Anahtarınız)

Kendi OpenAI veya Anthropic bakiyenizi kullanarak kodlarınızı en güçlü küresel modellerle denetleyebilirsiniz.

### 1) 🧠 OpenAI GPT-4o / GPT-4o-mini
1. [OpenAI Platform API Keys](https://platform.openai.com/api-keys) sayfasına gidin.
2. Giriş yapıp **"Create new secret key"** butonuna tıklayın.
3. Anahtarınızı kopyalayın (`sk-proj-...` veya `sk-...`).
4. CodeMind-AI **Ayarlar** sayfasında **OpenAI GPT-4o** modelini seçip anahtarınızı yapıştırın.

### 2) 🛡️ Anthropic Claude 3.5 Sonnet
1. [Anthropic Console API Keys](https://console.anthropic.com/settings/keys) sayfasına gidin.
2. Hesabınıza giriş yapın ve **"Create Key"** butonuna tıklayın.
3. Anahtarınızı kopyalayın (`sk-ant-api03-...`).
4. CodeMind-AI **Ayarlar** sayfasında **Claude 3.5 Sonnet** modelini seçip anahtarınızı yapıştırın.

---

## 🔒 5. Güvenlik: Anahtarlarım Nasıl Korunuyor?

CodeMind-AI, kurumsal **Ephemeral In-Memory Vault (Uçucu RAM Kasası)** mimarisine sahiptir:
- Girdiğiniz API anahtarları sunucuda asla sabit diske, veritabanına ya da loglara yazılmaz.
- Kafka kuyruğunda açık metin olarak taşınmaz; yalnızca RAM üzerinde 90 saniye ömürlü tek kullanımlık biletlerle (`key_token`) korunur.
- Analiz bittiği an sunucu belleğinden kendini imha eder.
- Tarayıcınızda ise yalnızca sizin yerel tarayıcınızın `localStorage` alanında şifreli tutulur.

---

## ⚙️ 6. (Opsiyonel) Sunucu Genelinde Varsayılan Key Tanımlama

Eğer tüm kullanıcıların kendi anahtarını girmesini istemiyor, sunucu bazlı ortak bir anahtar sağlamak istiyorsanız projenin kök dizinindeki `.env` dosyasına anahtarları ekleyebilirsiniz:

```env
# .env dosyası
GEMINI_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Bu anahtarlar tanımlandığında, kullanıcılar arayüzden anahtar girmese dahi sistem otomatik olarak sunucu anahtarını devreye alacaktır.
