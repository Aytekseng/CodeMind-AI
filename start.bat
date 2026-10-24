@echo off
chcp 65001 > nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\init-env.ps1
if errorlevel 1 exit /b 1
docker compose up -d --build --wait
if errorlevel 1 exit /b 1
echo CodeMind-AI: http://localhost:3000
echo Ilk hesabinizi Kayit Ol sayfasindan olusturun.
echo Yerel modeller icin Ollama calismali ve model indirilmis olmalidir.
pause
