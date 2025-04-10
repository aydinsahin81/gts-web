import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';

// Ortak Excel başlık stilini tanımlar
const getHeaderStyle = () => ({
  font: { bold: true, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4F81BD' } },
  border: {
    top: { style: 'thin' as const },
    left: { style: 'thin' as const },
    bottom: { style: 'thin' as const },
    right: { style: 'thin' as const }
  }
});

// Ortak hücre stilini tanımlar
const getCellStyle = (rowNumber: number) => {
  const fillColor = rowNumber % 2 === 0 ? 'FFF2F2F2' : 'FFFFFFFF';
  return {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: fillColor } },
    border: {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  };
};

// Haftalık günleri temsil eden dizi
const weekDayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

// Ay isimlerini temsil eden dizi
const monthNames = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

// Gün adını alma yardımcı fonksiyonu
const getDayName = (dayNumber: number) => {
  const day = weekDayNames[dayNumber] || `Gün ${dayNumber}`;
  return day;
};

// Ay adını alma yardımcı fonksiyonu
const getMonthName = (monthNumber: number): string => {
  return monthNames[monthNumber] || `Ay ${monthNumber}`;
};

// Görevin günlerini ve ilgili saatlerini çıkarma fonksiyonu
const getTaskDays = (task: any) => {
  if (!task || !task.days) return [];
  
  return Object.keys(task.days).map(day => ({
    day: parseInt(day),
    dayName: getDayName(parseInt(day)),
    repetitionTimes: task.days[day].repetitionTimes || [],
    dailyRepetitions: task.days[day].dailyRepetitions || 1
  }));
};

// Görevi ay/gün şeklinde formatlanmış şekilde döndüren yardımcı fonksiyon
const getTaskMonthDays = (task: any) => {
  if (!task) return [];
  
  const result = [];
  
  // task içindeki ay bilgilerini döngüye alıyoruz
  for (const key in task) {
    if (key.startsWith('month')) {
      const monthNumber = parseInt(key.replace('month', ''));
      const monthData = task[key];
      const monthName = getMonthName(monthNumber);
      
      const days = [];
      
      // Ay içindeki günleri döngüye alıyoruz
      for (const dayKey in monthData) {
        if (dayKey.startsWith('day')) {
          const dayNumber = parseInt(dayKey.replace('day', ''));
          const dayData = monthData[dayKey];
          
          days.push({
            day: dayNumber,
            dailyRepetitions: dayData.dailyRepetitions || 1,
            repetitionTimes: dayData.repetitionTimes || []
          });
        }
      }
      
      if (days.length > 0) {
        // Günleri sayısal olarak sırala
        days.sort((a, b) => a.day - b.day);
        
        result.push({
          month: monthNumber,
          monthName,
          days
        });
      }
    }
  }
  
  // Ayları sayısal olarak sırala
  result.sort((a, b) => a.month - b.month);
  
  return result;
};

