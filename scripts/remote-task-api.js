// HTTP API ile GTS görev kontrolünü tetikleme
const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const app = express();
const fs = require('fs');
const path = require('path');

// Güvenlik anahtarı - bunu kendi değerinizle değiştirin
const API_KEY = 'gts_secure_task_key_2023';

// Log dizini oluştur
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Log dosyası
const logFile = path.join(logDir, 'task-api.log');

// Log fonksiyonu
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFile, logEntry);
  console.log(message);
}

// API endpoint'i
app.get('/api/run-task-checker', (req, res) => {
  // API anahtarını kontrol et
  const apiKey = req.query.key;
  
  if (!apiKey || apiKey !== API_KEY) {
    logMessage('Yetkisiz erişim denemesi');
    return res.status(401).json({ success: false, message: 'Yetkisiz erişim' });
  }
  
  logMessage('Görev kontrolü başlatılıyor...');
  
  // task-checker.js'yi çalıştır
  const scriptPath = path.join(__dirname, 'task-checker.js');
  exec(`node ${scriptPath}`, (error, stdout, stderr) => {
    if (error) {
      logMessage(`Hata oluştu: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Görev kontrolü sırasında hata oluştu', error: error.message });
    }
    
    if (stderr) {
      logMessage(`Standart hata: ${stderr}`);
    }
    
    logMessage(`Görev kontrolü tamamlandı: ${stdout}`);
    res.json({ success: true, message: 'Görev kontrolü başarıyla tamamlandı' });
  });
});

// Sağlık kontrolü endpoint'i
app.get('/api/health', (req, res) => {
  res.json({ status: 'up', timestamp: new Date().toISOString() });
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logMessage(`Görev kontrolü API sunucusu ${PORT} portunda çalışıyor`);
});

logMessage('Görev kontrolü API sunucusu başlatıldı'); 