import React, { useState, useEffect } from 'react';
import {
  Grid,
  Alert,
  Snackbar,
  Box,
  CircularProgress,
  Typography,
  Paper,
  styled,
  FormControlLabel,
  Switch,
  Badge
} from '@mui/material';
import PersonnelSelector from './PersonnelSelector';
import MessageComposer from './MessageComposer';
import NotificationService, { Personnel } from '../../services/NotificationService';
import { useAuth } from '../../contexts/AuthContext';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';

// Özelleştirilmiş bileşenler
const HeaderArea = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  borderRadius: theme.spacing(1),
  overflow: 'hidden',
  marginBottom: theme.spacing(3),
}));

const UnacceptedTasksMessage: React.FC = () => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [autoSelect, setAutoSelect] = useState<boolean>(true);
  
  const { currentUser } = useAuth();
  
  // Personeli yükle
  useEffect(() => {
    const loadPersonnel = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!currentUser) {
          setError('Kullanıcı oturumu bulunamadı.');
          setLoading(false);
          return;
        }
        
        // Kullanıcının şirket ID'sini al
        const companyId = await NotificationService.getCurrentUserCompany(currentUser.uid);
        if (!companyId) {
          setError('Şirket bilgisi bulunamadı.');
          setLoading(false);
          return;
        }
        
        // Görev kabul etmeyen personelleri getir
        const unacceptedPersonnel = await NotificationService.getPersonnelWithUnacceptedTasks(companyId);
        setPersonnel(unacceptedPersonnel);
        
        // Otomatik tüm personeli seç
        if (autoSelect && unacceptedPersonnel.length > 0) {
          setSelectedPersonnel(unacceptedPersonnel.map(p => p.id));
        }
      } catch (error) {
        console.error('Personel yüklenirken hata:', error);
        setError('Personel listesi yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    
    loadPersonnel();
  }, [currentUser, autoSelect]);
  
  // Seçim değişiklikleri
  const handleSelectionChange = (selectedIds: string[]) => {
    setSelectedPersonnel(selectedIds);
  };
  
  // Mesaj gönder
  const handleSendMessage = async (title: string, body: string) => {
    if (selectedPersonnel.length === 0) {
      setError('Lütfen en az bir personel seçin.');
      return;
    }
    
    try {
      setSending(true);
      setError(null);
      
      if (!currentUser) {
        setError('Kullanıcı oturumu bulunamadı.');
        return;
      }
      
      // Kullanıcının şirket ID'sini al
      const companyId = await NotificationService.getCurrentUserCompany(currentUser.uid);
      if (!companyId) {
        setError('Şirket bilgisi bulunamadı.');
        return;
      }
      
      // Bildirimi gönder
      const result = await NotificationService.sendNotification(
        companyId,
        selectedPersonnel,
        title,
        body
      );
      
      if (result.success) {
        setSuccessMessage(`Bildirim başarıyla ${result.sentCount} personele gönderildi.`);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Bildirim gönderilirken hata:', error);
      setError('Bildirim gönderilirken bir hata oluştu.');
    } finally {
      setSending(false);
    }
  };
  
  // Bildirim mesajlarını kapatma
  const handleCloseSnackbar = () => {
    setSuccessMessage(null);
  };
  
  // Auto seçim değişimi
  const handleAutoSelectChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSelect(event.target.checked);
  };
  
  return (
    <Box>
      {/* Hata mesajı */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Bilgi Başlığı */}
      <StyledPaper elevation={0}>
        <Box sx={{ 
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          bgcolor: 'warning.light',
          color: 'warning.contrastText'
        }}>
          <Badge badgeContent={personnel.length} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.8rem' } }}>
            <AssignmentLateIcon fontSize="large" />
          </Badge>
          <Box>
            <Typography variant="h6">
              Görev Kabul Etmeyen Personel
            </Typography>
            <Typography variant="body2">
              Atanan görevleri kabul etmeyen personellere hatırlatma bildirimi gönderebilirsiniz.
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {loading ? 'Personel yükleniyor...' : `${personnel.length} personel listeleniyor`}
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={autoSelect}
                onChange={handleAutoSelectChange}
                color="warning"
              />
            }
            label="Tüm personeli otomatik seç"
          />
        </Box>
      </StyledPaper>
      
      {/* Yükleniyor göstergesi */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {!loading && personnel.length === 0 && !error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Şu anda görev kabul etmeyen personel bulunmamaktadır.
        </Alert>
      )}
      
      {!loading && personnel.length > 0 && (
        <Grid container spacing={3}>
          {/* Personel Seçici */}
          <Grid item xs={12} md={6}>
            <PersonnelSelector
              personnel={personnel}
              loading={loading}
              onSelectionChange={handleSelectionChange}
              selectedIds={selectedPersonnel}
            />
          </Grid>
          
          {/* Mesaj Oluşturucu */}
          <Grid item xs={12} md={6}>
            <MessageComposer
              onSend={handleSendMessage}
              isLoading={sending}
              recipientCount={selectedPersonnel.length}
            />
          </Grid>
        </Grid>
      )}
      
      {/* Başarı bildirimi */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UnacceptedTasksMessage; 