// Günlük görevleri Excel'e aktarma
export const exportDailyTasksToExcel = async (
  tasks: any[],
  getStatusLabel: (status: string) => string
) => {
  try {
    // Excel workbook oluştur
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Günlük Görevler');
    
    // Sütun başlıklarını tanımla
    worksheet.columns = [
      { header: 'Durum', key: 'status', width: 15 },
      { header: 'Görev Adı', key: 'name', width: 30 },
      { header: 'Görev Saatleri', key: 'times', width: 30 },
      { header: 'Tarih', key: 'date', width: 20 },
      { header: 'Tolerans', key: 'tolerance', width: 12 },
      { header: 'Personel', key: 'personnel', width: 20 },
      { header: 'Açıklama', key: 'description', width: 40 }
    ];
    
    // Başlık stilini uygula
    worksheet.getRow(1).eachCell(cell => {
      cell.style = getHeaderStyle();
    });
    
    // Görev verilerini ekle
    tasks.forEach(task => {
      // Görev saatleri
      const taskTimes = task.repetitionTimes && task.repetitionTimes.length > 0
        ? task.repetitionTimes.join(', ')
        : '-';
      
      // Tarih bilgisi
      let dateInfo = '-';
      if (task.status === 'completed') {
        dateInfo = task.fromDatabase && task.completionDate 
          ? task.completionDate 
          : (task.completedAt ? new Date(task.completedAt).toLocaleDateString('tr-TR') : '-');
      } else if (task.status === 'missed') {
        dateInfo = task.fromDatabase && task.missedDate 
          ? task.missedDate 
          : (task.missedAt ? new Date(task.missedAt).toLocaleDateString('tr-TR') : '-');
      }
      
      // Tolerans bilgisi
      const toleranceInfo = task.isRecurring ? `${task.startTolerance || 15} dk` : '-';
      
      // Satır ekleme
      worksheet.addRow({
        status: getStatusLabel(task.status),
        name: task.name,
        times: taskTimes,
        date: dateInfo,
        tolerance: toleranceInfo,
        personnel: task.personnelName || 'Atanmamış',
        description: task.description || ''
      });
    });
    
    // Zebrastripe (alternatif satır renklendirme)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // başlığı atla
        row.eachCell(cell => {
          cell.style = getCellStyle(rowNumber);
        });
      }
    });
    
    // Excel dosyasını oluştur ve indir
    const buffer = await workbook.xlsx.writeBuffer();
    const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    saveAs(new Blob([buffer]), `Günlük_Görevler_${currentDate}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Excel dışa aktarma hatası:', error);
    return false;
  }
};

// Haftalık görevleri Excel'e aktarma
export const exportWeeklyTasksToExcel = async (
  tasks: any[],
  getStatusLabel: (status: string) => string
) => {
  try {
    // Excel workbook oluştur
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Haftalık Görevler');
    
    // Sütun başlıklarını tanımla
    worksheet.columns = [
      { header: 'Durum', key: 'status', width: 15 },
      { header: 'Görev Adı', key: 'name', width: 30 },
      { header: 'Günler', key: 'weekDays', width: 25 },
      { header: 'Görev Saatleri', key: 'times', width: 30 },
      { header: 'Tolerans', key: 'tolerance', width: 12 },
      { header: 'Personel', key: 'personnel', width: 20 },
      { header: 'Açıklama', key: 'description', width: 40 }
    ];
    
    // Başlık stilini uygula
    worksheet.getRow(1).eachCell(cell => {
      cell.style = getHeaderStyle();
    });
    
    // Görev verilerini ekle
    tasks.forEach(task => {
      // Görev günlerini çıkar
      const taskDays = getTaskDays(task);
      
      // Haftanın günleri
      let weekDaysText = '-';
      if (taskDays.length > 0) {
        weekDaysText = taskDays.map(day => day.dayName).join(', ');
      }
      
      // Görev saatleri
      let taskTimes = '-';
      if (taskDays.length > 0) {
        // Her gün için saatleri ekle
        const timesByDay = taskDays.map(day => {
          const times = day.repetitionTimes.join(', ');
          return `${day.dayName}: ${times}`;
        });
        taskTimes = timesByDay.join(' | ');
      } else if (task.repetitionTimes && task.repetitionTimes.length > 0) {
        // Eğer gün bilgisi yoksa ama saatler varsa
        taskTimes = task.repetitionTimes.join(', ');
      } else if (task.taskTime) {
        // Tamamlanmış görevler için
        taskTimes = task.taskTime;
      }
      
      // Tarih bilgisi (tamamlanmış görevler için)
      let dateInfo = '-';
      if (task.status === 'completed' || task.status === 'missed') {
        dateInfo = task.taskDate || '-';
      }
      
      // Tolerans bilgisi
      const toleranceInfo = `${task.startTolerance || 15} dk`;
      
      // Satır ekleme
      worksheet.addRow({
        status: getStatusLabel(task.status || 'pending'),
        name: task.name,
        weekDays: weekDaysText,
        times: taskTimes,
        tolerance: toleranceInfo,
        personnel: task.personnelName || 'Atanmamış',
        description: task.description || ''
      });
    });
    
    // Zebrastripe (alternatif satır renklendirme)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // başlığı atla
        row.eachCell(cell => {
          cell.style = getCellStyle(rowNumber);
        });
      }
    });
    
    // Excel dosyasını oluştur ve indir
    const buffer = await workbook.xlsx.writeBuffer();
    const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    saveAs(new Blob([buffer]), `Haftalık_Görevler_${currentDate}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Excel dışa aktarma hatası:', error);
    return false;
  }
};

