import { database } from '../firebase';
import { ref, get, set, push, update } from 'firebase/database';

// Bildirim gönderme durumu için tip tanımı
export interface NotificationStatus {
  success: boolean;
  message: string;
  sentCount?: number;
  errorCount?: number;
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

      return {
        success: true,
        message: 'Bildirim başarıyla kaydedildi ve gönderme kuyruğuna alındı',
        sentCount: userIds.length,
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

  // Performans metriklerine göre personel filtreleme (Bu kısım uygulamanın
  // veritabanı yapısına göre değişecektir, şimdilik örnek implementasyon)
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
}

export default new NotificationService(); 