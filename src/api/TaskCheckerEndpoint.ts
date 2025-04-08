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
  private async log(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);

    // Sadece son 100 log mesajını sakla
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
    
    try {
      // Firebase'e log kaydı eklemeyi dene
      const logRef = ref(database, 'system_logs/api_checker');
      
      // Kullanıcı oturum açık değilse ve API üzerinden erişilmişse, kimliği doğrula
      if (!auth.currentUser) {
        // Süper admin bilgileri
        const credentials = {
          email: 'superadmin@mt-teknoloji.com',
          password: 'Anadolu1234!'
        };
        
        try {
          // Oturum açmayı dene
          await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
        } catch (error) {
          console.error('Log yazarken oturum açılamadı:', error);
          // Oturum açma hatası logları engellemez, devam et
        }
      }
      
      // Timestamp'i key olarak kullan
      const key = `log_${Date.now()}`;
      await set(ref(database, `system_logs/api_checker/${key}`), {
        timestamp: timestamp,
        message: message,
        createdAt: Date.now()
      });
    } catch (error) {
      console.error('Firebase log yazma hatası:', error);
      // Log yazma hatası işlemi durdurmaz
    }
  }

  // Son logları getir
  public async getLogs(): Promise<string[]> {
    try {
      // Firebase'den sistem loglarını getir
      const logRef = ref(database, 'system_logs/api_checker');
      const snapshot = await get(logRef);
      
      if (snapshot.exists()) {
        const logs: string[] = [];
        const logData = snapshot.val();
        
        // Logları tarih sırasına göre sırala
        const sortedLogs = Object.entries(logData)
          .sort((a: any, b: any) => b[1].createdAt - a[1].createdAt)
          .slice(0, 100); // Son 100 logu al
          
        for (const [key, value] of sortedLogs) {
          const log = value as any;
          logs.push(`[${log.timestamp}] ${log.message}`);
        }
        
        return logs;
      }
      
      return [...this.logs]; // Bellekteki logları döndür
    } catch (error) {
      console.error('Firebase log okuma hatası:', error);
      return [...this.logs]; // Hata durumunda bellekteki logları döndür
    }
  }

  // Görev kontrolünü başlat
  public async runTaskChecker(apiKey: string): Promise<{success: boolean; message: string}> {
    try {
      // API anahtarını kontrol et
      if (!this.validateApiKey(apiKey)) {
        await this.log('Yetkisiz erişim denemesi');
        return { success: false, message: 'Yetkisiz erişim' };
      }

      await this.log('Görev kontrolü başlatılıyor...');

      // Arka planda çalışması için yapılandırma
      // Süper admin bilgileri
      const credentials = {
        email: 'superadmin@mt-teknoloji.com',
        password: 'Anadolu1234!'
      };

      // TaskService'i başlat
      const taskService = TaskService.getInstance();
      
      // İlerleme mesajlarını yakalamak için bir fonksiyon
      const updateProgress = async (message: string) => {
        await this.log(message);
      };

      // TaskService'i çalıştır
      await taskService.checkAllCompanies(updateProgress, credentials);

      await this.log('Görev kontrolü başarıyla tamamlandı');
      return { success: true, message: 'Görev kontrolü başarıyla tamamlandı' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.log(`Görev kontrolü sırasında hata oluştu: ${errorMessage}`);
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