import { database } from '../firebase';
import { ref, get, set, push, update, query, orderByChild, equalTo } from 'firebase/database';

// Bildirim gönderme durumu için tip tanımı
export interface NotificationStatus {
  success: boolean;
  message: string;
  sentCount?: number;
  errorCount?: number;
}

// Bildirim tipi
export interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  recipients: string[];
  status: 'pending' | 'sent' | 'failed';
  sentCount?: number;
  errorCount?: number;
  sentAt?: number;
}

// Personel tipi
export interface Personnel {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
  department?: string;
  fcmToken?: string;
  companyId?: string;
}

// İsim getirme yardımcı fonksiyonu
export function getPersonFullName(person: Personnel): string {
  return `${person.firstName} ${person.lastName}`;
}

// Bildirim servisi sınıfı
class NotificationService {
  // FCM API anahtarı
  private readonly FCM_SERVER_KEY = 'AAAAmP-JJYo:APA91bH1RrBB25h1l6pVZ3_mWqRd9XE1LqbN0wYbDsZfRlZvEJKL4o7XEd3MGx-Rqjf_DdF_DQm0UKlCl8U-XRkvCXPZeDjDQdIwXm9Y8wkGo1UGKA-nrN9fLADDdLVzVcSI6GINzJn0';
  
  // Bildirim işleme durumu
  private isProcessingNotifications = false;
  
  // Yeni bildirim olayları için callback
  private newNotificationCallbacks: ((notifications: Notification[]) => void)[] = [];
  
