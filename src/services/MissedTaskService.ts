import { database } from '../firebase';
import { ref, get, set, remove } from 'firebase/database';
import TimeService from './TimeService';
import TaskTimeService from './TaskTimeService';

/**
 * Kaçırılan görevleri yöneten servis
 */
class MissedTaskService {
  // Singleton yapısı
  private static instance: MissedTaskService;
  
  private constructor() {}
  
  public static getInstance(): MissedTaskService {
    if (!MissedTaskService.instance) {
      MissedTaskService.instance = new MissedTaskService();
    }
    return MissedTaskService.instance;
  }
  
  /**
   * Kaçırılan görev zamanlarını veritabanından getirir
   * @param taskId Görev ID'si
   * @param companyId Şirket ID'si
   * @returns Kaçırılan zamanlar listesi
   */
  public async getMissedTaskTimes(taskId: string, companyId: string): Promise<string[]> {
    try {
      // Bugünün tarihini al
      const dateKey = TimeService.getTodayDateKey();
      
      // Tarih eklenmiş yeni yol
      const missedRef = ref(database, `companies/${companyId}/missedTasks/${taskId}/${dateKey}`);
      const snapshot = await get(missedRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data);
      }
      
      return [];
    } catch (error) {
      console.error('Kaçırılan görevler alınamadı:', error);
      return [];
    }
  }
  
  /**
   * Tamamlanmış görev zamanlarını veritabanından getirir
   * @param taskId Görev ID'si
   * @param companyId Şirket ID'si
   * @returns Tamamlanmış zamanlar listesi
   */
  public async getCompletedTaskTimes(taskId: string, companyId: string): Promise<string[]> {
    try {
      // Bugünün tarihini al
      const dateKey = TimeService.getTodayDateKey();
      
      // Tarih eklenmiş yeni yol
      const completedRef = ref(database, `companies/${companyId}/completedTasks/${taskId}/${dateKey}`);
      const snapshot = await get(completedRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allCompletedTimes: string[] = [];
        
        // Tamamlanmış zamanları kontrol et
        for (const timeKey in data) {
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
    } catch (error) {
      console.error('Tamamlanmış görevler alınamadı:', error);
      return [];
    }
  }
  
  /**
   * Görev zamanını kaçırılan olarak kaydeder
   * @param taskId Görev ID'si
   * @param companyId Şirket ID'si
   * @param timeString Zaman string'i (14:30 formatında)
   * @param taskData Görev verileri
   */
  public async recordMissedTaskTime(
    taskId: string,
    companyId: string,
    timeString: string,
    taskData: any
  ): Promise<void> {
    try {
      const now = await TimeService.getCurrentTime();
      
      // Tarih formatını YYYY-MM-DD olarak oluştur
      const dateKey = TimeService.getTodayDateKey();
      
      // Tarih eklenmiş yeni yol
      const missedRef = ref(database, `companies/${companyId}/missedTasks/${taskId}/${dateKey}/${timeString}`);
      
      await set(missedRef, {
        missedAt: now.getTime(),
        taskName: taskData.name,
        taskDescription: taskData.description,
        completionType: taskData.completionType,
        isRecurring: taskData.isRecurring || false,
        taskDate: dateKey,
        taskTime: timeString,
      });
      
      console.log('Kaçırılan görev zamanı kaydedildi:', dateKey, '/', timeString);
    } catch (error) {
      console.error('Kaçırılan görev zamanı kaydedilemedi:', error);
    }
  }
  
  /**
   * Görev durumunu günceller (başlatma/tamamlama durumunda kullanılır)
   * @param taskId Görev ID'si
   * @param companyId Şirket ID'si
   * @param timeString Zaman string'i (14:30 formatında)
   * @param taskData Görev verileri
   */
  public async recordTaskCompletion(
    taskId: string,
    companyId: string,
    timeString: string,
    taskData: any
  ): Promise<void> {
    try {
      const now = await TimeService.getCurrentTime();
      
      // Tarih formatını YYYY-MM-DD olarak oluştur
      const dateKey = TimeService.getTodayDateKey();
      
      // Tarih eklenmiş yeni yol
      const completedRef = ref(database, `companies/${companyId}/completedTasks/${taskId}/${dateKey}/${timeString}`);
      
      await set(completedRef, {
        completedAt: now.getTime(),
        taskName: taskData.name,
        taskDescription: taskData.description,
        completionType: taskData.completionType,
        isRecurring: taskData.isRecurring || false,
        taskDate: dateKey,
        taskTime: timeString,
      });
      
      // Kaçırılan görevlerden sil (eğer varsa)
      const missedRef = ref(database, `companies/${companyId}/missedTasks/${taskId}/${dateKey}/${timeString}`);
      await remove(missedRef);
      
      console.log('Görev tamamlanma zamanı kaydedildi:', dateKey, '/', timeString);
    } catch (error) {
      console.error('Görev tamamlanma zamanı kaydedilemedi:', error);
    }
  }
  
  /**
   * Tamamlanmış görev zamanlarının durumlarını kontrol eder
   * @param taskId Görev ID'si
   * @param companyId Şirket ID'si
   * @returns Zaman durumları haritası
   */
  public async getCompletedTaskTimeStatuses(
    taskId: string, 
    companyId: string
  ): Promise<Record<string, string>> {
    try {
      // Bugünün tarihini al
      const dateKey = TimeService.getTodayDateKey();
      
      // Tarih eklenmiş yeni yol
      const completedRef = ref(database, `companies/${companyId}/completedTasks/${taskId}/${dateKey}`);
      const snapshot = await get(completedRef);
      
      const timeStatuses: Record<string, string> = {};
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        for (const timeString in data) {
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
    } catch (error) {
      console.error('Tamamlanmış görev durumları alınamadı:', error);
      return {};
    }
  }
  
  /**
   * Tüm tekrarlı görevleri kontrol eder ve kaçırılanları kaydeder
   * @param tasks Tekrarlı görevler listesi
   * @param companyId Şirket ID'si
   */
  public async checkAndRecordMissedTasks(
    tasks: any[],
    companyId: string
  ): Promise<void> {
    try {
      const now = await TimeService.getCurrentTime();
      
      // Tarih formatını YYYY-MM-DD olarak oluştur
      const dateKey = TimeService.getTodayDateKey();
      
      for (const task of tasks) {
        // Sadece tekrarlı ve kabul edilmiş görevleri kontrol et
        if (task.isRecurring && task.status === 'accepted') {
          const repetitionTimes = task.repetitionTimes || [];
          
          // Zamanları sırala (artan sırada)
          repetitionTimes.sort();
          
          // Kaçırılan ve tamamlanan görev zamanlarını al
          const missedTimes = await this.getMissedTaskTimes(task.id, companyId);
          const completedTimes = await this.getCompletedTaskTimes(task.id, companyId);
          
          // Başlatılmış ama tamamlanmamış görevlerin durumlarını al
          const timeStatuses = await this.getCompletedTaskTimeStatuses(task.id, companyId);
          
          // Başlatılmış ama tamamlanmamış görevleri bul
          const startedButNotCompletedTimes: string[] = [];
          for (const [timeKey, status] of Object.entries(timeStatuses)) {
            if (status === 'started') {
              startedButNotCompletedTimes.push(timeKey);
            }
          }
          
          // Yeni kaçırılan zamanları kontrol et
          const newMissedTimes = await TaskTimeService.checkMissedTimes(
            repetitionTimes,
            task.status,
            completedTimes,
            missedTimes
          );
          
          // Başlatılmış ama tamamlanmamış görevlerin içinde zamanı geçmiş olanları bul
          const expiredStartedTimes: string[] = [];
          for (const startedTime of startedButNotCompletedTimes) {
            // Görev zamanını DateTime objesine çevir
            const timeParts = startedTime.split(':');
            if (timeParts.length === 2) {
              const taskHour = parseInt(timeParts[0], 10);
              const taskMinute = parseInt(timeParts[1], 10);
              
              // Görev saatini bugünün tarihiyle birleştir
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
                  const nextHour = parseInt(nextTimeParts[0], 10);
                  const nextMinute = parseInt(nextTimeParts[1], 10);
                  
                  // Bir sonraki görevin başlangıç zamanı
                  endTime = new Date(
                    now.getFullYear(), now.getMonth(), now.getDate(), nextHour, nextMinute
                  );
                  
                  // Sonraki görevin toleransını ekle
                  const startTolerance = task.startTolerance || 15;
                  endTime.setMinutes(endTime.getMinutes() - startTolerance);
                } else {
                  // Sonraki görevin zamanı düzgün ayrıştırılamadı, varsayılan olarak 60 dakika kullan
                  endTime = new Date(taskDateTime.getTime());
                  endTime.setMinutes(endTime.getMinutes() + 60);
                }
              } else {
                // Son görev için 60 dakika tolerans kullan
                endTime = new Date(taskDateTime.getTime());
                endTime.setMinutes(endTime.getMinutes() + 60);
              }
              
              // Şu anki zaman, görevin maksimum bitiş zamanını geçti mi?
              if (now.getTime() > endTime.getTime()) {
                // Zamanı geçmiş, başlatılmış ama tamamlanmamış görev bulundu
                expiredStartedTimes.push(startedTime);
                
                // Bu görevi kaçırılan görevlere ekle
                if (!missedTimes.includes(startedTime) && !newMissedTimes.includes(startedTime)) {
                  newMissedTimes.push(startedTime);
                }
              }
            }
          }
          
          // Yeni kaçırılan zamanları kaydet
          for (const missedTime of newMissedTimes) {
            await this.recordMissedTaskTime(task.id, companyId, missedTime, task);
          }
          
          // Başlatılmış ama tamamlanmamış ve zamanı geçmiş görevleri completedTasks'dan sil
          for (const expiredTime of expiredStartedTimes) {
            console.log('Zamanı geçmiş başlatılmış görev temizleniyor:', dateKey, '/', expiredTime);
            const completedRef = ref(database, `companies/${companyId}/completedTasks/${task.id}/${dateKey}/${expiredTime}`);
            await remove(completedRef);
          }
        }
      }
    } catch (error) {
      console.error('checkAndRecordMissedTasks hata:', error);
    }
  }
}

// Singleton olarak dışa aktar
export default MissedTaskService.getInstance(); 