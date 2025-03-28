import TimeService from './TimeService';

/**
 * Görev zamanı durumlarını tanımlayan enum
 */
export enum TaskTimeStatus {
  notYetDue = 'notYetDue',    // Henüz zamanı gelmemiş
  approaching = 'approaching', // Zamanı yaklaşıyor (tolerans süresi içinde)
  active = 'active',          // Şu an aktif (başlama zamanı +/- tolerans aralığında)
  missed = 'missed',          // Kaçırılmış (zamanı geçmiş)
  completed = 'completed',    // Tamamlanmış
  started = 'started'         // Başlatılmış
}

/**
 * Görev zamanlarını yöneten servis
 */
class TaskTimeService {
  // Singleton yapısı
  private static instance: TaskTimeService;
  
  private constructor() {}
  
  public static getInstance(): TaskTimeService {
    if (!TaskTimeService.instance) {
      TaskTimeService.instance = new TaskTimeService();
    }
    return TaskTimeService.instance;
  }
  
  /**
   * Görevlerin tekrarlanma zamanlarını kontrol eder ve uygun durumu döndürür
   * @param repetitionTimes Tekrarlanan zamanlar listesi
   * @param startTolerance Başlama toleransı (dakika)
   * @param currentStatus Görevin mevcut durumu
   * @returns { status, activeTime } objesi
   */
  public async checkRecurringTaskTime(
    repetitionTimes: string[],
    startTolerance: number,
    currentStatus: string,
  ): Promise<{ status: TaskTimeStatus, activeTime: string | null }> {
    if (!repetitionTimes || repetitionTimes.length === 0) {
      console.log('TaskTimeService: Tekrarlı zaman bulunamadı');
      return {
        status: TaskTimeStatus.notYetDue,
        activeTime: null,
      };
    }
    
    console.log('TaskTimeService: Tekrarlı zamanları kontrol ediyorum -', repetitionTimes);
    console.log('TaskTimeService: Görev durumu -', currentStatus, ', Tolerans -', startTolerance, 'dakika');
    
    // Görev zaten başlatılmış veya tamamlanmışsa, daha fazla zaman kontrolüne gerek yok
    if (currentStatus === 'completed' || currentStatus === 'started') {
      console.log('TaskTimeService: Görev', currentStatus, 'durumunda, sıradan zaman kontrolü atlanıyor');
      // Tüm tekrarlanma zamanlarını kontrol et ve en son tekrarlanma zamanını bul
      const nextTime = this._findNextTime(repetitionTimes);
      return {
        status: currentStatus === 'completed' ? TaskTimeStatus.completed : TaskTimeStatus.started,
        activeTime: nextTime,
      };
    }
    
    // Şu anki zamanı al
    const now = await TimeService.getCurrentTime();
    console.log('TaskTimeService: Şu anki zaman -', now.getHours() + ':' + now.getMinutes());
    
    // Zamanları kronolojik olarak sırala (erken saatler önce)
    const orderedTimes = [...repetitionTimes].sort();
    console.log('TaskTimeService: Kronolojik sıralanmış zamanlar -', orderedTimes);
    
    // 1. Yaklaşan ya da aktif bir zaman var mı kontrol et
    // Önce yaklaşan (approaching) zaman kontrolü
    for (const timeString of orderedTimes) {
      console.log('TaskTimeService: Yaklaşan zaman kontrolü -', timeString);
      
      // Zamanın yaklaşıp yaklaşmadığını kontrol et (görev zamanından önce ama tolerans içinde)
      const isApproaching = await TimeService.isTimeApproaching(timeString, startTolerance);
      if (isApproaching) {
        console.log('TaskTimeService: Görev zamanı yaklaşıyor -', timeString, '(MAVİ)');
        return {
          status: TaskTimeStatus.approaching,
          activeTime: timeString,
        };
      }
    }
    
    // 2. Aktif görev var mı kontrol et
    // Şu anki zamandan önceki son görevi ve sonraki ilk görevi bul
    let lastPassedTimeIndex = -1;
    let nextTimeIndex = -1;
    
    for (let i = 0; i < orderedTimes.length; i++) {
      const timeString = orderedTimes[i];
      const isPassed = await TimeService.isTimePassed(timeString);
      
      if (isPassed) {
        lastPassedTimeIndex = i;
      } else {
        nextTimeIndex = i;
        break;
      }
    }
    
    // Son geçen zaman varsa (bugün en az bir görev zamanı geçmişse)
    if (lastPassedTimeIndex !== -1) {
      const lastPassedTime = orderedTimes[lastPassedTimeIndex];
      // Bu zamanın hala aktif olup olmadığını kontrol et
      
      // Bir sonraki görev olup olmadığına göre kontrol stratejisi değişir
      if (nextTimeIndex !== -1) {
        // Bir sonraki görev var
        const nextTime = orderedTimes[nextTimeIndex];
        const nextTimeObj = TimeService.timeStringToDateTime(nextTime);
        
        // Bir sonraki görevin tolerans başlangıcı
        const nextTimeToleranceStart = new Date(nextTimeObj.getTime());
        nextTimeToleranceStart.setMinutes(nextTimeToleranceStart.getMinutes() - startTolerance);
        
        // Şu anki zaman, bir sonraki görevin tolerans başlangıcından önce mi?
        if (now < nextTimeToleranceStart) {
          // Bir sonraki görevin tolerans başlangıcına daha var, bu yüzden şu anki görev aktif
          console.log('TaskTimeService: Görev zamanı aktif -', lastPassedTime, '(MAVİ) - Henüz kaçırılmamış');
          return {
            status: TaskTimeStatus.active,
            activeTime: lastPassedTime,
          };
        }
      } else {
        // Son görev için özel kontrol - 1 saatlik (60 dk) tolerans uygula
        const lastPassedTimeObj = TimeService.timeStringToDateTime(lastPassedTime);
        
        // Son görev için tolerans bitişi (1 saat sonra)
        const lastTaskToleranceEnd = new Date(lastPassedTimeObj.getTime());
        lastTaskToleranceEnd.setMinutes(lastTaskToleranceEnd.getMinutes() + 60);
        
        // Şu anki zaman, son görevin tolerans bitişini geçmedi mi?
        if (now < lastTaskToleranceEnd) {
          // Son görevin tolerans süresi henüz dolmamış, görev aktif
          console.log('TaskTimeService: Son görev zamanı aktif -', lastPassedTime, '(MAVİ) - 60 dakika tolerans süresi içinde');
          return {
            status: TaskTimeStatus.active,
            activeTime: lastPassedTime,
          };
        }
      }
    }
    
    // 3. Kaçırılmış görev var mı kontrol et
    let missedTime: string | null = null;
    let foundMissed = false;
    
    // Zamanları sıralı şekilde kontrol et
    for (let i = 0; i < orderedTimes.length; i++) {
      const timeString = orderedTimes[i];
      const isPassed = await TimeService.isTimePassed(timeString);
      
      // Eğer zaman geçmiş ve görev tamamlanmamışsa
      if (isPassed && currentStatus === 'accepted') {
        // Bir sonraki görevin zamanını ve toleransını kontrol et
        if (i < orderedTimes.length - 1) {
          // Bir sonraki görev var
          const nextTimeString = orderedTimes[i + 1];
          
          // Şu anki zamanı DateTime olarak al
          const taskTime = TimeService.timeStringToDateTime(timeString);
          
          // Bir sonraki görevin zamanını DateTime olarak al
          const nextTaskTime = TimeService.timeStringToDateTime(nextTimeString);
          
          // Bir sonraki görevin tolerans başlangıcı (standart tolerans)
          const nextTaskToleranceStart = new Date(nextTaskTime.getTime());
          nextTaskToleranceStart.setMinutes(nextTaskToleranceStart.getMinutes() - startTolerance);
          
          // Şu anki zaman, bir sonraki görevin tolerans başlangıcını geçti mi?
          if (now > nextTaskToleranceStart) {
            // Zaman geçmiş ve bir sonraki görevin tolerans zamanı başlamış
            console.log('TaskTimeService: Görev zamanı kaçırılmış -', timeString, '(KIRMIZI) - Bir sonraki görevin tolerans zamanı başladı');
            foundMissed = true;
            missedTime = timeString;
            break; // Kaçırılmış görevi bulduk, devam etmeye gerek yok
          }
        } else {
          // Son görev için özel kontrol - 1 saatlik (60 dk) tolerans uygula
          const taskTime = TimeService.timeStringToDateTime(timeString);
          
          // Son görev için tolerans bitişi (1 saat sonra)
          const lastTaskToleranceEnd = new Date(taskTime.getTime());
          lastTaskToleranceEnd.setMinutes(lastTaskToleranceEnd.getMinutes() + 60);
          
          // Şu anki zaman, son görevin tolerans bitişini geçti mi?
          if (now > lastTaskToleranceEnd) {
            // Zaman geçmiş ve son görevin tolerans süresi sona ermiş (1 saat)
            console.log('TaskTimeService: Son görev zamanı kaçırılmış -', timeString, '(KIRMIZI) - 60 dakika tolerans süresi doldu');
            foundMissed = true;
            missedTime = timeString;
            break; // Kaçırılmış görevi bulduk, devam etmeye gerek yok
          }
        }
      }
    }
    
    // Eğer kaçırılmış bir görev bulduysa döndür
    if (foundMissed && missedTime) {
      console.log('TaskTimeService: Kaçırılmış görev döndürülüyor -', missedTime, '(KIRMIZI)');
      return {
        status: TaskTimeStatus.missed,
        activeTime: missedTime,
      };
    }
    
    // 4. Hiçbir zaman için özel durum yoksa, bir sonraki zamanı bul
    const nextTime = this._findNextTime(repetitionTimes);
    console.log('TaskTimeService: Bir sonraki görev zamanı -', nextTime, '(GRİ)');
    
    return {
      status: TaskTimeStatus.notYetDue,
      activeTime: nextTime,
    };
  }
  
