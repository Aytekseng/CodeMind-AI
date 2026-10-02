@echo off
chcp 65001 > nul
echo ================================================================
echo           🛡️ CodeMind-AI Tek Tıkla Başlatıcı (Windows)
echo ================================================================
echo.

IF NOT EXIST ".env" (
    echo [*] .env dosyasi bulunamadi, .env.example dosyasindan olusturuluyor...
    copy .env.example .env > nul
    echo [+] .env dosyasi hazirlandi.
)

echo [*] Docker servisleri baslatiliyor ve derleniyor...
docker compose up -d --build

echo.
echo ================================================================
echo  ✅ CodeMind-AI Platformu Basariyla Ayaga Kalkti!
echo ================================================================
echo.
echo  🌐 Frontend Arayuzu : http://localhost:3000
echo  🔌 Backend Swagger   : http://localhost:5083/swagger
echo  📊 Kafka UI          : http://localhost:8081
echo  📦 MinIO Konsolu     : http://localhost:9001 (minioadmin / minioadmin)
echo  🔍 Seq Log Konsolu   : http://localhost:5341
echo.
echo  👤 Demo Giris Bilgileri:
echo     - E-Posta : admin@codemind.ai
echo     - Parola  : Password123!
echo.
echo ================================================================
pause
