import { database } from '../firebase';
import { serverTimestamp, ref, get, set, update } from 'firebase/database';

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

  /**
   * Belirli bir tarihe ait haftanın gününü belirler
   * @param date Tarih objesi
   * @returns 0-6 arasında gün numarası (0=Pazar, 1=Pazartesi, ...)
   */
  public getDayOfWeek(date: Date): number {
    return date.getDay(); // 0=Pazar, 1=Pazartesi, ... 6=Cumartesi
  }

  /**
   * Belirli bir tarih için oluşturulmuş tarih anahtarını döndürür
   * @param date Tarih objesi
   * @returns YYYY-MM-DD formatında tarih
   */
  public getDateKey(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  /**
   * Haftalık görevleri kontrol eder ve kaçırılan görevleri işaretler
   * @param companyId Şirket ID'si
   */
  public async checkWeeklyMissedTasks(companyId: string): Promise<string[]> {
    console.log(`Haftalık kaçırılan görevler kontrol ediliyor - Şirket: ${companyId}`);
    const logs: string[] = [];
    logs.push(`[${new Date().toLocaleString()}] Haftalık kaçırılan görevler kontrolü başladı - Şirket: ${companyId}`);

    try {
      // Şu anki zamanı al
      const now = await this.getCurrentTime();
      logs.push(`Firebase sunucu zamanı: ${now.toLocaleString()}`);
      
      // Bugünün tarihini ve günün numarasını al
      const today = this.getDateKey(now);
      const todayDayOfWeek = this.getDayOfWeek(now); // 0-6 (0=Pazar, 1=Pazartesi, ...)
      
      logs.push(`Bugünün tarihi: ${today}, Haftanın günü: ${todayDayOfWeek} (${this.getDayName(todayDayOfWeek)})`);
      
      // Tüm haftalık görevleri al
      const weeklyTasksRef = ref(database, `companies/${companyId}/weeklyTasks`);
      const weeklyTasksSnapshot = await get(weeklyTasksRef);
      
      if (!weeklyTasksSnapshot.exists()) {
        logs.push(`Şirket için haftalık görev bulunamadı: ${companyId}`);
        return logs;
      }
      
      const weeklyTasksData = weeklyTasksSnapshot.val() as Record<string, any>;
      logs.push(`Toplam haftalık görev sayısı: ${Object.keys(weeklyTasksData).length}`);
      
      for (const [taskId, taskData] of Object.entries<any>(weeklyTasksData)) {
        logs.push(`-------------------------------------------`);
        logs.push(`Görev kontrol ediliyor: ${taskId} - ${taskData.name || 'İsimsiz Görev'}`);
        
        try {
          // Görevin bugün için tanımlı olup olmadığını kontrol et
          const taskDays = taskData.days || {};
          
          // Bugün bu görev için bir gün mü?
          if (!taskDays[todayDayOfWeek]) {
            logs.push(`Görev bugün (${this.getDayName(todayDayOfWeek)}) için tanımlanmamış, atlanıyor`);
            continue;
          }
          
          logs.push(`Görev bugün için tanımlanmış: ${this.getDayName(todayDayOfWeek)}`);
          
          // Bugün için tanımlı tekrar zamanlarını al
          const todayRepetitionTimes = taskDays[todayDayOfWeek].repetitionTimes || [];
          
          if (todayRepetitionTimes.length === 0) {
            logs.push(`Bugün için tekrar zamanı tanımlanmamış, atlanıyor`);
            continue;
          }
          
          logs.push(`Bugün için tekrar zamanları: ${todayRepetitionTimes.join(', ')}`);
          
          // Her bir zamanı kontrol et
          for (const timeString of todayRepetitionTimes) {
            logs.push(`Zaman kontrol ediliyor: ${timeString}`);
            
            try {
              // Zaman formatını kontrol et
              if (!timeString || !timeString.includes(':')) {
                logs.push(`Geçersiz zaman formatı: ${timeString}, atlanıyor`);
                continue;
              }
              
              // Zaman formatını ayrıştır (14:30 gibi)
              const parts = timeString.split(':');
              const hour = parseInt(parts[0], 10);
              const minute = parseInt(parts[1], 10);
              
              if (isNaN(hour) || isNaN(minute)) {
                logs.push(`Geçersiz zaman formatı: ${timeString}, atlanıyor`);
                continue;
              }
              
              // Görev saati ve tolerans sonu (görevden 1 saat sonrası)
              const taskTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
              const toleranceEnd = new Date(taskTime.getTime() + (60 * 60 * 1000)); // 1 saat tolerans
              
              logs.push(`Görev saati: ${taskTime.toLocaleTimeString()}, Tolerans sonu: ${toleranceEnd.toLocaleTimeString()}`);
              
              // Görev saati geçmiş ve tolerans süresi dolmuş mu?
              if (now > toleranceEnd) {
                logs.push(`Görev saati geçmiş ve tolerans süresi dolmuş`);
                
                // Bu görevin tamamlanmış olup olmadığını kontrol et
                const completedTaskRef = ref(database, `companies/${companyId}/completedWeeklyTasks/${taskId}/${today}/${timeString}`);
                const completedTaskSnapshot = await get(completedTaskRef);
                
                if (completedTaskSnapshot.exists()) {
                  const completedTaskData = completedTaskSnapshot.val() as Record<string, any>;
                  if (completedTaskData.status === 'completed') {
                    logs.push(`Görev zaten tamamlanmış, atlanıyor`);
                    continue;
                  }
                }
                
                // Bu görevin zaten kaçırılmış olup olmadığını kontrol et
                const missedTaskRef = ref(database, `companies/${companyId}/missedWeeklyTasks/${taskId}/${today}/${timeString}`);
                const missedTaskSnapshot = await get(missedTaskRef);
                
                if (missedTaskSnapshot.exists()) {
                  logs.push(`Görev zaten kaçırılmış olarak işaretlenmiş, atlanıyor`);
                  continue;
                }
                
                // Kaçırılan görevi kaydet
                logs.push(`Görev kaçırılmış olarak işaretleniyor`);
                
                const missedData = {
                  missedAt: now.getTime(),
                  taskName: taskData.name || 'İsimsiz Görev',
                  taskDescription: taskData.description || '',
                  completionType: taskData.completionType || 'button',
                  isRecurring: true,
                  status: 'missed',
                  taskDate: today,
                  taskTime: timeString,
                  personnelId: taskData.personnelId || '',
                  // Personel ismini almak için personnel verisine erişmemiz gerekiyor
                  // Ancak bu örnekte basit tutmak için sadece kaydediyoruz
                };
                
                // Veritabanına kaydet
                await set(missedTaskRef, missedData);
                
                // Ana görev bilgisini güncelle
                await update(ref(database, `companies/${companyId}/weeklyTasks/${taskId}`), {
                  lastMissedTime: timeString,
                  lastMissedAt: now.getTime()
                });
                
                logs.push(`Görev kaçırılmış olarak işaretlendi: ${taskId} - ${timeString}`);
              } else {
                logs.push(`Görev henüz kaçırılmış sayılmaz, tolerans süresi devam ediyor veya görev zamanı henüz gelmemiş`);
              }
            } catch (error) {
              logs.push(`Zaman kontrolü sırasında hata: ${error}`);
              continue;
            }
          }
        } catch (error) {
          logs.push(`Görev işleme hatası: ${error}`);
          continue;
        }
      }
      
      logs.push(`-------------------------------------------`);
      logs.push(`Haftalık kaçırılan görevler kontrolü tamamlandı - Şirket: ${companyId}`);
      return logs;
    } catch (error) {
      logs.push(`Haftalık kaçırılan görevler kontrolü sırasında hata: ${error}`);
      console.error('Haftalık kaçırılan görevler kontrolü hatası:', error);
      return logs;
    }
  }
  
  /**
   * Haftanın günü numarasından gün adını döndürür
   * @param dayNumber 0-6 arasında gün numarası (0=Pazar, 1=Pazartesi, ...)
   * @returns Gün adı
   */
  private getDayName(dayNumber: number): string {
    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return dayNames[dayNumber] || 'Bilinmeyen Gün';
  }
  
  /**
   * Tüm şirketlerin haftalık kaçırılan görevlerini kontrol eder
   */
  public async checkAllCompaniesWeeklyMissedTasks(): Promise<string[]> {
    console.log('Tüm şirketlerin haftalık kaçırılan görevleri kontrol ediliyor');
    const logs: string[] = [];
    logs.push(`[${new Date().toLocaleString()}] Tüm şirketlerin haftalık kaçırılan görevler kontrolü başladı`);

    try {
      // Tüm şirketleri al
      const companiesRef = ref(database, 'companies');
      const companiesSnapshot = await get(companiesRef);
      
      if (!companiesSnapshot.exists()) {
        logs.push('Hiç şirket bulunamadı');
        return logs;
      }
      
      const companiesData = companiesSnapshot.val() as Record<string, any>;
      const companyIds = Object.keys(companiesData);
      logs.push(`Toplam şirket sayısı: ${companyIds.length}`);
      
      // Her bir şirket için kontrol yap
      for (const companyId of companyIds) {
        logs.push(`\n============= Şirket: ${companyId} =============`);
        const companyLogs = await this.checkWeeklyMissedTasks(companyId);
        logs.push(...companyLogs);
      }
      
      logs.push(`\n[${new Date().toLocaleString()}] Tüm şirketlerin haftalık kaçırılan görevler kontrolü tamamlandı`);
      return logs;
    } catch (error) {
      logs.push(`Tüm şirketlerin haftalık kaçırılan görevler kontrolü sırasında hata: ${error}`);
      console.error('Tüm şirketlerin haftalık kaçırılan görevler kontrolü hatası:', error);
      return logs;
    }
  }
}

// Singleton olarak dışa aktar
export default TimeService.getInstance(); 