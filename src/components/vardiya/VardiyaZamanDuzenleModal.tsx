import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  styled,
  FormControlLabel,
  Switch
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import trLocale from 'date-fns/locale/tr';
import { format } from 'date-fns';
import { ref, update } from 'firebase/database';
import { database } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WorkIcon from '@mui/icons-material/Work';
import EventIcon from '@mui/icons-material/Event';

// Özel stil tanımlamaları
const InfoItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(1.5),
}));

const InfoIcon = styled(Box)(({ theme }) => ({
  color: theme.palette.primary.main,
  marginRight: theme.spacing(1.5),
  display: 'flex',
  alignItems: 'center',
}));

interface VardiyaZamanDuzenleModalProps {
  open: boolean;
  onClose: () => void;
  report: any | null;
}

const VardiyaZamanDuzenleModal: React.FC<VardiyaZamanDuzenleModalProps> = ({
  open,
  onClose,
  report
}) => {
  const { userDetails } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [girisZamani, setGirisZamani] = useState<Date | null>(null);
  const [cikisZamani, setCikisZamani] = useState<Date | null>(null);
  
  // Özel tarih kontrolü için state'ler
  const [girisOzelTarih, setGirisOzelTarih] = useState<Date | null>(null);
  const [cikisOzelTarih, setCikisOzelTarih] = useState<Date | null>(null);
  
  // Özel tarih kullanımını kontrol eden switch'ler
  const [girisOzelTarihAktif, setGirisOzelTarihAktif] = useState(false);
  const [cikisOzelTarihAktif, setCikisOzelTarihAktif] = useState(false);
  
  // Modal açıldığında verileri yükle
  useEffect(() => {
    if (open && report) {
      resetForm();
      
      // Rapor tarihini varsayılan olarak ayarla (dd-MM-yyyy formatından)
      const dateParts = report.date.split('-');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // Ay 0-11 arası
        const year = parseInt(dateParts[2], 10);
        const reportDate = new Date(year, month, day);
        
        setGirisOzelTarih(reportDate);
        setCikisOzelTarih(reportDate);
      }
      
      // Giriş zamanını ayarla
      if (report.originalRecord.girisZamani) {
        const girisDate = new Date(report.originalRecord.girisZamani);
        setGirisZamani(girisDate);
      }
      
      // Çıkış zamanını ayarla
      if (report.originalRecord.cikisZamani) {
        const cikisDate = new Date(report.originalRecord.cikisZamani);
        setCikisZamani(cikisDate);
      }
    }
  }, [open, report]);
  
  // Formu sıfırla
  const resetForm = () => {
    setGirisZamani(null);
    setCikisZamani(null);
    setGirisOzelTarih(null);
    setCikisOzelTarih(null);
    setGirisOzelTarihAktif(false);
    setCikisOzelTarihAktif(false);
    setSuccess(false);
    setError(null);
  };
  
  // Kayıt işlemi
  const handleSave = async () => {
    if (!userDetails?.companyId || !report) {
      setError('Yetkilendirme hatası. Lütfen tekrar giriş yapın.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Tarih ve personel ID bilgilerini al
      const dateParts = report.date.split('-');
      if (dateParts.length !== 3) {
        throw new Error('Geçersiz tarih formatı.');
      }
      
      // Rapor tarihini ayrıştır (dd-MM-yyyy formatından)
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Ay 0-11 arası olduğu için -1
      const year = parseInt(dateParts[2], 10);
      const reportDate = new Date(year, month, day); 
      
      // Veritabanında güncellenecek veri nesnesini oluştur
      const updateData: Record<string, any> = {};
      
      // Giriş zamanı varsa ekle
      if (girisZamani) {
        let girisDate: Date;
        
        if (girisOzelTarihAktif && girisOzelTarih) {
          // Özel tarih seçilmiş ise, o tarihi kullan ama sadece saat ve dakikayı güncelle
          girisDate = new Date(girisOzelTarih);
          girisDate.setHours(girisZamani.getHours());
          girisDate.setMinutes(girisZamani.getMinutes());
        } else {
          // Özel tarih seçilmemiş ise, rapor tarihini kullan
          girisDate = new Date(report.originalRecord.girisZamani || reportDate.getTime());
          
          // Rapor tarihini kullan (yıl, ay, gün) ve sadece saat ve dakikayı güncelle
          girisDate.setFullYear(reportDate.getFullYear());
          girisDate.setMonth(reportDate.getMonth());
          girisDate.setDate(reportDate.getDate());
          girisDate.setHours(girisZamani.getHours());
          girisDate.setMinutes(girisZamani.getMinutes());
        }
        
        // Orijinal giriş saatiyle karşılaştır, değişiklik varsa elle düzenlendi bilgisi ekle
        const orijinalGirisSaat = report.originalRecord.girisZamani 
          ? new Date(report.originalRecord.girisZamani).getHours() 
          : null;
        const orijinalGirisDakika = report.originalRecord.girisZamani 
          ? new Date(report.originalRecord.girisZamani).getMinutes() 
          : null;
        
        // Giriş saati veya dakikası değiştiyse
        if (orijinalGirisSaat === null || 
            orijinalGirisDakika === null || 
            orijinalGirisSaat !== girisZamani.getHours() || 
            orijinalGirisDakika !== girisZamani.getMinutes()) {
          updateData['girisZamani'] = girisDate.getTime();
          updateData['girisDurumu'] = 'onTime'; // Varsayılan olarak "onTime" durumu
          updateData['girisElleDuzenlendi'] = true; // Elle düzenlendi bilgisini ekle
          console.log('Giriş saati değiştirildi:', `${orijinalGirisSaat}:${orijinalGirisDakika} -> ${girisZamani.getHours()}:${girisZamani.getMinutes()}`);
        } else {
          // Değişiklik yoksa sadece zamanı güncelle, "elle düzenlendi" bilgisini ekleme
          updateData['girisZamani'] = girisDate.getTime();
        }
      }
      
      // Çıkış zamanı varsa ekle
      if (cikisZamani) {
        let cikisDate: Date;
        
        if (cikisOzelTarihAktif && cikisOzelTarih) {
          // Özel tarih seçilmiş ise, o tarihi kullan ama sadece saat ve dakikayı güncelle
          cikisDate = new Date(cikisOzelTarih);
          cikisDate.setHours(cikisZamani.getHours());
          cikisDate.setMinutes(cikisZamani.getMinutes());
        } else {
          // Özel tarih seçilmemiş ise, rapor tarihini kullan
          cikisDate = new Date(report.originalRecord.cikisZamani || reportDate.getTime());
          
          // Rapor tarihini kullan (yıl, ay, gün) ve sadece saat ve dakikayı güncelle
          cikisDate.setFullYear(reportDate.getFullYear());
          cikisDate.setMonth(reportDate.getMonth());
          cikisDate.setDate(reportDate.getDate());
          cikisDate.setHours(cikisZamani.getHours());
          cikisDate.setMinutes(cikisZamani.getMinutes());
        }
        
        // Orijinal çıkış saatiyle karşılaştır, değişiklik varsa elle düzenlendi bilgisi ekle
        const orijinalCikisSaat = report.originalRecord.cikisZamani 
          ? new Date(report.originalRecord.cikisZamani).getHours() 
          : null;
        const orijinalCikisDakika = report.originalRecord.cikisZamani 
          ? new Date(report.originalRecord.cikisZamani).getMinutes() 
          : null;
        
        // Çıkış saati veya dakikası değiştiyse
        if (orijinalCikisSaat === null || 
            orijinalCikisDakika === null || 
            orijinalCikisSaat !== cikisZamani.getHours() || 
            orijinalCikisDakika !== cikisZamani.getMinutes()) {
          updateData['cikisZamani'] = cikisDate.getTime();
          updateData['cikisDurumu'] = 'complete'; // Varsayılan olarak "complete" durumu
          updateData['cikisElleDuzenlendi'] = true; // Elle düzenlendi bilgisini ekle
          console.log('Çıkış saati değiştirildi:', `${orijinalCikisSaat}:${orijinalCikisDakika} -> ${cikisZamani.getHours()}:${cikisZamani.getMinutes()}`);
        } else {
          // Değişiklik yoksa sadece zamanı güncelle, "elle düzenlendi" bilgisini ekleme
          updateData['cikisZamani'] = cikisDate.getTime();
        }
      }
      
      // Güncellenecek veriyi konsola yazdır
      console.log('Güncellenecek veri:', updateData);
      console.log('Veritabanı yolu:', `companies/${userDetails.companyId}/vardiyaListesi/${report.date}/${report.personnelId}`);
      console.log('Report bilgisi:', report);
      
      // Eğer güncellenecek veri yoksa hata ver
      if (Object.keys(updateData).length === 0) {
        throw new Error('Güncellenecek bir veri bulunamadı.');
      }
      
      // Veritabanı referansı
      const recordRef = ref(database, `companies/${userDetails.companyId}/vardiyaListesi/${report.date}/${report.personnelId}`);
      
      try {
        // Güncelleme işlemi
        await update(recordRef, updateData);
        console.log('Veritabanı güncelleme başarılı');
        
        // Başarılı mesajı göster
        setSuccess(true);
        
        // 2 saniye sonra modalı kapat
        setTimeout(() => {
          onClose();
        }, 2000);
      } catch (updateError) {
        console.error('Veritabanı güncelleme hatası:', updateError);
        throw updateError;
      }
      
    } catch (err) {
      console.error('Vardiya bilgisi güncellenirken hata:', err);
      setError((err as Error).message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };
  
  // Modalı kapatma işlemi
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };
  
  // Eğer rapor yoksa boş içerik göster
  if (!report) {
    return null;
  }
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <EditIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Vardiya Zaman Düzenleme</Typography>
        </Box>
        <IconButton 
          onClick={handleClose} 
          disabled={loading}
          sx={{ 
            color: 'text.secondary',
            '&:hover': { color: 'error.main' } 
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={3}>
          {/* Personel ve Vardiya Bilgileri */}
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              p: 2, 
              bgcolor: 'background.default', 
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                Personel ve Vardiya Bilgileri
              </Typography>
              
              <InfoItem>
                <InfoIcon>
                  <PersonIcon />
                </InfoIcon>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Personel Adı
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {report.personnel}
                  </Typography>
                </Box>
              </InfoItem>
              
              <InfoItem>
                <InfoIcon>
                  <WorkIcon />
                </InfoIcon>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Vardiya
                  </Typography>
                  <Typography variant="body1">
                    {report.shift}
                  </Typography>
                </Box>
              </InfoItem>
              
              <InfoItem>
                <InfoIcon>
                  <CalendarTodayIcon />
                </InfoIcon>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Kayıt Tarihi
                  </Typography>
                  <Typography variant="body1">
                    {report.date}
                  </Typography>
                </Box>
              </InfoItem>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Mevcut Durum
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {report.statusInfo.entryStatus && (
                  <Chip 
                    label={report.statusInfo.entryStatus}
                    size="small"
                    color={
                      report.statusInfo.entryStatus.includes('Normal') || 
                      report.statusInfo.entryStatus.includes('Erken') 
                        ? 'success' 
                        : report.statusInfo.entryStatus.includes('Geç') 
                          ? 'warning' 
                          : 'error'
                    }
                  />
                )}
                
                {report.statusInfo.exitStatus && (
                  <Chip 
                    label={report.statusInfo.exitStatus}
                    size="small"
                    color={
                      report.statusInfo.exitStatus === 'Vardiya Tamamlandı' || 
                      report.statusInfo.exitStatus === 'Normal Çıktı'
                        ? 'success'
                        : report.statusInfo.exitStatus === 'Erken Çıktı'
                          ? 'warning'
                          : report.statusInfo.exitStatus === 'Devam Ediyor'
                            ? 'info'
                            : 'error'
                    }
                  />
                )}
              </Box>
            </Box>
          </Grid>
          
          {/* Zaman Düzenleme Formu */}
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              p: 2, 
              bgcolor: 'primary.light', 
              color: 'white', 
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              position: 'relative'
            }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 3 }}>
                Giriş ve Çıkış Zamanı Düzenleme
              </Typography>
              
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={trLocale}>
                {/* Giriş Zamanı Bölümü */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LoginIcon fontSize="small" sx={{ mr: 1 }} />
                    <Typography variant="body2" fontWeight="medium">
                      Giriş Zamanı
                    </Typography>
                  </Box>
                  
                  <TimePicker
                    value={girisZamani}
                    onChange={(newValue) => setGirisZamani(newValue)}
                    ampm={false}
                    views={['hours', 'minutes']}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: "small",
                        sx: {
                          backgroundColor: 'rgba(255,255,255,0.9)',
                          borderRadius: 1
                        }
                      }
                    }}
                  />
                  
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(255,255,255,0.8)' }}>
                    {report.checkIn !== '--:--' ? `Mevcut giriş saati: ${report.checkIn}` : 'Giriş kaydı bulunmuyor'}
                  </Typography>
                  
                  {/* Giriş için özel tarih seçimi */}
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={girisOzelTarihAktif}
                        onChange={(e) => setGirisOzelTarihAktif(e.target.checked)}
                        size="small"
                        color="default"
                      />
                    }
                    label={
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                        Farklı tarih seç
                      </Typography>
                    }
                    sx={{ mt: 1, mb: 0.5 }}
                  />
                  
                  {girisOzelTarihAktif && (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <EventIcon fontSize="small" sx={{ mr: 1 }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          Giriş Tarihi
                        </Typography>
                      </Box>
                      
                      <DatePicker
                        value={girisOzelTarih}
                        onChange={(newValue) => setGirisOzelTarih(newValue)}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: "small",
                            sx: {
                              backgroundColor: 'rgba(255,255,255,0.9)',
                              borderRadius: 1,
                              '& .MuiInputBase-input': {
                                fontSize: '0.85rem'
                              }
                            }
                          }
                        }}
                      />
                    </Box>
                  )}
                </Box>
                
                {/* Çıkış Zamanı Bölümü */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                    <Typography variant="body2" fontWeight="medium">
                      Çıkış Zamanı
                    </Typography>
                  </Box>
                  
                  <TimePicker
                    value={cikisZamani}
                    onChange={(newValue) => setCikisZamani(newValue)}
                    ampm={false}
                    views={['hours', 'minutes']}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: "small",
                        sx: {
                          backgroundColor: 'rgba(255,255,255,0.9)',
                          borderRadius: 1
                        }
                      }
                    }}
                  />
                  
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(255,255,255,0.8)' }}>
                    {report.checkOut !== '--:--' ? `Mevcut çıkış saati: ${report.checkOut}` : 'Çıkış kaydı bulunmuyor'}
                  </Typography>
                  
                  {/* Çıkış için özel tarih seçimi */}
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={cikisOzelTarihAktif}
                        onChange={(e) => setCikisOzelTarihAktif(e.target.checked)}
                        size="small"
                        color="default"
                      />
                    }
                    label={
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                        Farklı tarih seç
                      </Typography>
                    }
                    sx={{ mt: 1, mb: 0.5 }}
                  />
                  
                  {cikisOzelTarihAktif && (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <EventIcon fontSize="small" sx={{ mr: 1 }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          Çıkış Tarihi
                        </Typography>
                      </Box>
                      
                      <DatePicker
                        value={cikisOzelTarih}
                        onChange={(newValue) => setCikisOzelTarih(newValue)}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: "small",
                            sx: {
                              backgroundColor: 'rgba(255,255,255,0.9)',
                              borderRadius: 1,
                              '& .MuiInputBase-input': {
                                fontSize: '0.85rem'
                              }
                            }
                          }
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </LocalizationProvider>
              
              {/* Başarı mesajı */}
              {success && (
                <Alert severity="success" sx={{ mt: 3, backgroundColor: 'rgba(255,255,255,0.9)' }}>
                  Vardiya zamanı başarıyla güncellendi!
                </Alert>
              )}
              
              {/* Hata mesajı */}
              {error && (
                <Alert severity="error" sx={{ mt: 3, backgroundColor: 'rgba(255,255,255,0.9)' }}>
                  {error}
                </Alert>
              )}
              
              {loading && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  borderRadius: 2
                }}>
                  <CircularProgress color="inherit" />
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          onClick={handleClose} 
          color="inherit" 
          disabled={loading}
        >
          İptal
        </Button>
        <Button 
          onClick={handleSave}
          variant="contained" 
          color="primary"
          disabled={loading}
          startIcon={<AccessTimeIcon />}
        >
          {loading ? 'Kaydediliyor...' : 'Zamanları Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VardiyaZamanDuzenleModal; 