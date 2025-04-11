import React, { useState } from 'react';
import { Box, Paper, Typography, Divider, Tabs, Tab, styled, Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemIcon, ListItemText, Tooltip, IconButton } from '@mui/material';
import PersonelListesi from './PersonelListesi';
import VardiyaListesi from './VardiyaListesi';
import GirisCikisRaporlari from './GirisCikisRaporlari';
import ToplamSure from './ToplamSure';
import { Download as DownloadIcon, QrCode as QrCodeIcon, Info as InfoIcon, Person as PersonIcon, Schedule as ScheduleIcon, AssignmentTurnedIn as ReportIcon, Timer as TimerIcon, Palette as PaletteIcon } from '@mui/icons-material';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../../contexts/AuthContext';
import VardiyaQrPrintModal from './VardiyaQrPrintModal';

// Kaydırılabilir ana içerik için styled component
const ScrollableContent = styled(Box)(({ theme }) => ({
  height: 'calc(100vh - 150px)', // Header için daha az alan bırakıyoruz
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#888',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#555',
  },
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vardiya-tabpanel-${index}`}
      aria-labelledby={`vardiya-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 1 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `vardiya-tab-${index}`,
    'aria-controls': `vardiya-tabpanel-${index}`,
  };
}

interface ShiftsProps {
  branchId?: string;
  isManager?: boolean;
}

