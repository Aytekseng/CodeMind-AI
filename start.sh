#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -f .env ]; then cp .env.example .env; fi
for setting in JWT_SECRET WORKER_SECRET; do
    value="$(sed -n "s/^${setting}=//p" .env | tr -d '\r')"
    if [ "${#value}" -lt 32 ] || [[ "$value" == CodeMind_Super_Secret* ]]; then
        secret="$(openssl rand -hex 48)"
        temporary="$(mktemp)"
        awk -v key="$setting" -v val="$secret" 'BEGIN{done=0} $0 ~ "^"key"=" {print key"="val;done=1;next} {print} END{if(!done) print key"="val}' .env > "$temporary"
        cat "$temporary" > .env
        rm -f "$temporary"
    fi
done
chmod 600 .env
docker compose up -d --build --wait
printf '%s\n' 'CodeMind-AI: http://localhost:3000' 'İlk hesabınızı Kayıt Ol sayfasından oluşturun.' 'Yerel analiz için Ollama ve seçili model hazır olmalıdır.'
