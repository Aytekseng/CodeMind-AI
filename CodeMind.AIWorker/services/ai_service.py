from langchain_text_splitters import RecursiveCharacterTextSplitter
from litellm import completion
from schemas.events import FileUploadedEvent

def process_uploaded_file(event: FileUploadedEvent):
    """
    Bu fonksiyon dosya yüklendiğinde Kafka'dan alınan event ile tetiklenir.
    Dosyayı okuma, chunking (parçalama) ve LLM'e gönderme işlemleri burada yapılır.
    """
    print(f"\n[AI Service] {event.file_name} dosyası işleniyor...")

    # Örnek olarak dosyanın içinden okunan sahte bir metin varsayalım
    # Gerçek senaryoda event.file_path kullanılarak dosya diskten (veya S3'ten) okunmalıdır
    sample_document_text = "Bu çok uzun bir metin olduğunu varsayalım. " * 50

    # 1. Chunking (LangChain ile parçalama)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=200,   # Her parça yaklaşık 200 karakter olsun
        chunk_overlap=20  # Anlam bütünlüğü kopmasın diye 20 karakter üst üste binsin
    )
    
    chunks = text_splitter.split_text(sample_document_text)
    print(f"[AI Service] Dosya {len(chunks)} parçaya bölündü.")

    # 2. LLM İşlemi (LiteLLM ile)
    # litellm, "gpt-4o", "claude-3", "ollama/llama3" gibi yüzlerce modeli tek arayüzle destekler
    # Not: Kullanmadan önce .env dosyasına OPENAI_API_KEY (veya ilgili modelin anahtarını) eklemelisiniz.
    
    """
    print("[AI Service] LLM analizi başlatılıyor...")
    response = completion(
        model="gpt-3.5-turbo", # Burayı kendi modelinizle değiştirebilirsiniz
        messages=[
            {"role": "system", "content": "Sen kod inceleyen bir asistansın. Verilen metni özetle."},
            {"role": "user", "content": chunks[0]} # Sadece ilk parçayı örnek olarak yolluyoruz
        ]
    )
    
    print("[AI Service] LLM Cevabı:", response.choices[0].message.content)
    """
    print("[AI Service] İşlem tamamlandı!\n")
