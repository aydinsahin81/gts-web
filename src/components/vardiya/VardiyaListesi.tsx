import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Grid, 
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { ref, push, set, serverTimestamp, get } from 'firebase/database';
import { database } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const VardiyaListesi: React.FC = () => {
  const { currentUser, userDetails } = useAuth();
  const [open, setOpen] = useState(false);
  const [vardiyaAdi, setVardiyaAdi] = useState('');
  const [girisZamani, setGirisZamani] = useState('');
  const [gecKalmaToleransi, setGecKalmaToleransi] = useState(10);
  const [cikisZamani, setCikisZamani] = useState('');
  const [erkenCikmaToleransi, setErkenCikmaToleransi] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vardiyalar, setVardiyalar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // Vardiyaları veritabanından getir
  useEffect(() => {
    const fetchVardiyalar = async () => {
      if (!userDetails?.companyId) {
        setLoading(false);
        return;
      }

      try {
        const shiftsRef = ref(database, `companies/${userDetails.companyId}/shifts`);
        const snapshot = await get(shiftsRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const formattedShifts = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));
          
          setVardiyalar(formattedShifts);
        } else {
          setVardiyalar([]);
        }
      } catch (error) {
        console.error("Vardiyalar yüklenirken hata:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVardiyalar();
  }, [userDetails]);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    // Formu sıfırla
    setVardiyaAdi('');
    setGirisZamani('');
    setGecKalmaToleransi(10);
    setCikisZamani('');
    setErkenCikmaToleransi(10);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!vardiyaAdi) {
      setError('Vardiya adı gereklidir');
      return;
    }
    if (!girisZamani) {
      setError('Giriş zamanı gereklidir');
      return;
    }
    if (!cikisZamani) {
      setError('Çıkış zamanı gereklidir');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      // Şirket ID'sini userDetails'dan al
      const companyId = userDetails?.companyId;
      
      if (!companyId) {
        throw new Error('Şirket bilgisi bulunamadı');
      }
      
      // Yeni vardiya referansı oluştur
      const shiftsRef = ref(database, `companies/${companyId}/shifts`);
      const newShiftRef = push(shiftsRef);
      const shiftId = newShiftRef.key;
      
      // Vardiya verilerini hazırla
      const shiftData = {
        createdAt: serverTimestamp(),
        name: vardiyaAdi,
        startTime: girisZamani,
        lateTolerance: gecKalmaToleransi,
        endTime: cikisZamani,
        earlyExitTolerance: erkenCikmaToleransi
      };
      
      // Veritabanına kaydet
      await set(newShiftRef, shiftData);
      
      console.log('Vardiya başarıyla eklendi:', shiftId);
      
      // Listeye yeni vardiyayı ekle (veritabanından tekrar çekmek yerine)
      setVardiyalar(prevVardiyalar => [
        ...prevVardiyalar,
        {
          id: shiftId,
          ...shiftData,
          // serverTimestamp yerine şimdiki zamanı kullan
          createdAt: Date.now()
        }
      ]);
      
      // Başarı mesajı göster
      setSnackbarMessage('Vardiya başarıyla eklendi');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      
      // Başarılı olursa modalı kapat
      handleClose();
    } catch (error) {
      console.error('Vardiya eklenirken hata oluştu:', error);
      setError('Vardiya eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      
      // Hata mesajı göster
      setSnackbarMessage('Vardiya eklenirken bir hata oluştu');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Snackbar kapatma
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Vardiya Listesi
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />} 
          onClick={handleClickOpen}
        >
          Vardiya Ekle
        </Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column' }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Vardiyalar yükleniyor...
          </Typography>
        </Box>
      ) : vardiyalar.length === 0 ? (
        <Paper 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            borderRadius: 2,
            backgroundColor: '#f8f9fa',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            height: '50vh',
            justifyContent: 'center'
          }}
        >
          <AccessTimeIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.7 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Henüz vardiya bulunmamaktadır
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: '500px' }}>
            Personelleriniz için vardiya ekleyerek giriş ve çıkış saatlerini takip edebilirsiniz.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />} 
            onClick={handleClickOpen}
          >
            Vardiya Ekle
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {vardiyalar.map((vardiya) => (
            <Grid item xs={12} sm={6} md={4} key={vardiya.id}>
              <Paper 
                sx={{ 
                  p: 2.5, 
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Typography variant="h6" color="primary" gutterBottom>
                  {vardiya.name}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    <strong>Giriş:</strong> {vardiya.startTime}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    <strong>Çıkış:</strong> {vardiya.endTime}
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 1.5 }} />
                
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Geç Kalma Toleransı:</strong> {vardiya.lateTolerance} dk
                </Typography>
                
                <Typography variant="body2">
                  <strong>Erken Çıkma Toleransı:</strong> {vardiya.earlyExitTolerance} dk
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Vardiya Ekleme Modal */}
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6">Yeni Vardiya Ekle</Typography>
          <IconButton edge="end" color="inherit" onClick={handleClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {error && (
              <Grid item xs={12}>
                <Typography color="error" variant="body2">{error}</Typography>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                autoFocus
                label="Vardiya Adı"
                placeholder="Örn: Sabah Vardiyası, Gece Vardiyası"
                value={vardiyaAdi}
                onChange={(e) => setVardiyaAdi(e.target.value)}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Giriş Zamanı"
                type="time"
                value={girisZamani}
                onChange={(e) => setGirisZamani(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTimeIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Çıkış Zamanı"
                type="time"
                value={cikisZamani}
                onChange={(e) => setCikisZamani(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTimeIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Geç Kalma Toleransı (dk)</InputLabel>
                <Select
                  value={gecKalmaToleransi}
                  onChange={(e) => setGecKalmaToleransi(Number(e.target.value))}
                  label="Geç Kalma Toleransı (dk)"
                >
                  {[5, 10, 15, 20, 30, 45, 60].map((val) => (
                    <MenuItem key={val} value={val}>{val} dakika</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Erken Çıkma Toleransı (dk)</InputLabel>
                <Select
                  value={erkenCikmaToleransi}
                  onChange={(e) => setErkenCikmaToleransi(Number(e.target.value))}
                  label="Erken Çıkma Toleransı (dk)"
                >
                  {[5, 10, 15, 20, 30, 45, 60].map((val) => (
                    <MenuItem key={val} value={val}>{val} dakika</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={isSubmitting}>
            İptal
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bildirim Snackbar */}
      <Snackbar 
        open={openSnackbar} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VardiyaListesi; 