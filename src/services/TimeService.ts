import { database } from '../firebase';
import { serverTimestamp, ref, get } from 'firebase/database';

/**
 * Zaman ile ilgili işlemleri yöneten servis
 */
class TimeService {
  // Singleton yapısı
  private static instance: TimeService;
  
  private constructor() {}
  
  public static getInstance(): TimeService {
    if (!TimeService.instance) {
      TimeService.instance = new TimeService();
    }
    return TimeService.instance;
  }
  
  /**
   * Firebase sunucu zamanını alır
   * @returns Şu anki zamanı döndürür
   */
  public async getCurrentTime(): Promise<Date> {
    try {
      // Firebase'e şu anki zamanı isteyen bir ref oluştur
      const timeRef = ref(database, '.info/serverTimeOffset');
      const snapshot = await get(timeRef);
      
      if (snapshot.exists()) {
        // Sunucu zamanı ile yerel saat arasındaki farkı al
        const offset = snapshot.val() || 0;
        // Şu anki zamanı ve sunucu zaman farkını hesapla
        const now = new Date(Date.now() + offset);
        console.log('Firebase sunucu zamanı:', now);
        return now;
      } else {
        // Firebase zamanı alınamazsa yerel zamanı kullan
        console.warn('Firebase sunucu zamanı alınamadı, yerel zaman kullanılıyor');
        return new Date();
      }
    } catch (error) {
      console.error('Zaman alınırken hata oluştu:', error);
      // Hata durumunda yerel zamanı döndür
      return new Date();
    }
  }
  
  /**
   * Belirli bir saatin geçip geçmediğini kontrol eder
   * @param timeString "14:30" formatında zaman
   * @returns Zaman geçtiyse true, geçmediyse false
   */
  public async isTimePassed(timeString: string): Promise<boolean> {
    try {
      // Zaman formatını ayrıştır (14:30 gibi)
      const parts = timeString.split(':');
      const hour = parseInt(parts[0], 10);
      const minute = parseInt(parts[1], 10);
      
      // Şu anki zamanı al
      const now = await this.getCurrentTime();
      
      // Karşılaştırılacak zamanı oluştur
      const taskTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute
      );
      
      // Şu anki zaman, görev zamanından sonra mı kontrol et
      return now > taskTime;
    } catch (error) {
      console.error('Zaman kontrolü yapılamadı:', error);
      return false;
    }
  }
  
  /**
   * Bir zamanın yaklaşıp yaklaşmadığını kontrol eder
   * @param timeString "14:30" formatında zaman
   * @param toleranceMinutes Tolerans süresi (dakika)
   * @returns Zaman yaklaşıyorsa true, yaklaşmıyorsa false
   */
  public async isTimeApproaching(timeString: string, toleranceMinutes: number): Promise<boolean> {
    try {
      // Zaman formatını ayrıştır (14:30 gibi)
      const parts = timeString.split(':');
      const hour = parseInt(parts[0], 10);
      const minute = parseInt(parts[1], 10);
      
      // Şu anki zamanı al
      const now = await this.getCurrentTime();
      
      // Karşılaştırılacak zamanı oluştur
      const taskTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute
      );
      
      // Tolerans başlangıcını hesapla (görevden önce)
      const toleranceStart = new Date(taskTime.getTime());
      toleranceStart.setMinutes(toleranceStart.getMinutes() - toleranceMinutes);
      
      // Şu anki zaman, tolerans başlangıcı ile görev zamanı arasında mı kontrol et
      return now > toleranceStart && now < taskTime;
    } catch (error) {
      console.error('Zaman yaklaşma kontrolü yapılamadı:', error);
      return false;
    }
  }
  
  /**
   * Bugünün tarihini YYYY-MM-DD formatında döndürür
   * @returns YYYY-MM-DD formatında tarih
   */
  public getTodayDateKey(): string {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');
  }
  
  /**
   * Zaman string'ini DateTime objesine dönüştürür (bugünün tarihi ile)
   * @param timeString "14:30" formatında zaman
   * @returns DateTime objesi
   */
  public timeStringToDateTime(timeString: string): Date {
    const parts = timeString.split(':');
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute
    );
  }
}

// Singleton olarak dışa aktar
export default TimeService.getInstance(); 