#!/usr/bin/env bash
set -e

echo "================================================================"
echo "          🛡️ CodeMind-AI Tek Tıkla Başlatıcı (Linux/macOS)       "
echo "================================================================"
echo ""

if [ ! -f ".env" ]; then
    echo "[*] .env dosyası bulunamadı, .env.example dosyasından kopyalanıyor..."
    cp .env.example .env
    echo "[+] .env dosyası oluşturuldu."
fi

echo "[*] Docker konteynerleri derleniyor ve arka planda başlatılıyor..."
docker compose up -d --build

echo ""
echo "================================================================"
echo "  ✅ CodeMind-AI Platformu Başarıyla Ayağa Kalktı!"
echo "================================================================"
echo ""
echo "  🌐 Frontend Arayüzü : http://localhost:3000"
echo "  🔌 Backend Swagger   : http://localhost:5083/swagger"
echo "  📊 Kafka UI          : http://localhost:8081"
echo "  📦 MinIO Konsolu     : http://localhost:9001 (minioadmin / minioadmin)"
echo "  🔍 Seq Log Konsolu   : http://localhost:5341"
echo ""
echo "  👤 Demo Giriş Bilgileri:"
echo "     - E-Posta : admin@codemind.ai"
echo "     - Parola  : Password123!"
echo ""
echo "================================================================"
