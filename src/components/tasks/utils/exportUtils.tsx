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
      { header: 'Haftanın Günleri', key: 'weekDays', width: 30 },
      { header: 'Görev Saatleri', key: 'times', width: 30 },
      { header: 'Tolerans', key: 'tolerance', width: 12 },
      { header: 'Personel', key: 'personnel', width: 20 },
      { header: 'Açıklama', key: 'description', width: 40 }
    ];
    
    // Başlık stilini uygula
    worksheet.getRow(1).eachCell(cell => {
      cell.style = getHeaderStyle();
    });
    
    // Haftanın günlerini adlandırma
    const weekDayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    
    // Görev verilerini ekle
    tasks.forEach(task => {
      // Haftanın günleri
      let weekDaysText = '-';
      if (task.weekDays && task.weekDays.length > 0) {
        const dayNames = task.weekDays.map((day: number) => weekDayNames[day]);
        weekDaysText = dayNames.join(', ');
      }
      
      // Görev saatleri
      const taskTimes = task.repetitionTimes && task.repetitionTimes.length > 0
        ? task.repetitionTimes.join(', ')
        : '-';
      
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
      { header: 'Ayın Günü', key: 'monthDay', width: 15 },
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
      
      // Ayın günü
      const monthDay = task.monthDay ? `${task.monthDay}` : '-';
      
      // Tolerans bilgisi
      const toleranceInfo = `${task.startTolerance || 15} dk`;
      
      // Satır ekleme
      worksheet.addRow({
        status: getStatusLabel(task.status || 'pending'),
        name: task.name,
        monthDay: monthDay,
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