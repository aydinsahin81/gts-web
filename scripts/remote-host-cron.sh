#!/bin/bash
# Farklı sunucudaki GTS görev kontrolü için cron script'i

# Log başlat
echo "Uzaktan görev kontrolü başlatılıyor: $(date)" >> /home/cpanelusername/gts_logs/remote-task.log

# SSH ile uzak sunucuya bağlan ve komutu çalıştır
# NOT: SSH anahtarları ile kimlik doğrulama yapılandırılmalıdır (şifresiz giriş)
ssh username@gts.mt-teknoloji.com 'cd /var/www/vhosts/gts.mt-teknoloji.com/httpdocs/gts-web && node scripts/task-checker.js' >> /home/cpanelusername/gts_logs/remote-task.log 2>&1

# İşlem durumunu kontrol et
if [ $? -eq 0 ]; then
  echo "Uzaktan görev kontrolü başarıyla tamamlandı: $(date)" >> /home/cpanelusername/gts_logs/remote-task.log
else
  echo "HATA: Uzaktan görev kontrolü başarısız oldu: $(date)" >> /home/cpanelusername/gts_logs/remote-task.log
fi

echo "-------------------------------------------" >> /home/cpanelusername/gts_logs/remote-task.log 