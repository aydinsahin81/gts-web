import { database, auth } from '../firebase';
import { ref, get, set, remove, update } from 'firebase/database';
import { format } from 'date-fns';
import { signInWithEmailAndPassword } from 'firebase/auth';
import TaskService from '../components/superadmin/TaskService';

// API güvenlik anahtarı - güvenlik için değiştirin!
const API_KEY = 'gts_secure_task_key_2023';

class TaskCheckerEndpoint {
  // Singleton pattern
  private static instance: TaskCheckerEndpoint;

  private constructor() {}

  public static getInstance(): TaskCheckerEndpoint {
    if (!TaskCheckerEndpoint.instance) {
      TaskCheckerEndpoint.instance = new TaskCheckerEndpoint();
    }
    return TaskCheckerEndpoint.instance;
  }

  // API anahtarını doğrula
  public validateApiKey(key: string): boolean {
    return key === API_KEY;
  }

  // Log mesajlarını saklamak için
  private logs: string[] = [];

  // Log mesajı ekle
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);

    // Sadece son 100 log mesajını sakla
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  // Son logları getir
  public getLogs(): string[] {
    return [...this.logs];
  }

  // Görev kontrolünü başlat
  public async runTaskChecker(apiKey: string): Promise<{success: boolean; message: string}> {
    try {
      // API anahtarını kontrol et
      if (!this.validateApiKey(apiKey)) {
        this.log('Yetkisiz erişim denemesi');
        return { success: false, message: 'Yetkisiz erişim' };
      }

      this.log('Görev kontrolü başlatılıyor...');

      // Arka planda çalışması için yapılandırma
      // Süper admin bilgileri
      const credentials = {
        email: 'superadmin@mt-teknoloji.com',
        password: 'Anadolu1234!'
      };

      // TaskService'i başlat
      const taskService = TaskService.getInstance();
      
      // İlerleme mesajlarını yakalamak için bir fonksiyon
      const updateProgress = (message: string) => {
        this.log(message);
      };

      // TaskService'i çalıştır
      await taskService.checkAllCompanies(updateProgress, credentials);

      this.log('Görev kontrolü başarıyla tamamlandı');
      return { success: true, message: 'Görev kontrolü başarıyla tamamlandı' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Görev kontrolü sırasında hata oluştu: ${errorMessage}`);
      return { success: false, message: `Hata: ${errorMessage}` };
    }
  }

  // Sağlık kontrolü
  public getHealth(): {status: string; timestamp: string} {
    return {
      status: 'up',
      timestamp: new Date().toISOString()
    };
  }
}

export default TaskCheckerEndpoint; 