const Shifts: React.FC<ShiftsProps> = ({ branchId, isManager = false }) => {
  const [value, setValue] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const { userDetails } = useAuth();
  const [qrDesignModalOpen, setQrDesignModalOpen] = useState(false);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleOpenInfoModal = () => {
    setInfoModalOpen(true);
  };

  const handleCloseInfoModal = () => {
    setInfoModalOpen(false);
  };

  // Geçerli sekmeye göre başlık belirleme
  const getTabTitle = () => {
    switch (value) {
      case 0:
        return "Personel Listesi";
      case 1:
        return "Vardiya Listesi";
      case 2:
        return "Giriş Çıkış Raporları";
      case 3:
        return "Toplam Süre";
      default:
        return "Vardiya Yönetimi";
    }
  };

  // Excel'e veri aktarma işlevi
  const exportToExcel = async () => {
    try {
      setExporting(true);
      
      // Excel workbook oluştur
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(getTabTitle());
      
      // Aktif sekmeye göre farklı sütun başlıkları ve veriler hazırla
      if (value === 0) { // Personel Listesi
        worksheet.columns = [
          { header: 'Ad Soyad', key: 'name', width: 30 },
          { header: 'Telefon', key: 'phone', width: 20 },
          { header: 'E-posta', key: 'email', width: 30 },
          { header: 'Vardiya', key: 'shift', width: 25 }
        ];
        
        // Özel olarak veri ekleme işlemi için event oluşturup yayınlanacak
        const event = new CustomEvent('export-personel-to-excel', { 
          detail: { 
            worksheet,
            branchId, // Şube filtresi için ID ekleyelim
            isManager // Yönetici modu bilgisini de ekleyelim
          } 
        });
        window.dispatchEvent(event);
      }
      else if (value === 1) { // Vardiya Listesi
        worksheet.columns = [
          { header: 'Vardiya Adı', key: 'name', width: 30 },
          { header: 'Giriş Saati', key: 'startTime', width: 15 },
          { header: 'Çıkış Saati', key: 'endTime', width: 15 },
          { header: 'Personel Sayısı', key: 'personnelCount', width: 15 },
          { header: 'Geç Kalma Toleransı', key: 'lateTolerance', width: 20 },
          { header: 'Erken Çıkma Toleransı', key: 'earlyExitTolerance', width: 20 }
        ];
        
        // Özel olarak veri ekleme işlemi için event oluşturup yayınlanacak
        const event = new CustomEvent('export-vardiya-to-excel', { 
          detail: { 
            worksheet,
            branchId,
            isManager
          } 
        });
        window.dispatchEvent(event);
      }
      else if (value === 2) { // Giriş Çıkış Raporları
        worksheet.columns = [
          { header: 'Personel', key: 'personnel', width: 30 },
          { header: 'Vardiya', key: 'shift', width: 20 },
          { header: 'Tarih', key: 'date', width: 15 },
          { header: 'Giriş Saati', key: 'checkIn', width: 15 },
          { header: 'Çıkış Saati', key: 'checkOut', width: 15 },
          { header: 'Durum', key: 'status', width: 15 }
        ];
        
        // Özel olarak veri ekleme işlemi için event oluşturup yayınlanacak
        const event = new CustomEvent('export-report-to-excel', { 
          detail: { 
            worksheet,
            branchId,
            isManager
          } 
        });
        window.dispatchEvent(event);
      }
      else if (value === 3) { // Toplam Süre
        worksheet.columns = [
          { header: 'Personel', key: 'personnel', width: 30 },
          { header: 'Dönem', key: 'period', width: 20 },
          { header: 'Çalışma Saati', key: 'workHours', width: 15 },
          { header: 'Ek Çalışma', key: 'extraWork', width: 15 },
          { header: 'Toplam Süre', key: 'totalHours', width: 15 }
        ];
        
        // Özel olarak veri ekleme işlemi için event oluşturup yayınlanacak
        const event = new CustomEvent('export-toplamsure-to-excel', { 
          detail: { 
            worksheet,
            branchId,
            isManager
          } 
        });
        window.dispatchEvent(event);
      }
      
      // Stil tanımlamaları
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4F81BD' } },
        border: {
          top: { style: 'thin' as const },
          left: { style: 'thin' as const },
          bottom: { style: 'thin' as const },
          right: { style: 'thin' as const }
        }
      };
      
      // Başlık stilini uygula
      worksheet.getRow(1).eachCell(cell => {
        cell.style = headerStyle;
      });
      
      // Zebrastripe (alternatif satır renklendirme)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // başlığı atla
          const fillColor = rowNumber % 2 === 0 ? 'FFF2F2F2' : 'FFFFFFFF';
          row.eachCell(cell => {
            cell.style = {
              fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: fillColor } },
              border: {
                top: { style: 'thin' as const },
                left: { style: 'thin' as const },
                bottom: { style: 'thin' as const },
                right: { style: 'thin' as const }
              }
            };
          });
        }
      });
      
      // Excel dosyasını oluştur ve indir
      setTimeout(async () => {
        const buffer = await workbook.xlsx.writeBuffer();
        const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        saveAs(new Blob([buffer]), `${getTabTitle()}_${currentDate}.xlsx`);
        setExporting(false);
      }, 500); // İlgili komponentın veri eklemesine zaman tanımak için küçük bir gecikme
      
    } catch (error) {
      console.error('Excel dışa aktarma hatası:', error);
      alert('Excel dosyası oluşturulurken bir hata oluştu.');
      setExporting(false);
    }
  };

  // QR kod indirme işlevi
  const downloadQrCode = async () => {
    // Şube yöneticisi için şube QR kodunu indirmesini sağlayalım
    const qrId = isManager && branchId ? branchId : userDetails?.companyId;
    
    if (!qrId) {
      alert('QR kodu oluşturmak için gerekli bilgiler bulunamadı.');
      return;
    }

    try {
      setDownloadingQr(true);

      // QR kod için canvas oluşturma
      const qrCanvas = document.createElement('div');
      qrCanvas.style.position = 'absolute';
      qrCanvas.style.left = '-9999px';
      document.body.appendChild(qrCanvas);

      // QR kodunu oluştur
      const qrCodeComponent = (
        <QRCodeCanvas
          value={qrId}
          size={512}
          level="H" // Yüksek hata düzeltme seviyesi
          includeMargin={true}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      );

      // QR kodunu DOM'a render et
      const qrRoot = document.createElement('div');
      qrRoot.style.width = '512px';
      qrRoot.style.height = '512px';
      qrRoot.style.backgroundColor = '#ffffff';
      qrRoot.style.display = 'flex';
      qrRoot.style.justifyContent = 'center';
      qrRoot.style.alignItems = 'center';
      qrCanvas.appendChild(qrRoot);

      // QR kodunu render et ve export et
      const ReactDOM = await import('react-dom/client');
      const root = ReactDOM.createRoot(qrRoot);
      root.render(qrCodeComponent);

      // Render için kısa bir bekleme
      setTimeout(() => {
        // QR kod canvas'ını seç
        const canvas = qrRoot.querySelector('canvas');
        if (!canvas) {
          alert('QR kod oluşturulamadı.');
          document.body.removeChild(qrCanvas);
          setDownloadingQr(false);
          return;
        }
        
        // Canvas'ı PNG olarak indir
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const fileName = isManager ? `Şube_QR_Kodu_${branchId}.png` : `Şirket_QR_Kodu_${userDetails?.companyId}.png`;
        link.download = fileName;
        link.href = dataUrl;
        link.click();
        
        // Temizlik
        document.body.removeChild(qrCanvas);
        setDownloadingQr(false);
      }, 300);
    } catch (error) {
      console.error('QR kod indirme hatası:', error);
      alert('QR kod oluşturulurken bir hata oluştu.');
      setDownloadingQr(false);
    }
  };

  return (
    <Paper sx={{ p: 2, mt: 2, height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h5" component="h1">
          {isManager ? 'Şube ' : ''}{getTabTitle()}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Yardım ve Açıklamalar">
            <IconButton 
              color="primary" 
              onClick={handleOpenInfoModal}
              sx={{ mr: 0.5 }}
            >
              <InfoIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="success"
            startIcon={<QrCodeIcon />}
            onClick={downloadQrCode}
            disabled={downloadingQr || (!userDetails?.companyId && !branchId)}
            size="small"
          >
            {downloadingQr ? 'İndiriliyor...' : isManager ? 'Şube QR' : 'QR İndir'}
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<PaletteIcon />}
            onClick={() => setQrDesignModalOpen(true)}
            size="small"
          >
            QR Tasarla
          </Button>
          <Button
            variant="contained"
            color="info"
            startIcon={<DownloadIcon />}
            onClick={exportToExcel}
            disabled={exporting}
            size="small"
          >
            {exporting ? 'İndiriliyor...' : 'Excel İndir'}
          </Button>
        </Box>
      </Box>
      <Divider sx={{ mb: 1 }} />
      
      <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={value} 
            onChange={handleChange} 
            aria-label="vardiya yönetim tabları"
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: '40px' }}
          >
            <Tab label="Personel Listesi" {...a11yProps(0)} sx={{ py: 0.5 }} />
            <Tab label="Vardiya Listesi" {...a11yProps(1)} sx={{ py: 0.5 }} />
            <Tab label="Giriş Çıkış Raporları" {...a11yProps(2)} sx={{ py: 0.5 }} />
            <Tab label="Toplam Süre" {...a11yProps(3)} sx={{ py: 0.5 }} />
          </Tabs>
        </Box>
        <ScrollableContent>
          <TabPanel value={value} index={0}>
            <PersonelListesi branchId={branchId} isManager={isManager} />
          </TabPanel>
          <TabPanel value={value} index={1}>
            <VardiyaListesi branchId={branchId} isManager={isManager} />
          </TabPanel>
          <TabPanel value={value} index={2}>
            <GirisCikisRaporlari branchId={branchId} isManager={isManager} />
          </TabPanel>
          <TabPanel value={value} index={3}>
            <ToplamSure branchId={branchId} isManager={isManager} />
          </TabPanel>
        </ScrollableContent>
      </Box>

      {/* Bilgi Modalı */}
      <Dialog
        open={infoModalOpen}
        onClose={handleCloseInfoModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <InfoIcon sx={{ mr: 1, color: 'primary.main' }} />
          {isManager ? 'Şube Vardiya Yönetimi' : 'Vardiya Yönetimi'} Hakkında Bilgiler
        </DialogTitle>
        <DialogContent dividers>
          <Typography paragraph>
            {isManager ? 'Şube Vardiya Yönetimi' : 'Vardiya Yönetimi'} modülü, {isManager ? 'şubenizin' : 'şirketinizin'} personel vardiyalarını etkin bir şekilde yönetmenizi sağlayan bir dizi araç içerir.
            Aşağıda her bir sekmede gerçekleştirebileceğiniz işlemler detaylı olarak açıklanmıştır:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <PersonIcon sx={{ color: 'primary.main' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Personel Listesi" 
                secondary={`Bu sekmede ${isManager ? 'şubenize' : 'şirketinize'} kayıtlı tüm personelleri görüntüleyebilir, arayabilir, filtreleyebilir ve yönetebilirsiniz. Personel ekleme, düzenleme, silme ve vardiyaya atama işlemlerini bu sekme üzerinden gerçekleştirebilirsiniz. Ayrıca belirli bir vardiyaya göre personel filtresi uygulayabilirsiniz.`}
              />
            </ListItem>
            
            <Divider variant="inset" component="li" />
            
            <ListItem>
              <ListItemIcon>
                <ScheduleIcon sx={{ color: 'primary.main' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Vardiya Listesi" 
                secondary={`Bu sekmede ${isManager ? 'şubenize' : 'şirketinize'} ait vardiyaları oluşturabilir, düzenleyebilir ve yönetebilirsiniz. Her vardiya için özel giriş-çıkış saatleri, gecikme toleransları ve izleme ayarları tanımlayabilirsiniz. Vardiyalara personel atama, kaldırma ve değiştirme işlemleri de bu sekme üzerinden yapılabilir. Vardiya detaylarını ve her vardiyada çalışan personel sayısını görüntüleyebilirsiniz.`}
              />
            </ListItem>
            
            <Divider variant="inset" component="li" />
            
            <ListItem>
              <ListItemIcon>
                <ReportIcon sx={{ color: 'primary.main' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Giriş Çıkış Raporları" 
                secondary="Bu sekmede personelin vardiyalara giriş-çıkış kayıtlarını görüntüleyebilirsiniz. Hangi personelin hangi vardiyada çalıştığı, giriş-çıkış saatleri ve durum bilgisi (normal, geç geldi, erken çıktı, vb.) görüntülenebilir. Personel adı, vardiya veya durum tipine göre filtreleme yapabilirsiniz. Son 30 günlük kayıtlar otomatik olarak görüntülenir."
              />
            </ListItem>
            
            <Divider variant="inset" component="li" />
            
            <ListItem>
              <ListItemIcon>
                <TimerIcon sx={{ color: 'primary.main' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Toplam Süre" 
                secondary="Bu sekmede personelin belirli bir tarih aralığında toplam çalışma sürelerini görüntüleyebilirsiniz. Personel bazlı veya tarih aralığı bazlı filtreler uygulayarak özel raporlar oluşturabilirsiniz. Toplam çalışma süresi, fazla mesai süreleri ve diğer istatistikler bu sekmede detaylı olarak görüntülenebilir."
              />
            </ListItem>
          </List>
          
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Ek Özellikler:
          </Typography>
          
          <Typography paragraph>
            <strong>Excel İndir:</strong> Aktif sekmedeki verileri Excel dosyası olarak indirmenizi sağlar. İndirilen dosya, görüntülenen verileri ve filtreleme ayarlarını içerir.
          </Typography>
          
          <Typography paragraph>
            <strong>{isManager ? 'Şube QR' : 'QR İndir'}:</strong> {isManager ? 'Şubenize' : 'Şirketinize'} özel QR kodu oluşturur ve indirir. Bu QR kodu, personel giriş-çıkışlarında kullanılan mobil uygulamaya bağlanmak için kullanılabilir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInfoModal} autoFocus>
            Kapat
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Tasarım Modal'ı */}
      <VardiyaQrPrintModal 
        open={qrDesignModalOpen} 
        onClose={() => setQrDesignModalOpen(false)}
        companyId={userDetails?.companyId}
        branchId={branchId}
      />
    </Paper>
  );
};

export default Shifts; 