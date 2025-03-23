import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Alert, 
  Snackbar, 
  Box, 
  CircularProgress, 
  Typography, 
  Paper,
  styled
} from '@mui/material';
import MessageComposer from './MessageComposer';
import NotificationService, { Personnel } from '../../services/NotificationService';
import { useAuth } from '../../contexts/AuthContext';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';

// Özelleştirilmiş bileşenler
const StyledPaper = styled(Paper)(({ theme }) => ({
  borderRadius: theme.spacing(1),
  overflow: 'hidden',
  marginBottom: theme.spacing(3),
}));

const BulkMessage: React.FC = () => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { currentUser } = useAuth();
  
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
        const userRef = await NotificationService.getCurrentUserCompany(currentUser.uid);
        if (!userRef) {
          setError('Şirket bilgisi bulunamadı.');
          setLoading(false);
          return;
        }
        
        // Tüm personeli getir
        const personnelList = await NotificationService.getAllPersonnel(userRef);
        setPersonnel(personnelList);
      } catch (error) {
        console.error('Personel yüklenirken hata:', error);
        setError('Personel listesi yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    
    loadPersonnel();
  }, [currentUser]);
  
  const handleSendMessage = async (title: string, body: string) => {
    if (personnel.length === 0) {
      setError('Hiç personel bulunamadı.');
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
      
      // Tüm personelin ID'lerini al
      const allPersonnelIds = personnel.map(person => person.id);
      
      // Bildirimi gönder
      const result = await NotificationService.sendNotification(
        companyId,
        allPersonnelIds,
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
  
  return (
    <Box>
      {/* Hata mesajı */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Personel Bilgisi */}
      {!loading && personnel.length > 0 && (
        <StyledPaper elevation={0}>
          <Box sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            bgcolor: 'primary.light',
            color: 'primary.contrastText'
          }}>
            <PeopleAltIcon fontSize="large" />
            <Box>
              <Typography variant="h6">
                Toplu Mesaj Gönderimi
              </Typography>
              <Typography variant="body2">
                {`Şirketinizde toplam ${personnel.length} personel mevcut. Gönderilen bildirim tüm personele iletilecektir.`}
              </Typography>
            </Box>
          </Box>
        </StyledPaper>
      )}
      
      {/* Yükleniyor göstergesi */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {!loading && personnel.length === 0 && !error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Şirketinizde henüz kayıtlı personel bulunmamaktadır.
        </Alert>
      )}
      
      {!loading && personnel.length > 0 && (
        <Grid container justifyContent="center">
          {/* Mesaj Oluşturucu */}
          <Grid item xs={12} md={8}>
            <MessageComposer
              onSend={handleSendMessage}
              isLoading={sending}
              recipientCount={personnel.length}
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

export default BulkMessage; 