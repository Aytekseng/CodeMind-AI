from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.chat_models import ChatOllama
from langchain_postgres import PGVector
from langchain_postgres.vectorstores import PGVector
from langchain_core.documents import Document

from schemas.events import FileUploadedEvent
from core.config import settings

def get_vector_store():
    """
    PgVector bağlantısını ve koleksiyonunu ayarlar.
    """
    # Yerel Ollama Embedding modelini başlat (örn. nomic-embed-text)
    embeddings = OllamaEmbeddings(
        model=settings.OLLAMA_EMBEDDING_MODEL,
        base_url=settings.OLLAMA_BASE_URL
    )
    
    # Langchain Postgres vector store yapılandırması
    vector_store = PGVector(
        embeddings=embeddings,
        collection_name="codemind_documents_ollama",
        connection=settings.DATABASE_URL,
        use_jsonb=True,
    )
    return vector_store

def process_uploaded_file(event: FileUploadedEvent):
    """
    Bu fonksiyon dosya yüklendiğinde Kafka'dan alınan event ile tetiklenir.
    Dosyayı okuma, chunking (parçalama) ve Vektör DB'ye (PgVector) gönderme işlemleri burada yapılır.
    """
    print(f"\n[AI Service] {event.file_name} dosyası işleniyor...")

    sample_document_text = """
    def odeme_yap(kart_no, cvc):
        print("Ödeme işleniyor...")
        # Güvenlik açığı: Şifrelemeden kaydediyoruz
        db.save(kart_no)
        return True
    
    def urun_listele():
        return ["Telefon", "Bilgisayar"]
    """ * 10

    # 1. Chunking (LangChain ile parçalama)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=300,   
        chunk_overlap=50  
    )
    
    chunks = text_splitter.split_text(sample_document_text)
    print(f"[AI Service] Dosya {len(chunks)} parçaya bölündü.")
    
    documents = [
        Document(page_content=chunk, metadata={"file_name": event.file_name, "file_id": event.file_id})
        for chunk in chunks
    ]

    # 2. Embedding ve Vektör DB'ye (PgVector) Kayıt
    try:
        print(f"[AI Service] Vektörler {settings.OLLAMA_EMBEDDING_MODEL} ile oluşturuluyor ve PgVector'a kaydediliyor...")
        vector_store = get_vector_store()
        
        vector_store.add_documents(documents)
        print("[AI Service] Başarıyla veritabanına kaydedildi.")
        
        # 3. Test Amacıyla RAG Sorgusu Yapalım
        print("\n[AI Service] --- RAG TESTİ BAŞLIYOR (YEREL OLLAMA) ---")
        query = "Ödeme sayfasında kredi kartı numaraları nasıl saklanıyor?"
        print(f"Soru: {query}")
        
        # Veritabanından en alakalı 2 parçayı çekelim
        docs = vector_store.similarity_search(query, k=2)
        
        if docs:
            context = "\n\n".join([doc.page_content for doc in docs])
            
            # Yerel Llama 3 modeline soruyu ve bağlamı gönderelim
            llm = ChatOllama(
                model=settings.OLLAMA_LLM_MODEL, 
                base_url=settings.OLLAMA_BASE_URL
            )
            
            prompt = f"Sen uzman bir yazılım analistisin. Aşağıdaki kod parçalarına bakarak kullanıcının sorusunu cevapla. Kodda yoksa 'bilmiyorum' de.\n\nBağlam:\n{context}\n\nSoru: {query}"
            
            print(f"[AI Service] {settings.OLLAMA_LLM_MODEL} düşünmeye başladı... Lütfen bekleyin...")
            response = llm.invoke(prompt)
            print(f"\nAI Cevabı:\n{response.content}")
        else:
            print("Alakalı sonuç bulunamadı.")
            
        print("[AI Service] --- RAG TESTİ BİTTİ ---\n")

    except Exception as e:
        print(f"[AI Service] Ollama'ya bağlanırken veya işlem yaparken hata oluştu: {str(e)}")
        print("Lütfen Ollama'nın çalıştığından (localhost:11434) ve ilgili modelleri ('ollama pull llama3', 'ollama pull nomic-embed-text') indirdiğinizden emin olun.")

    print("[AI Service] İşlem tamamlandı!\n")