  /**
   * Bir sonraki zamanı bulur (bugün için)
   * @param repetitionTimes Tekrarlanan zamanlar listesi
   * @returns Bir sonraki zaman veya ilk zaman
   */
  private _findNextTime(repetitionTimes: string[]): string | null {
    if (!repetitionTimes || repetitionTimes.length === 0) return null;
    
    const now = new Date();
    let nextTime: string | null = null;
    let nextDateTime: Date | null = null;
    
    for (const timeString of repetitionTimes) {
      const parts = timeString.split(':');
      const hour = parseInt(parts[0], 10);
      const minute = parseInt(parts[1], 10);
      
      const taskTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute,
      );
      
      if (taskTime > now) {
        if (!nextDateTime || taskTime < nextDateTime) {
          nextDateTime = taskTime;
          nextTime = timeString;
        }
      }
    }
    
    // Eğer bugün için daha geç zaman yoksa, ilk zamanı göster
    if (!nextTime && repetitionTimes.length > 0) {
      return repetitionTimes[0];
    }
    
    return nextTime;
  }
  
  /**
   * Görev zamanına göre renk belirler
   * @param status Görev zamanı durumu
   * @param currentStatus Görevin güncel durumu
   * @returns Hex renk kodu
   */
  public getTaskTimeColor(status: TaskTimeStatus, currentStatus: string): string {
    // Öncelikle görevin durumuna bakarak renk belirle
    if (currentStatus === 'started') {
      return '#795548'; // Başlatılmış görevler için kahverengi
    } else if (currentStatus === 'completed') {
      return '#4CAF50'; // Tamamlanmış görevler için yeşil
    }
    
    // Görevin zaman durumuna göre renk belirle
    switch (status) {
      case TaskTimeStatus.approaching:
      case TaskTimeStatus.active:
        return '#2196F3';  // Yaklaşan veya aktif görevler için mavi
      case TaskTimeStatus.missed:
        return '#F44336';  // Kaçırılmış görevler için kırmızı
      case TaskTimeStatus.notYetDue:
        return '#9E9E9E';  // Henüz zamanı gelmemiş görevler için gri
      case TaskTimeStatus.completed:
        return '#4CAF50';  // Tamamlanmış görevler için yeşil
      case TaskTimeStatus.started:
        return '#795548';  // Başlatılmış görevler için kahverengi
      default:
        return '#9E9E9E';  // Varsayılan gri
    }
  }
  
  /**
   * Belirli bir tarih için geçmiş zamanları kontrol eder
   * @param repetitionTimes Tekrarlanan zamanlar
   * @param currentStatus Görevin güncel durumu
   * @param completedTimes Tamamlanmış zamanlar
   * @param missedTimes Kaçırılmış zamanlar
   * @returns Yeni kaçırılmış zamanlar listesi
   */
  public async checkMissedTimes(
    repetitionTimes: string[], 
    currentStatus: string, 
    completedTimes: string[], 
    missedTimes: string[]
  ): Promise<string[]> {
    const newMissedTimes: string[] = [];
    
    // Sadece görev kabul edilmiş durumda ise kontrol et
    if (currentStatus !== 'accepted') {
      return newMissedTimes;
    }
    
    // Tekrarlanan zamanları sırala (erken saat önce olacak şekilde)
    repetitionTimes.sort();
    
    // Şu anki zamanı al
    const now = await TimeService.getCurrentTime();
    
    // Her zaman için kontrol et
    for (let i = 0; i < repetitionTimes.length; i++) {
      const timeString = repetitionTimes[i];
      const isPassed = await TimeService.isTimePassed(timeString);
      
      // Zaten kaydedilmiş veya tamamlanmış ise atla
      if (completedTimes.includes(timeString) || missedTimes.includes(timeString)) {
        continue;
      }
      
      // Eğer zaman geçmiş ve görev tamamlanmamışsa
      if (isPassed) {
        // Bir sonraki görevin zamanını ve toleransını kontrol et
        if (i < repetitionTimes.length - 1) {
          // Bir sonraki görev var
          const nextTimeString = repetitionTimes[i + 1];
          
          // Şu anki zamanı DateTime olarak al
          const taskTime = TimeService.timeStringToDateTime(timeString);
          
          // Bir sonraki görevin zamanını DateTime olarak al
          const nextTaskTime = TimeService.timeStringToDateTime(nextTimeString);
          
          // Bir sonraki görevin tolerans başlangıcı (standart tolerans 15 dk)
          const nextTaskToleranceStart = new Date(nextTaskTime.getTime());
          nextTaskToleranceStart.setMinutes(nextTaskToleranceStart.getMinutes() - 15);
          
          // Şu anki zaman, bir sonraki görevin tolerans başlangıcını geçti mi?
          if (now > nextTaskToleranceStart) {
            // Zaman geçmiş ve bir sonraki görevin tolerans zamanı başlamış
            newMissedTimes.push(timeString);
          }
        } else {
          // Son görev için özel kontrol - 1 saatlik (60 dk) tolerans uygula
          // Şu anki zamanı DateTime olarak al
          const taskTime = TimeService.timeStringToDateTime(timeString);
          
          // Son görev için tolerans bitişi (1 saat sonra)
          const lastTaskToleranceEnd = new Date(taskTime.getTime());
          lastTaskToleranceEnd.setMinutes(lastTaskToleranceEnd.getMinutes() + 60);
          
          // Şu anki zaman, son görevin tolerans bitişini geçti mi?
          if (now > lastTaskToleranceEnd) {
            // Zaman geçmiş ve son görevin tolerans süresi sona ermiş (1 saat)
            newMissedTimes.push(timeString);
          }
        }
      }
    }
    
    return newMissedTimes;
  }
}

// Singleton olarak dışa aktar
export default TaskTimeService.getInstance(); 