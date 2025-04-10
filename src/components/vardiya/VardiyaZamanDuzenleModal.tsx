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
  styled
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
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
  
  // Modal açıldığında verileri yükle
  useEffect(() => {
    if (open && report) {
      resetForm();
      
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
      
      // Veritabanında güncellenecek veri nesnesini oluştur
      const updateData: Record<string, any> = {};
      
      // Giriş zamanı varsa ekle
      if (girisZamani) {
        // Giriş zamanını timestamp'e çevir (sadece saat ve dakika bilgisini kullan)
        const girisDate = new Date(report.originalRecord.girisZamani || 0);
        if (report.originalRecord.girisZamani) {
          // Var olan bir tarihi güncelle
          girisDate.setHours(girisZamani.getHours());
          girisDate.setMinutes(girisZamani.getMinutes());
        } else {
          // Yeni bir tarih oluştur (bugünkü tarih + seçilen saat/dakika)
          const today = new Date();
          girisDate.setFullYear(today.getFullYear());
          girisDate.setMonth(today.getMonth());
          girisDate.setDate(today.getDate());
          girisDate.setHours(girisZamani.getHours());
          girisDate.setMinutes(girisZamani.getMinutes());
        }
        
        updateData['girisZamani'] = girisDate.getTime();
        updateData['girisDurumu'] = 'onTime'; // Varsayılan olarak "onTime" durumu
      }
      
      // Çıkış zamanı varsa ekle
      if (cikisZamani) {
        // Çıkış zamanını timestamp'e çevir (sadece saat ve dakika bilgisini kullan)
        const cikisDate = new Date(report.originalRecord.cikisZamani || 0);
        if (report.originalRecord.cikisZamani) {
          // Var olan bir tarihi güncelle
          cikisDate.setHours(cikisZamani.getHours());
          cikisDate.setMinutes(cikisZamani.getMinutes());
        } else {
          // Yeni bir tarih oluştur (bugünkü tarih + seçilen saat/dakika)
          const today = new Date();
          cikisDate.setFullYear(today.getFullYear());
          cikisDate.setMonth(today.getMonth());
          cikisDate.setDate(today.getDate());
          cikisDate.setHours(cikisZamani.getHours());
          cikisDate.setMinutes(cikisZamani.getMinutes());
        }
        
        updateData['cikisZamani'] = cikisDate.getTime();
        updateData['cikisDurumu'] = 'complete'; // Varsayılan olarak "complete" durumu
      }
      
      // Eğer güncellenecek veri yoksa hata ver
      if (Object.keys(updateData).length === 0) {
        throw new Error('Güncellenecek bir veri bulunamadı.');
      }
      
      // Veritabanı referansı
      const recordRef = ref(database, `companies/${userDetails.companyId}/vardiyaListesi/${report.date}/${report.personnelId}`);
      
      // Güncelleme işlemi
      await update(recordRef, updateData);
      
      // Başarılı mesajı göster
      setSuccess(true);
      
      // 2 saniye sonra modalı kapat
      setTimeout(() => {
        onClose();
      }, 2000);
      
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
                    Tarih
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
                </Box>
                
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