// Aylık görevleri Excel'e aktarma
export const exportMonthlyTasksToExcel = async (
  tasks: any[],
  getStatusLabel: (status: string) => string
) => {
  try {
    // Excel workbook oluştur
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Aylık Görevler');
    
    // Sütun başlıklarını tanımla
    worksheet.columns = [
      { header: 'Durum', key: 'status', width: 15 },
      { header: 'Görev Adı', key: 'name', width: 30 },
      { header: 'Aylar', key: 'months', width: 20 },
      { header: 'Günler/Saatler', key: 'daysAndTimes', width: 40 },
      { header: 'Tolerans', key: 'tolerance', width: 12 },
      { header: 'Personel', key: 'personnel', width: 20 },
      { header: 'Açıklama', key: 'description', width: 40 }
    ];
    
    // Başlık stilini uygula
    worksheet.getRow(1).eachCell(cell => {
      cell.style = getHeaderStyle();
    });
    
    // Görev verilerini ekle
    tasks.forEach(task => {
      // Aylar ve günler bilgisini çıkart
      const monthDays = getTaskMonthDays(task);
      
      // Aylar
      let monthsText = '-';
      if (monthDays.length > 0) {
        monthsText = monthDays.map(month => month.monthName).join(', ');
      } else if (task.monthDay) {
        // Eğer eski formatta aylık görev ise
        monthsText = 'Her Ay';
      }
      
      // Günler ve saatler
      let daysAndTimesText = '-';
      if (monthDays.length > 0) {
        // Her ay için günler ve saatler
        const monthDaysTexts = monthDays.map(month => {
          // Her ay içindeki günler
          const daysInfo = month.days.map(day => {
            // Gün ve saatler
            const times = day.repetitionTimes.join(', ');
            return `${day.day}. gün: ${times}`;
          });
          return `${month.monthName}: ${daysInfo.join(' | ')}`;
        });
        daysAndTimesText = monthDaysTexts.join('\n');
      } else if (task.monthDay && task.repetitionTimes && task.repetitionTimes.length > 0) {
        // Eğer eski formatta aylık görev ise
        daysAndTimesText = `Her ayın ${task.monthDay}. günü: ${task.repetitionTimes.join(', ')}`;
      } else if (task.taskTime) {
        // Tamamlanan görevler için
        daysAndTimesText = task.taskTime;
      }
      
      // Tolerans bilgisi
      const toleranceInfo = `${task.startTolerance || 15} dk`;
      
      // Satır ekleme
      worksheet.addRow({
        status: getStatusLabel(task.status || 'pending'),
        name: task.name,
        months: monthsText,
        daysAndTimes: daysAndTimesText,
        tolerance: toleranceInfo,
        personnel: task.personnelName || 'Atanmamış',
        description: task.description || ''
      });
    });
    
    // Zebrastripe (alternatif satır renklendirme)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // başlığı atla
        row.eachCell(cell => {
          cell.style = getCellStyle(rowNumber);
        });
        
        // Günler/Saatler sütunu için yüksek satır
        row.getCell('daysAndTimes').alignment = {
          wrapText: true,
          vertical: 'top'
        };
        // Satır yüksekliğini ayarla
        row.height = 60;
      }
    });
    
    // Excel dosyasını oluştur ve indir
    const buffer = await workbook.xlsx.writeBuffer();
    const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    saveAs(new Blob([buffer]), `Aylık_Görevler_${currentDate}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Excel dışa aktarma hatası:', error);
    return false;
  }
};

// Yıllık görevleri Excel'e aktarma
export const exportYearlyTasksToExcel = async (
  tasks: any[],
  getStatusLabel: (status: string) => string
) => {
  try {
    // Excel workbook oluştur
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Yıllık Görevler');
    
    // Sütun başlıklarını tanımla
    worksheet.columns = [
      { header: 'Durum', key: 'status', width: 15 },
      { header: 'Görev Adı', key: 'name', width: 30 },
      { header: 'Tarih', key: 'yearDate', width: 15 },
      { header: 'Görev Saatleri', key: 'times', width: 30 },
      { header: 'Tolerans', key: 'tolerance', width: 12 },
      { header: 'Personel', key: 'personnel', width: 20 },
      { header: 'Açıklama', key: 'description', width: 40 }
    ];
    
    // Başlık stilini uygula
    worksheet.getRow(1).eachCell(cell => {
      cell.style = getHeaderStyle();
    });
    
    // Görev verilerini ekle
    tasks.forEach(task => {
      // Görev saatleri
      const taskTimes = task.repetitionTimes && task.repetitionTimes.length > 0
        ? task.repetitionTimes.join(', ')
        : '-';
      
      // Yıllık tarih
      const yearDate = task.yearDate ? task.yearDate : '-';
      
      // Tolerans bilgisi
      const toleranceInfo = `${task.startTolerance || 15} dk`;
      
      // Satır ekleme
      worksheet.addRow({
        status: getStatusLabel(task.status || 'pending'),
        name: task.name,
        yearDate: yearDate,
        times: taskTimes,
        tolerance: toleranceInfo,
        personnel: task.personnelName || 'Atanmamış',
        description: task.description || ''
      });
    });
    
    // Zebrastripe (alternatif satır renklendirme)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // başlığı atla
        row.eachCell(cell => {
          cell.style = getCellStyle(rowNumber);
        });
      }
    });
    
    // Excel dosyasını oluştur ve indir
    const buffer = await workbook.xlsx.writeBuffer();
    const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    saveAs(new Blob([buffer]), `Yıllık_Görevler_${currentDate}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Excel dışa aktarma hatası:', error);
    return false;
  }
};

