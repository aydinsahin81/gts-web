import { database, auth } from '../../firebase';
import { ref, get, set, remove, update } from 'firebase/database';
import { format } from 'date-fns';
import { signInWithEmailAndPassword } from 'firebase/auth';
import TimeService from '../../services/TimeService';

class TaskService {
  // Singleton pattern
  private static instance: TaskService;

  private constructor() {}

  public static getInstance(): TaskService {
    if (!TaskService.instance) {
      TaskService.instance = new TaskService();
    }
    return TaskService.instance;
  }

  // Programatik olarak oturum açma
  private async loginWithSuperAdminCredentials(email: string, password: string): Promise<boolean> {
    try {
      // Mevcut kullanıcıyı kontrol et, zaten oturum açıksa tekrar yapma
      if (auth.currentUser) {
        console.log('Zaten oturum açılmış durumda');
        return true;
      }
      
      // E-posta ve şifre ile oturum aç
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Kullanıcı bilgilerini kontrol et
      const user = userCredential.user;
      if (!user) {
        console.error('Kullanıcı bilgileri alınamadı');
        return false;
      }
      
      // Kullanıcının rolünü kontrol et
      const userRef = ref(database, `users/${user.uid}`);
      const userSnapshot = await get(userRef);
      
      if (!userSnapshot.exists()) {
        console.error('Kullanıcı veritabanında bulunamadı');
        return false;
      }
      
      const userData = userSnapshot.val();
      const role = userData.role || '';
      
      // Sadece superadmin rolüne sahip kullanıcıların bu servisi kullanmasına izin ver
      if (role !== 'superadmin') {
        console.error('Bu işlemi gerçekleştirmek için superadmin yetkisine sahip olmalısınız');
        return false;
      }
      
      console.log('Süper admin olarak başarıyla oturum açıldı');
      return true;
    } catch (error) {
      console.error('Oturum açma hatası:', error);
      return false;
    }
  }

  // Bugünün tarihini YYYY-MM-DD formatında döndür
  private getTodayDateKey(): string {
    return format(new Date(), 'yyyy-MM-dd');
  }

