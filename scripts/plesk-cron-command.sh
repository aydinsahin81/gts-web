#!/bin/bash
# Plesk cron için görev kontrolü komutu

# Çalışma dizinine git
cd /var/www/vhosts/gts.mt-teknoloji.com/httpdocs/gts-web

# Node.js versiyonunu kontrol et
echo "Node.js versiyonu:"
node -v

# Görev kontrolü scriptini çalıştır
echo "Görev kontrolü başlatılıyor..." 
node scripts/task-checker.js >> logs/task-checker.log 2>&1

# Script tamamlandı
echo "Görev kontrolü tamamlandı: $(date)" >> logs/task-checker.log 