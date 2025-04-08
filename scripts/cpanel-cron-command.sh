#!/bin/bash
# cPanel cron için görev kontrolü komutu

# Çalışma dizinine git - cPanel için yolu güncelliyoruz
# cPanel genelde şu formatta bir yol kullanır: /home/kullaniciadi/public_html
cd /home/mtgtsapp/public_html/gts-web

# Gerekirse NVM veya Node.js sürümünü ayarla (cPanel'de genelde gerekir)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # NVM yükleyici

# Eğer NVM kullanıyorsanız, doğru Node.js sürümünü aktifleştirin
# nvm use 16  # Örnek: Node.js v16 kullan

# Node.js versiyonunu kontrol et
echo "Node.js versiyonu: $(node -v)" >> logs/task-checker.log

# Görev kontrolü scriptini çalıştır
echo "Görev kontrolü başlatılıyor: $(date)" >> logs/task-checker.log
node scripts/task-checker.js >> logs/task-checker.log 2>&1

# Script tamamlandı
echo "Görev kontrolü tamamlandı: $(date)" >> logs/task-checker.log
echo "-------------------------------------------" >> logs/task-checker.log 