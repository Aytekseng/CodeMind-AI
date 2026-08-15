import boto3
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_postgres import PGVector
from langchain_core.documents import Document

from schemas.events import FileUploadedEvent
from core.config import settings


def get_file_from_minio(object_key: str) -> str:
    """MinIO'dan dosyayı indirip içeriğini string olarak döndürür."""
    s3_client = boto3.client('s3',
                             endpoint_url = 'http://localhost:9000',
                             aws_access_key_id = 'admin',
                             aws_secret_access_key = 'adminpassword')
    response = s3_client.get_object(Bucket = 'codemind-uploads',Key = object_key)
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

def process_uploaded_file(event_data: FileUploadedEvent):
    # Kafka'dan gelen mesaj
    object_key = event_data.object_key
    file_name = event_data.file_name
    file_id = event_data.file_id

    print(f"\n[AI Service] {file_name} dosyası MinIO'dan indiriliyor...")

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

        # Test sorgusu
        query = "Güvenlik açığı var mı?"
        docs = vector_store.similarity_search(query, k=2)

        if docs:
            context = "\n\n".join([doc.page_content for doc in docs])
            llm = ChatOllama(model=settings.OLLAMA_LLM_MODEL,base_url=settings.OLLAMA_BASE_URL)
            prompt = f"Sen uzman bir yazılım analistisin. Verilen kodlarda güvenlik açığı var mı incele. \n\nKodlar:\n{context}\nSoru: {query}"
            print(f"[AI Service] Analiz yapılıyor...")
            response = llm.invoke(prompt)
            print(f"\nAI Cevabı:\n{response.content}")
    except Exception as e:
        print(f"[AI Service] Hata oluştu: {str(e)}")

    print("[AI Service] İşlem tamamlandı!\n")