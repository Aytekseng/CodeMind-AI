import os
import sys

# Çalışma dizinini projenin köküne ayarlayalım ki modüller rahat bulunsun
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from kafka_utils.consumer import start_consuming

def main():
    print("🚀 CodeMind AI Worker başlatılıyor...")
    # Tüketici döngüsünü (Consumer Loop) başlatır
    start_consuming()

if __name__ == "__main__":
    main()
