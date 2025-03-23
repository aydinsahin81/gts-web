import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Alert, 
  Snackbar, 
  Box, 
  CircularProgress,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  InputAdornment,
  Radio,
  Paper,
  styled,
  ListItemButton
} from '@mui/material';
import MessageComposer from './MessageComposer';
import NotificationService, { Personnel, getPersonFullName } from '../../services/NotificationService';
import { useAuth } from '../../contexts/AuthContext';
import SearchIcon from '@mui/icons-material/Search';
import FaceIcon from '@mui/icons-material/Face';

// Özelleştirilmiş bileşenler
const StyledPaper = styled(Paper)(({ theme }) => ({
  height: '100%',
  borderRadius: theme.spacing(1),
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}));

const ScrollableList = styled(List)(({ theme }) => ({
  overflow: 'auto',
  flexGrow: 1,
  maxHeight: '450px',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '8px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#bbb',
    borderRadius: '8px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#888',
  },
}));

const HeaderArea = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const SinglePersonMessage: React.FC = () => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
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
  
  // Personel seçimi
  const handlePersonChange = (id: string) => {
    setSelectedPersonId(id);
  };
  
  // Mesaj gönder
  const handleSendMessage = async (title: string, body: string) => {
    if (!selectedPersonId) {
      setError('Lütfen bir personel seçin.');
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
        [selectedPersonId],
        title,
        body
      );
      
      if (result.success) {
        setSuccessMessage(`Bildirim başarıyla gönderildi.`);
        // Seçimi temizleme - isteğe bağlı
        // setSelectedPersonId(null);
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
  
  // Arama filtrelemesi
  const filteredPersonnel = personnel.filter(person => {
    const fullName = getPersonFullName(person).toLowerCase();
    return !searchTerm || fullName.includes(searchTerm.toLowerCase());
  });
  
  // Seçili personel bulma
  const selectedPerson = personnel.find(p => p.id === selectedPersonId);
  
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
            <StyledPaper elevation={0}>
              <HeaderArea>
                <Typography variant="h6" gutterBottom>
                  Personel Seç
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Mesaj göndermek istediğiniz personeli seçin
                </Typography>
              </HeaderArea>
              
              <Box sx={{ p: 2 }}>
                <TextField 
                  fullWidth
                  placeholder="İsim ile ara"
                  variant="outlined"
                  size="small"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
              </Box>
              
              {filteredPersonnel.length > 0 ? (
                <ScrollableList>
                  {filteredPersonnel.map((person) => {
                    const fullName = getPersonFullName(person);
                    const isSelected = selectedPersonId === person.id;
                    const hasFcmToken = Boolean(person.fcmToken);
                    
                    return (
                      <ListItem
                        key={person.id}
                        disablePadding
                      >
                        <ListItemButton
                          selected={isSelected}
                          onClick={() => handlePersonChange(person.id)}
                          sx={{
                            borderLeft: '4px solid',
                            borderLeftColor: hasFcmToken ? 'success.main' : 'error.main',
                          }}
                        >
                          <Radio 
                            checked={isSelected}
                            onChange={() => handlePersonChange(person.id)}
                            value={person.id}
                            name="person-radio"
                          />
                          <ListItemAvatar>
                            <Avatar>
                              {person.firstName[0]}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={fullName}
                            secondary={
                              <Box component="span" sx={{ 
                                color: hasFcmToken ? 'success.main' : 'error.main',
                                fontWeight: 'medium',
                                fontSize: '0.8rem'
                              }}>
                                {hasFcmToken ? 'Bildirim Alabilir' : 'Bildirim Alamaz'}
                              </Box>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </ScrollableList>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    {searchTerm 
                      ? 'Aramanızla eşleşen personel bulunamadı.' 
                      : 'Hiç personel bulunamadı.'}
                  </Typography>
                </Box>
              )}
            </StyledPaper>
          </Grid>
          
          {/* Mesaj Oluşturucu */}
          <Grid item xs={12} md={6}>
            <MessageComposer
              onSend={handleSendMessage}
              isLoading={sending}
              recipientCount={selectedPersonId ? 1 : 0}
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

export default SinglePersonMessage; 