// Excel butonunu oluşturan bileşen
export const ExcelExportButton = ({
  tasks,
  taskType,
  loading,
  getStatusLabel
}: {
  tasks: any[];
  taskType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  loading: boolean;
  getStatusLabel: (status: string) => string;
}) => {
  // Excel'e aktarma fonksiyonu
  const handleExport = async () => {
    try {
      console.log(`Exporting ${taskType} tasks. Total tasks: ${tasks.length}`); // Debug için log
      
      let result = false;
      
      switch (taskType) {
        case 'daily':
          result = await exportDailyTasksToExcel(tasks, getStatusLabel);
          break;
        case 'weekly':
          result = await exportWeeklyTasksToExcel(tasks, getStatusLabel);
          break;
        case 'monthly':
          result = await exportMonthlyTasksToExcel(tasks, getStatusLabel);
          break;
        case 'yearly':
          result = await exportYearlyTasksToExcel(tasks, getStatusLabel);
          break;
      }
      
      if (!result) {
        alert('Excel dosyası oluşturulurken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Excel dışa aktarma hatası:', error);
      alert('Excel dosyası oluşturulurken bir hata oluştu.');
    }
  };
  
  // Buton metni
  const getButtonText = () => {
    switch (taskType) {
      case 'daily':
        return 'Günlük Görevleri İndir';
      case 'weekly':
        return 'Haftalık Görevleri İndir';
      case 'monthly':
        return 'Aylık Görevleri İndir';
      case 'yearly':
        return 'Yıllık Görevleri İndir';
      default:
        return 'Excel İndir';
    }
  };
  
  return (
    <Button
      variant="contained"
      color="info"
      startIcon={<DownloadIcon />}
      onClick={handleExport}
      disabled={loading || tasks.length === 0}
      size="small"
    >
      {getButtonText()}
    </Button>
  );
}; 