  // Kaçırılan görev zamanlarını veritabanından getir
  private async getMissedTaskTimes(taskId: string, companyId: string): Promise<string[]> {
    try {
      // Bugünün tarihini al
      const dateKey = this.getTodayDateKey();
      
      // Tarih eklenmiş yeni yol
      const missedTasksRef = ref(database, `companies/${companyId}/missedTasks/${taskId}/${dateKey}`);
      const snapshot = await get(missedTasksRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data);
      }
      
      return [];
    } catch (e) {
      console.error('Kaçırılan görevler alınamadı:', e);
      return [];
    }
  }
  
  // Tamamlanmış görev zamanlarını veritabanından getir
  private async getCompletedTaskTimes(taskId: string, companyId: string): Promise<string[]> {
    try {
      // Bugünün tarihini al
      const dateKey = this.getTodayDateKey();
      
      // Tarih eklenmiş yeni yol
      const completedTasksRef = ref(database, `companies/${companyId}/completedTasks/${taskId}/${dateKey}`);
      const snapshot = await get(completedTasksRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allCompletedTimes: string[] = [];
        
        // Tamamlanmış zamanları kontrol et
        for (const timeKey of Object.keys(data)) {
          const timeData = data[timeKey];
          // Tamamlanma zamanını kontrol et (completedAt kullan, başlatma değil)
          const completedAt = timeData.completedAt;
          
          // Eğer tamamlanma zamanı yoksa (sadece başlatılmış ama tamamlanmamış) atla
          if (!completedAt) continue;
          
          allCompletedTimes.push(timeKey);
        }
        
        return allCompletedTimes;
      }
      
      return [];
    } catch (e) {
      console.error('Tamamlanmış görevler alınamadı:', e);
      return [];
    }
  }
  
  // Görev zamanlarının durumlarını kontrol et
  private async getCompletedTaskTimeStatuses(taskId: string, companyId: string): Promise<Record<string, string>> {
    try {
      // Bugünün tarihini al
      const dateKey = this.getTodayDateKey();
      
      // Tarih eklenmiş yeni yol
      const completedTasksRef = ref(database, `companies/${companyId}/completedTasks/${taskId}/${dateKey}`);
      const snapshot = await get(completedTasksRef);
      
      const timeStatuses: Record<string, string> = {};
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        for (const timeString of Object.keys(data)) {
          const timeData = data[timeString];
          
          // Tamamlanma veya başlatılma zamanını kontrol et
          const completedAt = timeData.completedAt;
          const startedAt = timeData.startedAt;
          
          // Görev tamamlandıysa
          if (completedAt) {
            timeStatuses[timeString] = 'completed';
          } 
          // Görev başlatıldıysa
          else if (startedAt) {
            timeStatuses[timeString] = 'started';
          }
        }
      }
      
      return timeStatuses;
    } catch (e) {
      console.error('Tamamlanmış görev durumları alınamadı:', e);
      return {};
    }
  }
  
  // Görev zamanını kaçırılan olarak kaydet
  private async recordMissedTaskTime(
    taskId: string, 
    companyId: string, 
    timeString: string,
    taskData: any
  ): Promise<void> {
    try {
      const now = new Date();
      
      // Tarih formatını YYYY-MM-DD olarak oluştur
      const dateKey = this.getTodayDateKey();
      
      // Personel bilgilerini al
      let personnelFullName = 'Atanmamış';
      
      // Görevin atandığı personel ID'sini kontrol et
      if (taskData.personnelId) {
        try {
          // Personel bilgilerini veritabanından al
          const personnelRef = ref(database, `companies/${companyId}/personnel/${taskData.personnelId}`);
          const personnelSnapshot = await get(personnelRef);
          
          if (personnelSnapshot.exists()) {
            const personnelData = personnelSnapshot.val();
            // JSON yapısında name alanını kullan
            personnelFullName = personnelData.name || 'Belirsiz Personel';
          } else {
            // Eğer personel şirketin personnel koleksiyonunda bulunamazsa, users koleksiyonunda da ara
            const userRef = ref(database, `users/${taskData.personnelId}`);
            const userSnapshot = await get(userRef);
            
            if (userSnapshot.exists()) {
              const userData = userSnapshot.val();
              personnelFullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Belirsiz Personel';
            }
          }
        } catch (error) {
          console.error(`Personel bilgileri alınamadı (${taskData.personnelId}):`, error);
        }
      }
      
      // Tarih eklenmiş yeni yol
      const missedTaskRef = ref(database, `companies/${companyId}/missedTasks/${taskId}/${dateKey}/${timeString}`);
      
      await set(missedTaskRef, {
        missedAt: now.getTime(),
        taskName: taskData.name,
        taskDescription: taskData.description,
        completionType: taskData.completionType,
        isRecurring: taskData.isRecurring || false,
        taskDate: dateKey,
        taskTime: timeString,
        assignedTo: taskData.personnelId || '',
        personnelFullName: personnelFullName
      });
      
      console.log(`Kaçırılan görev zamanı kaydedildi: ${companyId}/${taskId}/${dateKey}/${timeString} - Personel: ${personnelFullName}`);
    } catch (e) {
      console.error('Kaçırılan görev zamanı kaydedilemedi:', e);
    }
  }
  
  // Zamanları kontrol et ve kaçırılanları belirle
  private checkMissedTimes(
    repetitionTimes: string[], 
    taskStatus: string,
    completedTimes: string[],
    missedTimes: string[]
  ): string[] {
    const newMissedTimes: string[] = [];
    
    // Şu anki saat
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Görev kabul edilmişse ve tekrarlanan zamanlar varsa
    if (taskStatus === 'accepted' && repetitionTimes.length > 0) {
      for (const timeString of repetitionTimes) {
        // Zaman formatını kontrol et (HH:MM)
        const timeParts = timeString.split(':');
        if (timeParts.length !== 2) continue;
        
        const taskHour = parseInt(timeParts[0]);
        const taskMinute = parseInt(timeParts[1]);
        
        // Görevin zamanı geçmiş mi?
        const isTimeInPast = (
          currentHour > taskHour || 
          (currentHour === taskHour && currentMinute > taskMinute + 15) // 15 dakika tolerans
        );
        
        // Görev zamanı geçmiş, tamamlanmamış ve zaten kaçırılan olarak işaretlenmemiş mi?
        if (isTimeInPast && 
            !completedTimes.includes(timeString) && 
            !missedTimes.includes(timeString)) {
          newMissedTimes.push(timeString);
        }
      }
    }
    
    return newMissedTimes;
  }
  
  // Aylık görevleri kontrol eden fonksiyon
  private async checkMonthlyMissedTasks(companyId: string, updateProgress: (message: string) => void): Promise<number> {
    try {
      updateProgress(`Şirket için aylık görevler kontrol ediliyor (${companyId})...`);
      
      // Aylık görevleri al
      const monthlyTasksRef = ref(database, `companies/${companyId}/monthlyTasks`);
      const monthlyTasksSnapshot = await get(monthlyTasksRef);
      
      if (!monthlyTasksSnapshot.exists()) {
        updateProgress(`Şirket için aylık görev bulunamadı (${companyId})`);
        return 0;
      }
      
      const monthlyTasksData = monthlyTasksSnapshot.val();
      let totalMissedMonthlyTasks = 0;
      const missedTaskLogs: string[] = [];
      
      // Bugünün tarihini al
      const now = new Date();
      // JS'de 0-11 arası
      const jsMonthIndex = now.getMonth(); // 0-11 arası (0=Ocak, 11=Aralık)
      const currentMonth = jsMonthIndex + 1; // 1-12 arası (1=Ocak, 12=Aralık)
      
      // Aylık görevlerin ay anahtarlarını incele - detaylı log çıktısını kaldırıyoruz
      const taskMonthInfo = Object.keys(monthlyTasksData).reduce((acc: Record<string, any>, taskId) => {
        const task = monthlyTasksData[taskId] as Record<string, any>;
        const monthKeys = Object.keys(task).filter(key => key.startsWith('month'));
        if (!acc[taskId]) acc[taskId] = { taskName: task.name || 'İsimsiz Görev', months: monthKeys };
        return acc;
      }, {});
      
      // Sadece debug modunda log alalım
      if (process.env.NODE_ENV === 'development') {
        console.log(`Mevcut aylık görevlerin ay anahtarları:`, taskMonthInfo);
      }
      
      // Veritabanı format tespiti - bir görevdeki ay anahtarlarını kontrol ederek formatı belirle
      let monthKeyFormat = "";
      const firstTaskId = Object.keys(monthlyTasksData)[0];
      
      if (firstTaskId) {
        const firstTask = monthlyTasksData[firstTaskId] as Record<string, any>;
        const monthKeys = Object.keys(firstTask).filter(key => key.startsWith('month'));
        
        if (monthKeys.length > 0) {
          // İlk ay anahtarı örneklerini al
          const sampleKey = monthKeys[0];
          
          // Ay anahtarının formatını belirle
          if (sampleKey.match(/^month\d{2}$/)) {
            // "month01", "month02" formatı
            monthKeyFormat = "two-digit-padded";
            // Ayrıntılı log kaldırıldı
          } else if (sampleKey.match(/^month\d$/)) {
            // "month1", "month2" formatı
            monthKeyFormat = "one-digit";
            // Ayrıntılı log kaldırıldı
          }
        }
      }
      
      // Veritabanındaki ay anahtarını belirle
      let currentMonthKey;
      if (monthKeyFormat === "two-digit-padded") {
        // İki basamaklı, sıfır dolgulu format: "month01", "month02"...
        currentMonthKey = `month${currentMonth.toString().padStart(2, '0')}`;
      } else if (monthKeyFormat === "one-digit") {
        // Tek basamaklı format: "month1", "month2"...
        currentMonthKey = `month${currentMonth}`;
      } else {
        // Format belirlenemezse, her olası formatı denemeye çalış
        const possibleFormats = [
          `month${currentMonth}`,
          `month${currentMonth.toString().padStart(2, '0')}`,
          `month${jsMonthIndex}`,
          `month${jsMonthIndex.toString().padStart(2, '0')}`
        ];
        // Ayrıntılı log kaldırıldı
        
        // İlk önce iki basamaklı formatı dene (daha yaygın görünüyor)
        currentMonthKey = `month${currentMonth.toString().padStart(2, '0')}`;
      }
      
      const currentDay = now.getDate(); // 1-31 arası
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const dateKey = this.getTodayDateKey();
      
      // Daha sade log çıktısı
      // updateProgress(`Bugünkü tarih: ${dateKey}, JS Ay Indexi: ${jsMonthIndex} (${this.getMonthName(jsMonthIndex)}), Gerçek Ay: ${currentMonth}, Aranan Ay Anahtarı: ${currentMonthKey}, Gün: ${currentDay}`);
      
      // Olası alternatif ay anahtarları, belirlenemeyen formatlar için
      const alternativeMonthKeys = [
        `month${currentMonth}`,
        `month${currentMonth.toString().padStart(2, '0')}`,
        `month${jsMonthIndex}`,
        `month${jsMonthIndex.toString().padStart(2, '0')}`
      ];
      
      // Tüm aylık görevleri dolaş
      for (const [taskId, taskData] of Object.entries<any>(monthlyTasksData)) {
        // Sadece kabul edilmiş görevleri kontrol et
        if (taskData.status !== 'accepted') {
          continue;
        }
        
        // Ayrıntılı log kaldırıldı
        // updateProgress(`Aylık görev kontrol ediliyor: ${taskData.name || 'İsimsiz Görev'}`);
        
        // Bu görevdeki tüm ay anahtarlarını log'a yazdır - kaldırıldı
        const taskMonthKeys = Object.keys(taskData).filter(key => key.startsWith('month'));
        // updateProgress(`Bu görevde tanımlı aylar: ${taskMonthKeys.join(', ') || 'Yok'}`);
        
        // Bu ayın verilerini kontrol et - öncelikle belirlenen formatta kontrol et
        let monthKey = currentMonthKey;
        let monthData = taskData[monthKey];
        
        // Eğer bu formatta ay bulunamazsa, alternatif formatları dene
        if (!monthData) {
          for (const altKey of alternativeMonthKeys) {
            if (taskData[altKey]) {
              monthKey = altKey;
              monthData = taskData[altKey];
              // Ayrıntılı log kaldırıldı
              // updateProgress(`Alternatif ay anahtarı bulundu: ${altKey}`);
              break;
            }
          }
        }
        
        // Hiçbir formatta ay bulunamazsa, bu görevi atla
        if (!monthData) {
          // Ayrıntılı log kaldırıldı
          // updateProgress(`Görev bu ay için tanımlanmamış (${currentMonthKey} veya alternatifler), atlanıyor`);
          continue;
        }
        
        // Gün anahtarlarını incele ve format tespiti yap
        const dayKeys = Object.keys(monthData).filter(key => key.startsWith('day'));
        // Ayrıntılı log kaldırıldı
        // updateProgress(`Bu ayda tanımlı günler: ${dayKeys.join(', ') || 'Yok'}`);
        
        // Gün formatını belirle
        let dayKeyFormat = "";
        if (dayKeys.length > 0) {
          const sampleDayKey = dayKeys[0];
          if (sampleDayKey.match(/^day\d{2}$/)) {
            // "day01", "day02" formatı
            dayKeyFormat = "two-digit-padded";
            // Ayrıntılı log kaldırıldı
            // updateProgress(`Gün formatı: İki basamaklı sıfır dolgulu (day01, day02...)`);
          } else if (sampleDayKey.match(/^day\d{1,2}$/)) {
            // "day1", "day2" formatı
            dayKeyFormat = "one-digit";
            // Ayrıntılı log kaldırıldı
            // updateProgress(`Gün formatı: Tek basamaklı (day1, day2...)`);
          }
        }
        
        // Veritabanındaki gün anahtarını belirle
        let currentDayKey;
        if (dayKeyFormat === "two-digit-padded") {
          // İki basamaklı, sıfır dolgulu format: "day01", "day02"...
          currentDayKey = `day${currentDay.toString().padStart(2, '0')}`;
        } else if (dayKeyFormat === "one-digit") {
          // Tek basamaklı format: "day1", "day2"...
          currentDayKey = `day${currentDay}`;
        } else {
          // Format belirlenemezse, her olası formatı denemeye çalış
          currentDayKey = `day${currentDay}`; // Varsayılan olarak tek basamaklı kabul et
        }
        
        // Olası alternatif gün anahtarları
        const alternativeDayKeys = [
          `day${currentDay}`,
          `day${currentDay.toString().padStart(2, '0')}`
        ];
        
        // Ayrıntılı log kaldırıldı
        // updateProgress(`Aranan gün anahtarı: ${currentDayKey}, alternatifler: ${alternativeDayKeys.join(', ')}`);
        
        // Bu günün verilerini kontrol et
        let dayData = monthData[currentDayKey];
        
        // Eğer bu formatta gün bulunamazsa, alternatif formatları dene
        if (!dayData) {
          for (const altDayKey of alternativeDayKeys) {
            if (monthData[altDayKey]) {
              currentDayKey = altDayKey;
              dayData = monthData[altDayKey];
              // Ayrıntılı log kaldırıldı
              // updateProgress(`Alternatif gün anahtarı bulundu: ${altDayKey}`);
              break;
            }
          }
        }
        
        // Hiçbir formatta gün bulunamazsa, bu görevi atla
        if (!dayData) {
          // Ayrıntılı log kaldırıldı
          // updateProgress(`Görev bugün için tanımlanmamış (${currentDayKey} veya alternatifler), atlanıyor`);
          continue;
        }
        
        // Bugünkü tekrar zamanlarını al
        const repetitionTimes = dayData.repetitionTimes || [];
        if (repetitionTimes.length === 0) {
          // Ayrıntılı log kaldırıldı
          // updateProgress(`Bugün için tekrar zamanı tanımlanmamış, atlanıyor`);
          continue;
        }
        
        // Ayrıntılı log kaldırıldı
        // updateProgress(`Görev bugün için tanımlanmış, tekrar zamanları: ${repetitionTimes.join(', ')}`);
        
        // Personel bilgisini al
        let personnelName = 'Atanmamış';
        if (taskData.personnelId) {
          try {
            // Personel bilgilerini veritabanından al
            const personnelRef = ref(database, `companies/${companyId}/personnel/${taskData.personnelId}`);
            const personnelSnapshot = await get(personnelRef);
            
            if (personnelSnapshot.exists()) {
              const personnelData = personnelSnapshot.val();
              personnelName = personnelData.name || 'Belirsiz Personel';
            } else {
              // Users koleksiyonundan kontrol et
              const userRef = ref(database, `users/${taskData.personnelId}`);
              const userSnapshot = await get(userRef);
              
              if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                personnelName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Belirsiz Personel';
              }
            }
          } catch (error) {
            console.error(`Personel bilgileri alınamadı (${taskData.personnelId}):`, error);
          }
        }
        
        // Tamamlanan ve kaçırılan görevleri al
        const completedRef = ref(database, `companies/${companyId}/completedMonthlyTasks/${taskId}/${dateKey}`);
        const missedRef = ref(database, `companies/${companyId}/missedMonthlyTasks/${taskId}/${dateKey}`);
        
        const [completedSnapshot, missedSnapshot] = await Promise.all([
          get(completedRef),
          get(missedRef)
        ]);
        
        const completedTimes = completedSnapshot.exists() ? Object.keys(completedSnapshot.val()) : [];
        const missedTimes = missedSnapshot.exists() ? Object.keys(missedSnapshot.val()) : [];
        
        // Ayrıntılı log kaldırıldı
        // updateProgress(`Tamamlanan zamanlar: ${completedTimes.join(', ') || 'Yok'}`);
        // updateProgress(`Kaçırılan zamanlar: ${missedTimes.join(', ') || 'Yok'}`);
        
        // Her bir zamanı kontrol et
        for (const timeString of repetitionTimes) {
          // Zaman formatını kontrol et ve ayrıştır
          const parts = timeString.split(':');
          if (parts.length !== 2) continue;
          
          const taskHour = parseInt(parts[0]);
          const taskMinute = parseInt(parts[1]);
          
          // Görev zamanı geçmiş mi kontrol et
          const isTimePassed = (
            currentHour > taskHour || 
            (currentHour === taskHour && currentMinute > taskMinute + (taskData.startTolerance || 15))
          );
          
          // Görev zamanı geçmiş, ama tamamlanmamış veya kaçırılmış olarak işaretlenmemiş mi?
          if (isTimePassed && 
              !completedTimes.includes(timeString) && 
              !missedTimes.includes(timeString)) {
            // Ayrıntılı log kaldırıldı
            // updateProgress(`Kaçırılan görev zamanı tespit edildi: ${timeString}`);
            
            // Kaçırılan görev zamanını kaydet
            const missedTaskRef = ref(database, `companies/${companyId}/missedMonthlyTasks/${taskId}/${dateKey}/${timeString}`);
            
            await set(missedTaskRef, {
              missedAt: now.getTime(),
              taskName: taskData.name,
              taskDescription: taskData.description,
              taskDate: dateKey,
              taskTime: timeString,
              personnelId: taskData.personnelId || '',
              personnelFullName: personnelName,
              startTolerance: taskData.startTolerance || 15
            });
            
            // Sadece önemli log
            const logMessage = `Görev kaçırılmış olarak işaretlendi: ${taskId} - ${timeString}`;
            updateProgress(`  - ${logMessage}`);
            missedTaskLogs.push(logMessage);
            totalMissedMonthlyTasks++;
          }
        }
      }
      
      if (totalMissedMonthlyTasks > 0) {
        updateProgress(`Toplam ${totalMissedMonthlyTasks} kaçırılan aylık görev zamanı tespit edildi ve kaydedildi`);
        // Önemli logları çıktıla
        for (const log of missedTaskLogs) {
          if (process.env.NODE_ENV === 'development') {
            console.log(log);
          }
        }
      }
      return totalMissedMonthlyTasks;
    } catch (error) {
      console.error('Aylık görevler kontrol edilirken hata:', error);
      updateProgress(`Aylık görevleri kontrol ederken hata oluştu: ${error}`);
      return 0;
    }
  }

  // Ay adını döndüren yardımcı fonksiyon
  private getMonthName(monthNumber: number): string {
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return months[monthNumber];
  }
  
  // Şirketin tüm görevlerini kontrol et ve kaçırılanları kaydet
  private async checkAndRecordMissedTasksForCompany(
    companyId: string,
    companyName: string,
    updateProgress: (message: string) => void
  ): Promise<number> {
    try {
      updateProgress(`Şirket "${companyName}" (${companyId}) görevleri kontrol ediliyor...`);
      
      // Şirketin tüm görevlerini al
      const tasksRef = ref(database, `companies/${companyId}/tasks`);
      const tasksSnapshot = await get(tasksRef);
      
      let totalMissedCount = 0;
      
      if (tasksSnapshot.exists()) {
        const tasksData = tasksSnapshot.val();
        
        for (const taskId of Object.keys(tasksData)) {
          const taskData = tasksData[taskId];
          
          // Sadece tekrarlı ve kabul edilmiş görevleri kontrol et
          if (taskData.isRecurring && taskData.status === 'accepted') {
            const repetitionTimes = taskData.repetitionTimes || [];
            
            // Zamanları sırala (artan sırada)
            repetitionTimes.sort();
            
            // Kaçırılan ve tamamlanan görev zamanlarını al
            const missedTimes = await this.getMissedTaskTimes(taskId, companyId);
            const completedTimes = await this.getCompletedTaskTimes(taskId, companyId);
            
            // Başlatılmış ama tamamlanmamış görevlerin durumlarını al
            const timeStatuses = await this.getCompletedTaskTimeStatuses(taskId, companyId);
            
            // Başlatılmış ama tamamlanmamış görevleri bul
            const startedButNotCompletedTimes: string[] = [];
            for (const [time, status] of Object.entries(timeStatuses)) {
              if (status === 'started') {
                startedButNotCompletedTimes.push(time);
              }
            }
            
            // Yeni kaçırılan zamanları kontrol et
            const newMissedTimes = this.checkMissedTimes(
              repetitionTimes,
              taskData.status,
              completedTimes,
              missedTimes
            );
            
            // Başlatılmış ama tamamlanmamış görevlerin içinde zamanı geçmiş olanları bul
            const expiredStartedTimes: string[] = [];
            for (const startedTime of startedButNotCompletedTimes) {
              // Görev zamanını DateTime objesine çevir
              const timeParts = startedTime.split(':');
              if (timeParts.length === 2) {
                const taskHour = parseInt(timeParts[0]) || 0;
                const taskMinute = parseInt(timeParts[1]) || 0;
                
                // Görev saatini bugünün tarihiyle birleştir
                const now = new Date();
                const taskDateTime = new Date(
                  now.getFullYear(), now.getMonth(), now.getDate(), taskHour, taskMinute
                );
                
                // Uygun maksimum bitiş zamanını hesapla
                let endTime: Date;
                
                // Başlatılan görevden sonraki görevi bul
                const currentIndex = repetitionTimes.indexOf(startedTime);
                if (currentIndex >= 0 && currentIndex < repetitionTimes.length - 1) {
                  // Sonraki görev var, onun zamanını ve toleransını kullan
                  const nextTimeString = repetitionTimes[currentIndex + 1];
                  const nextTimeParts = nextTimeString.split(':');
                  if (nextTimeParts.length === 2) {
                    const nextHour = parseInt(nextTimeParts[0]) || 0;
                    const nextMinute = parseInt(nextTimeParts[1]) || 0;
                    
                    // Bir sonraki görevin başlangıç zamanı
                    endTime = new Date(
                      now.getFullYear(), now.getMonth(), now.getDate(), nextHour, nextMinute
                    );
                    
                    // Sonraki görevin toleransını ekle
                    const startTolerance = taskData.startTolerance || 15;
                    endTime.setMinutes(endTime.getMinutes() - startTolerance);
                  } else {
                    // Sonraki görevin zamanı düzgün ayrıştırılamadı, varsayılan olarak 60 dakika kullan
                    endTime = new Date(taskDateTime.getTime() + 60 * 60 * 1000); // 60 dakika
                  }
                } else {
                  // Son görev için 60 dakika tolerans kullan
                  endTime = new Date(taskDateTime.getTime() + 60 * 60 * 1000); // 60 dakika
                }
                
                // Şu anki zaman, görevin maksimum bitiş zamanını geçti mi?
                if (now > endTime) {
                  // Zamanı geçmiş, başlatılmış ama tamamlanmamış görev bulundu
                  expiredStartedTimes.push(startedTime);
                  
                  // Bu görevi kaçırılan görevlere ekle
                  if (!missedTimes.includes(startedTime) && !newMissedTimes.includes(startedTime)) {
                    newMissedTimes.push(startedTime);
                  }
                }
              }
            }
            
            // Personel bilgisi varsa önceden bul
            let assignedPersonnelInfo = 'Atanmamış';
            if (taskData.personnelId) {
              try {
                // Önce şirket personel koleksiyonundan ara
                const personnelRef = ref(database, `companies/${companyId}/personnel/${taskData.personnelId}`);
                const personnelSnapshot = await get(personnelRef);
                
                if (personnelSnapshot.exists()) {
                  const personnelData = personnelSnapshot.val();
                  // JSON yapısında name alanını kullan
                  assignedPersonnelInfo = personnelData.name || 'Belirsiz Personel';
                } else {
                  // users koleksiyonundan ara
                  const userRef = ref(database, `users/${taskData.personnelId}`);
                  const userSnapshot = await get(userRef);
                  
                  if (userSnapshot.exists()) {
                    const userData = userSnapshot.val();
                    assignedPersonnelInfo = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Belirsiz Personel';
                  }
                }
              } catch (error) {
                console.error(`Personel bilgileri alınamadı (${taskData.personnelId}):`, error);
              }
            }
            
            // Yeni kaçırılan zamanları kaydet
            if (newMissedTimes.length > 0) {
              updateProgress(`"${taskData.name}" görevi (${taskData.personnelId ? `Personel: ${assignedPersonnelInfo}` : 'Atanmamış'}) için ${newMissedTimes.length} kaçırılan zaman tespit edildi`);
              
              for (const missedTime of newMissedTimes) {
                await this.recordMissedTaskTime(taskId, companyId, missedTime, taskData);
              }
            }
            
            // Başlatılmış ama tamamlanmamış ve zamanı geçmiş görevleri completedTasks'dan sil
            const dateKey = this.getTodayDateKey();
            for (const expiredTime of expiredStartedTimes) {
              console.log(`Zamanı geçmiş başlatılmış görev temizleniyor: ${companyId}/${taskId}/${dateKey}/${expiredTime}`);
              const completedRef = ref(database, `companies/${companyId}/completedTasks/${taskId}/${dateKey}/${expiredTime}`);
              await remove(completedRef);
            }
            
            totalMissedCount += newMissedTimes.length;
          }
        }
      } else {
        updateProgress(`Şirket "${companyName}" (${companyId}) için hiç günlük görev bulunamadı`);
      }
      
      // Haftalık görevleri kontrol et
      updateProgress(`Şirket "${companyName}" (${companyId}) haftalık görevleri kontrol ediliyor...`);
      
      // TimeService'i kullanarak haftalık görevleri kontrol et ve kaçırılanları bul
      try {
        const weeklyLogs = await TimeService.checkWeeklyMissedTasks(companyId);
        
        // Önemli logları göster
        const missedWeeklyCount = weeklyLogs.filter(log => log.includes('Görev kaçırılmış olarak işaretlendi')).length;
        totalMissedCount += missedWeeklyCount;
        
        if (missedWeeklyCount > 0) {
          updateProgress(`Şirket "${companyName}" (${companyId}) için ${missedWeeklyCount} kaçırılan haftalık görev tespit edildi`);
          
          // Önemli logları göster
          for (const log of weeklyLogs) {
            if (log.includes('Görev kaçırılmış olarak işaretlendi')) {
              updateProgress(`  - ${log}`);
            }
          }
        } else {
          updateProgress(`Şirket "${companyName}" (${companyId}) için kaçırılan haftalık görev bulunmadı`);
        }
      } catch (error) {
        console.error(`Haftalık görevler kontrol edilirken hata: ${error}`);
        updateProgress(`Haftalık görev kontrolü sırasında hata: ${error}`);
      }
      
      // Aylık görevleri kontrol et
      updateProgress(`Şirket "${companyName}" (${companyId}) aylık görevleri kontrol ediliyor...`);
      
      // Aylık görevleri kontrol et ve kaçırılanları bul
      try {
        const missedMonthlyCount = await this.checkMonthlyMissedTasks(companyId, updateProgress);
        totalMissedCount += missedMonthlyCount;
        
        if (missedMonthlyCount > 0) {
          updateProgress(`Şirket "${companyName}" (${companyId}) için ${missedMonthlyCount} kaçırılan aylık görev tespit edildi`);
        } else {
          updateProgress(`Şirket "${companyName}" (${companyId}) için kaçırılan aylık görev bulunmadı`);
        }
      } catch (error) {
        console.error(`Aylık görevler kontrol edilirken hata: ${error}`);
        updateProgress(`Aylık görev kontrolü sırasında hata: ${error}`);
      }
      
      updateProgress(`Şirket "${companyName}" (${companyId}) için toplam ${totalMissedCount} kaçırılan görev kaydedildi`);
      return totalMissedCount;
    } catch (e) {
      console.error(`checkAndRecordMissedTasksForCompany hata (${companyId}):`, e);
      updateProgress(`Şirket "${companyName}" (${companyId}) görevleri kontrol edilirken hata: ${e}`);
      return 0;
    }
  }
  
  // Tüm şirketlerdeki kaçırılan görevleri kontrol et ve kaydet
  public async checkAllCompanies(updateProgress: (message: string) => void, credentials?: { email: string, password: string }): Promise<void> {
    try {
      updateProgress('Tüm şirketler için görev kontrolü başlatılıyor...');
      
      // Eğer kimlik bilgileri verilmişse, programatik olarak oturum aç
      if (credentials && credentials.email && credentials.password) {
        const isLoggedIn = await this.loginWithSuperAdminCredentials(credentials.email, credentials.password);
        if (!isLoggedIn) {
          updateProgress('Süper admin olarak oturum açılamadı. İşlem iptal edildi.');
          return;
        }
      } else if (!auth.currentUser) {
        // Eğer kimlik bilgileri verilmemiş ve oturum açık değilse işlemi durdur
        updateProgress('Oturum açılmamış. Bu işlemi gerçekleştirmek için süper admin olarak oturum açmalısınız.');
        return;
      }
      
      // Tüm şirketleri al
      const companiesRef = ref(database, 'companies');
      const companiesSnapshot = await get(companiesRef);
      
      if (!companiesSnapshot.exists()) {
        updateProgress('Hiç şirket bulunamadı.');
        return;
      }
      
      const companiesData = companiesSnapshot.val();
      const companyIds = Object.keys(companiesData);
      
      updateProgress(`Toplam ${companyIds.length} şirket bulundu.`);
      
      let totalMissedTasks = 0;
      
      // Her şirket için görevleri kontrol et
      for (const companyId of companyIds) {
        // Şirket adını al
        let companyName = 'İsimsiz Şirket';
        try {
          const companyInfoRef = ref(database, `companies/${companyId}/info`);
          const companyInfoSnapshot = await get(companyInfoRef);
          if (companyInfoSnapshot.exists()) {
            const companyInfo = companyInfoSnapshot.val();
            companyName = companyInfo.name || 'İsimsiz Şirket';
          }
        } catch (error) {
          console.error(`Şirket adı alınamadı (${companyId}):`, error);
        }
        
        const missedTasksCount = await this.checkAndRecordMissedTasksForCompany(companyId, companyName, updateProgress);
        totalMissedTasks += missedTasksCount;
      }
      
      updateProgress(`İşlem tamamlandı. Toplam ${totalMissedTasks} kaçırılan görev tespit edildi ve kaydedildi.`);
    } catch (e) {
      console.error('Tüm şirketler için görev kontrolü sırasında hata:', e);
      updateProgress(`Hata: ${e}`);
    }
  }
}

export default TaskService; 