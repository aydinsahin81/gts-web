import { database } from '../../firebase';
import { ref, get, set, remove, update } from 'firebase/database';
import { format } from 'date-fns';

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
      
      if (!tasksSnapshot.exists()) {
        updateProgress(`Şirket "${companyName}" (${companyId}) için hiç görev bulunamadı`);
        return 0;
      }
      
      const tasksData = tasksSnapshot.val();
      let totalMissedCount = 0;
      
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
      
      updateProgress(`Şirket "${companyName}" (${companyId}) için ${totalMissedCount} kaçırılan görev kaydedildi`);
      return totalMissedCount;
    } catch (e) {
      console.error(`checkAndRecordMissedTasksForCompany hata (${companyId}):`, e);
      updateProgress(`Şirket "${companyName}" (${companyId}) görevleri kontrol edilirken hata: ${e}`);
      return 0;
    }
  }
  
  // Tüm şirketlerdeki kaçırılan görevleri kontrol et ve kaydet
  public async checkAllCompanies(updateProgress: (message: string) => void): Promise<void> {
    try {
      updateProgress('Tüm şirketler için görev kontrolü başlatılıyor...');
      
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