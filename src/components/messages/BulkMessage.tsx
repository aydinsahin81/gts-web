import React, { useState, useEffect } from 'react';
import { Grid, Alert, Snackbar, Box, CircularProgress } from '@mui/material';
import PersonnelSelector from './PersonnelSelector';
import MessageComposer from './MessageComposer';
import NotificationService, { Personnel } from '../../services/NotificationService';
import { useAuth } from '../../contexts/AuthContext';

const BulkMessage: React.FC = () => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
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
        // Not: Gerçek uygulamada bu veri farklı bir yoldan alınabilir
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
  
  const handleSelectionChange = (selectedIds: string[]) => {
    setSelectedPersonnel(selectedIds);
  };
  
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
        // Başarılı gönderimden sonra seçimleri temizle - isteğe bağlı
        // setSelectedPersonnel([]);
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
      
      {/* Yükleniyor göstergesi */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {!loading && (
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

export default BulkMessage; 