  // Kullanıcının şirket ID'sini alma
  async getCurrentUserCompany(userId: string): Promise<string | null> {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        return userData.companyId || null;
      } else {
        console.log(`${userId} kullanıcısı için şirket ID'si bulunamadı`);
        return null;
      }
    } catch (error) {
      console.error('Şirket ID alınırken hata:', error);
      return null;
    }
  }

  // Kullanıcı id'si ile token'ı alır
  async getFcmTokenByUserId(userId: string): Promise<string | null> {
    try {
      const tokenRef = ref(database, `users/${userId}/fcmToken`);
      const snapshot = await get(tokenRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      } else {
        console.log(`${userId} kullanıcısı için FCM token bulunamadı`);
        return null;
      }
    } catch (error) {
      console.error('FCM token alınırken hata:', error);
      return null;
    }
  }

  // Bildirim servisini başlat - admin oturum açtığında çağrılacak
  startNotificationProcessing(companyId: string, intervalMinutes = 1) {
    console.log('Bildirim işleme servisi başlatıldı');
    
    // İlk çalıştırmayı hemen yap
    this.processPendingNotifications(companyId);
    
    // Sonra düzenli aralıklarla devam et
    const intervalId = setInterval(() => {
      this.processPendingNotifications(companyId);
    }, intervalMinutes * 60 * 1000);
    
    // Temizleme fonksiyonunu döndür - kullanıcı çıkış yaptığında çağrılacak
    return () => {
      clearInterval(intervalId);
      console.log('Bildirim işleme servisi durduruldu');
    };
  }
  
  // Yeni bildirim olayına abone ol
  onNewNotifications(callback: (notifications: Notification[]) => void) {
    this.newNotificationCallbacks.push(callback);
    return () => {
      this.newNotificationCallbacks = this.newNotificationCallbacks.filter(cb => cb !== callback);
    };
  }
  
  // Bekleyen bildirimleri işle
  async processPendingNotifications(companyId: string): Promise<void> {
    // Eğer zaten işlem yapılıyorsa çık
    if (this.isProcessingNotifications) {
      return;
    }
    
    this.isProcessingNotifications = true;
    try {
      // Bekleyen bildirimleri al
      const notificationsRef = ref(database, `companies/${companyId}/notifications`);
      const pendingQuery = query(notificationsRef, orderByChild('status'), equalTo('pending'));
      const snapshot = await get(pendingQuery);
      
      if (!snapshot.exists()) {
        console.log('Bekleyen bildirim bulunamadı');
        return;
      }
      
      const pendingNotifications: Notification[] = [];
      const processedNotifications: Notification[] = [];
      
      // Bildirimleri işle
      snapshot.forEach((childSnapshot) => {
        const id = childSnapshot.key;
        const notificationData = childSnapshot.val();
        
        pendingNotifications.push({
          id: id || '',
          ...notificationData
        });
      });
      
      console.log(`${pendingNotifications.length} adet bekleyen bildirim bulundu`);
      
      // Her bir bildirimi işle
      for (const notification of pendingNotifications) {
        const { id, title, body, recipients } = notification;
        
        // FCM ile bildirimi gönder
        const result = await this.sendDirectFCMNotification(recipients, title, body);
        
        // Durumu güncelle (string değil kesin tiplerle)
        const status = result.sentCount > 0 ? 'sent' as const : 'failed' as const;
        const notificationRef = ref(database, `companies/${companyId}/notifications/${id}`);
        await update(notificationRef, { 
          status,
          sentAt: Date.now(),
          sentCount: result.sentCount,
          errorCount: result.errorCount
        });
        
        // İşlenen bildirimleri kaydet (as Notification tipinde)
        const updatedNotification: Notification = {
          ...notification,
          status,
          sentCount: result.sentCount,
          errorCount: result.errorCount
        };
        processedNotifications.push(updatedNotification);
      }
      
      // Bildirim olayını tetikle
      if (processedNotifications.length > 0) {
        this.newNotificationCallbacks.forEach(callback => {
          callback(processedNotifications);
        });
      }
      
    } catch (error) {
      console.error('Bildirim işleme hatası:', error);
    } finally {
      this.isProcessingNotifications = false;
    }
  }

  // Bildirimi veritabanına kaydet (gerçek FCM gönderimi backend'de yapılacak)
  async sendNotification(
    companyId: string, 
    userIds: string[], 
    title: string, 
    body: string
  ): Promise<NotificationStatus> {
    try {
      if (!companyId || userIds.length === 0) {
        return {
          success: false,
          message: 'Geçersiz şirket ID veya kullanıcı listesi',
        };
      }

      // Bildirim verilerini hazırla
      const notificationData = {
        title,
        body,
        createdAt: Date.now(),
        recipients: userIds,
        status: 'pending' // işleme alındı durumu
      };

      // Bildirimi veritabanına kaydet
      const notificationsRef = ref(database, `companies/${companyId}/notifications`);
      const newNotifRef = push(notificationsRef);
      await set(newNotifRef, notificationData);

      // Bildirimi hemen işlemeye başla
      setTimeout(() => {
        this.processPendingNotifications(companyId);
      }, 1000);
      
      return {
        success: true,
        message: 'Bildirim başarıyla kaydedildi ve gönderme kuyruğuna alındı',
        sentCount: 0,
        errorCount: 0
      };
    } catch (error) {
      console.error('Bildirim gönderme hatası:', error);
      return {
        success: false,
        message: `Bildirim gönderilirken hata oluştu: ${error}`,
      };
    }
  }

  // Doğrudan FCM üzerinden bildirim gönderme (HTTP v1 API)
  async sendDirectFCMNotification(
    userIds: string[],
    title: string,
    body: string
  ): Promise<{ sentCount: number; errorCount: number }> {
    let sentCount = 0;
    let errorCount = 0;
    
    // Tüm kullanıcıların FCM token'larını getir
    const tokens: string[] = [];
    for (const userId of userIds) {
      const token = await this.getFcmTokenByUserId(userId);
      if (token) {
        tokens.push(token);
      } else {
        errorCount++;
      }
    }
    
    if (tokens.length === 0) {
      return { sentCount: 0, errorCount: userIds.length };
    }
    
    try {
      // FCM HTTP v1 API için URL
      const fcmUrl = 'https://fcm.googleapis.com/fcm/send';
      
      // Toplu mesaj gönderimi
      const response = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${this.FCM_SERVER_KEY}`
        },
        body: JSON.stringify({
          registration_ids: tokens,
          notification: {
            title,
            body,
            sound: 'default'
          },
          data: {
            title,
            body,
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          },
          priority: 'high',
          content_available: true
        })
      });
      
      const responseData = await response.json();
      
      if (responseData.success > 0) {
        sentCount = responseData.success;
        errorCount += (responseData.failure || 0);
        
        console.log(`FCM bildirimi gönderildi: ${sentCount} başarılı, ${errorCount} başarısız`);
      } else {
        errorCount += tokens.length;
        console.error('FCM bildirimi gönderirken hata:', responseData);
      }
    } catch (error) {
      console.error('FCM API çağrısı sırasında hata:', error);
      errorCount += tokens.length;
    }
    
    return { sentCount, errorCount };
  }
  
  // Son gönderilen bildirimleri getir
  async getRecentNotifications(companyId: string, limit = 10): Promise<Notification[]> {
    try {
      const notificationsRef = ref(database, `companies/${companyId}/notifications`);
      const snapshot = await get(notificationsRef);
      
      const notifications: Notification[] = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const id = childSnapshot.key;
          const data = childSnapshot.val();
          
          notifications.push({
            id: id || '',
            ...data
          });
        });
      }
      
      // Tarihe göre sırala (en yeniler en üstte)
      return notifications
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
        
    } catch (error) {
      console.error('Bildirimler alınırken hata:', error);
      return [];
    }
  }

  // Performans metriklerine göre personel filtreleme
  async getPersonnelByPerformance(
    companyId: string, 
    isGoodPerformance: boolean
  ): Promise<Personnel[]> {
    try {
      // Tüm personeli al
      const allPersonnel = await this.getAllPersonnel(companyId);
      
      // İleri düzey veritabanı sorguları burada yapılacak
      // Şimdilik basit bir simulasyon yapıyoruz
      
      // Örnek: İyi performansı olanlar (id'nin son karakteri çift olanlar)
      // Kötü performansı olanlar (id'nin son karakteri tek olanlar)
      return allPersonnel.filter(person => {
        const lastChar = parseInt(person.id.slice(-1), 10);
        const isEven = lastChar % 2 === 0;
        return isGoodPerformance ? isEven : !isEven;
      });
    } catch (error) {
      console.error('Performans bazlı personel filtrelemede hata:', error);
      return [];
    }
  }

  // Görevlerini kabul etmeyen personel listesi
  async getPersonnelWithUnacceptedTasks(companyId: string): Promise<Personnel[]> {
    try {
      // Tüm personeli al
      const allPersonnel = await this.getAllPersonnel(companyId);
      
      // Görevleri al
      const tasksRef = ref(database, `companies/${companyId}/tasks`);
      const snapshot = await get(tasksRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const tasksData = snapshot.val();
      const unacceptedPersonnelIds = new Set<string>();
      
      // Kabul edilmemiş görevi olan personelleri bul
      for (const taskId in tasksData) {
        const task = tasksData[taskId];
        if (task.status === 'pending' && task.personnelId) {
          unacceptedPersonnelIds.add(task.personnelId);
        }
      }
      
      // Kabul edilmemiş görevi olan personelleri filtrele
      return allPersonnel.filter(person => unacceptedPersonnelIds.has(person.id));
    } catch (error) {
      console.error('Kabul edilmemiş görevleri olan personeller alınırken hata:', error);
      return [];
    }
  }

  // Personel listesini getir
  async getAllPersonnel(companyId: string): Promise<Personnel[]> {
    try {
      const personnelRef = ref(database, `companies/${companyId}/personnel`);
      const snapshot = await get(personnelRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const personnelData = snapshot.val();
      const personnelList: Personnel[] = [];
      
      // Veritabanı sonuçlarını Personnel nesnesine dönüştür
      for (const id in personnelData) {
        const person = personnelData[id];
        
        // Kullanıcı verilerini almak için
        const userRef = ref(database, `users/${id}`);
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          
          personnelList.push({
            id,
            firstName: person.firstName || userData.firstName || '',
            lastName: person.lastName || userData.lastName || '',
            email: userData.email || '',
            role: person.role || '',
            department: person.department || '',
            fcmToken: userData.fcmToken || '',
            companyId
          });
        }
      }
      
      return personnelList;
    } catch (error) {
      console.error('Personel listesi alınırken hata:', error);
      return [];
    }
  }
}

export default new NotificationService(); 