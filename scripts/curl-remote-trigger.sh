#!/bin/bash
# cPanel'den uzaktaki API'yi tetiklemek için cron script'i

# Log dosyası
LOG_FILE="/home/cpanelusername/gts_logs/remote-trigger.log"

# Log dizinini oluştur
mkdir -p "$(dirname "$LOG_FILE")"

# Log başlat
echo "Uzaktan görev tetikleme başlatılıyor: $(date)" >> "$LOG_FILE"

# API anahtarı
API_KEY="gts_secure_task_key_2023"

# Hedef sunucu API URL'i
API_URL="https://gts.mt-teknoloji.com/api/run-task-checker?key=$API_KEY"

# curl ile API'yi çağır
curl -s -o /dev/null -w "%{http_code}" "$API_URL" > /tmp/curl_status

# HTTP durum kodunu kontrol et
STATUS=$(cat /tmp/curl_status)
if [ "$STATUS" -eq 200 ]; then
  echo "Uzaktan görev tetikleme başarılı. HTTP Status: $STATUS - $(date)" >> "$LOG_FILE"
else
  echo "HATA: Uzaktan görev tetikleme başarısız. HTTP Status: $STATUS - $(date)" >> "$LOG_FILE"
fi

echo "-------------------------------------------" >> "$LOG_FILE"

# Geçici dosyayı temizle
rm /tmp/curl_status 