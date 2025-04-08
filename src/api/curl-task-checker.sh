#!/bin/bash
# cPanel'den GTS uygulamasındaki API endpoint'i tetiklemek için cron script'i

# Log dosyası
LOG_FILE="/home/cpanelusername/gts_logs/task-checker.log"

# Log dizinini oluştur
mkdir -p "$(dirname "$LOG_FILE")"

# Log başlat
echo "Görev tetikleme başlatılıyor: $(date)" >> "$LOG_FILE"

# API anahtarı
API_KEY="gts_secure_task_key_2023"

# GTS web uygulaması URL'i
GTS_URL="https://gts.mt-teknoloji.com"

# curl ile API'yi çağır - 5 dakika timeout ekle
HTTP_STATUS=$(curl -s -o /tmp/curl_response.txt -w "%{http_code}" --max-time 300 "$GTS_URL/api/run-task-checker?key=$API_KEY")

# Yanıt içeriğini kaydet
RESPONSE=$(cat /tmp/curl_response.txt)

# HTTP durum kodunu kontrol et
if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "Görev tetikleme başarılı. HTTP Status: $HTTP_STATUS - $(date)" >> "$LOG_FILE"
  echo "Yanıt: $RESPONSE" >> "$LOG_FILE"
else
  echo "HATA: Görev tetikleme başarısız. HTTP Status: $HTTP_STATUS - $(date)" >> "$LOG_FILE"
  echo "Yanıt: $RESPONSE" >> "$LOG_FILE"
fi

echo "-------------------------------------------" >> "$LOG_FILE"

# Geçici dosyayı temizle
rm /tmp/curl_response.txt 