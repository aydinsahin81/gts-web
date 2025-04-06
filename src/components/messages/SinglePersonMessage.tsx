import React, { useState, useEffect, useCallback } from 'react';
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
  ListItemButton,
  IconButton,
  Tooltip,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import MessageComposer from './MessageComposer';
import NotificationService, { Personnel, getPersonFullName, Notification } from '../../services/NotificationService';
import { useAuth } from '../../contexts/AuthContext';
import SearchIcon from '@mui/icons-material/Search';
import FaceIcon from '@mui/icons-material/Face';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import { format } from 'date-fns';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';

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

interface SinglePersonMessageProps {
  personnelId?: string | null;
  branchId?: string;
  isManager?: boolean;
}

const SinglePersonMessage: React.FC<SinglePersonMessageProps> = ({ 
  personnelId, 
  branchId,
  isManager = false 
}) => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // Bildirimler için state'ler
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  
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
        const userCompanyId = await NotificationService.getCurrentUserCompany(currentUser.uid);
        if (!userCompanyId) {
          setError('Şirket bilgisi bulunamadı.');
          setLoading(false);
          return;
        }
        
        setCompanyId(userCompanyId);
        
        // Tüm personeli getir
        const personnelList = await NotificationService.getAllPersonnel(userCompanyId);
        
        // Önce yönetici rolündeki personelleri filtrele (manager veya admin)
        let filteredList = personnelList.filter(person => {
          // Eğer role özelliği varsa ve manager veya admin ise filtrele
          return !(person.role === 'manager' || person.role === 'admin');
        });
        
        // Yönetici modunda, sadece kendi şubesindeki personeli filtrele
        if (isManager && branchId) {
          console.log(`Manager modu, şube ID: ${branchId} personeli filtreleniyor`);
          
          // Personel listesinde şube ID'si olanları önce filtrele
          let branchPersonnel = filteredList.filter(person => person.branchesId === branchId);
          
          // Eğer personelde branchesId yoksa users koleksiyonuna bakarak kontrol et
          if (branchPersonnel.length === 0) {
            console.log("Personel listesinde şube bilgisi bulunamadı, users koleksiyonuna bakılıyor");
            
            const filteredPersonnel: Personnel[] = [];
            
            for (const person of filteredList) {
              if (person.branchesId === branchId) {
                filteredPersonnel.push(person);
                continue;
              }
              
              // Users veritabanında kontrol et
              try {
                const userRef = ref(database, `users/${person.id}`);
                const userSnapshot = await get(userRef);
                
                if (userSnapshot.exists()) {
                  const userData = userSnapshot.val();
                  // Ayrıca users tablosunda da rol kontrolü yap
                  if (userData.role === 'manager' || userData.role === 'admin' || userData.userRole === 'manager' || userData.userRole === 'admin') {
                    // Yönetici ise atla
                    continue;
                  }
                  
                  if (userData.branchesId === branchId) {
                    // Users veritabanından şube ID'sini person nesnesine ekle
                    const updatedPerson: Personnel = {
                      ...person,
                      branchesId: userData.branchesId
                    };
                    filteredPersonnel.push(updatedPerson);
                  }
                }
              } catch (err) {
                console.error("Kullanıcı bilgisi alınırken hata:", err);
              }
            }
            
            console.log(`Şubeye ait ${filteredPersonnel.length} personel bulundu`);
            setPersonnel(filteredPersonnel);
          } else {
            console.log(`Şubeye ait ${branchPersonnel.length} personel bulundu`);
            setPersonnel(branchPersonnel);
          }
        } else {
          // Normal mod, yönetici olmayan tüm personel
          setPersonnel(filteredList);
        }
      } catch (error) {
        console.error('Personel yüklenirken hata:', error);
        setError('Personel listesi yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    
    loadPersonnel();
  }, [currentUser, branchId, isManager]);
  
  // personnelId propundan gelen değeri izle
  useEffect(() => {
    if (personnelId && personnel.length > 0) {
      // Eğer böyle bir personel varsa, otomatik olarak seç
      const exists = personnel.some(person => person.id === personnelId);
      if (exists) {
        setSelectedPersonId(personnelId);
      }
    }
  }, [personnelId, personnel]);
  
  // Tüm bildirimleri yükle - personel seçimi olmadan
  const loadAllNotifications = useCallback(async () => {
    try {
      setLoadingNotifications(true);
      
      if (!companyId) {
        console.error('Şirket ID bulunamadı');
        setLoadingNotifications(false);
        return;
      }
      
      console.log(`Tüm bildirimler yükleniyor - Şirket: ${companyId}`);
      
      // Tüm bildirimleri almak için direkt koleksiyona erişim
      const notificationsRef = ref(database, `companies/${companyId}/notifications`);
      const snapshot = await get(notificationsRef);
      
      const notificationsList: Notification[] = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const id = childSnapshot.key;
          const data = childSnapshot.val();
          
          console.log(`Bildirim yükleniyor - ID: ${id}, Status: ${data.status}`);
          
          notificationsList.push({
            id: id || '',
            ...data
          });
        });
        
        // Tarihe göre sırala (en yenisi en üstte)
        notificationsList.sort((a, b) => b.createdAt - a.createdAt);
        
        console.log(`Toplam ${notificationsList.length} bildirim bulundu`);
      } else {
        console.log('Bildirim verisi bulunamadı');
      }
      
      setNotifications(notificationsList);
      setLoadingNotifications(false);
    } catch (err) {
      console.error('Bildirimler yüklenirken hata:', err);
      setLoadingNotifications(false);
    }
  }, [companyId]);

  // Alıcı personel adlarını al
  const getRecipientNames = useCallback((recipients: string[]) => {
    if (!recipients || recipients.length === 0) return "Alıcı yok";
    
    const recipientPersonnel = recipients.map(id => {
      const person = personnel.find(p => p.id === id);
      return person ? getPersonFullName(person) : "Bilinmeyen Personel";
    });
    
    return recipientPersonnel.join(", ");
  }, [personnel]);

  // Component yüklendiğinde tüm bildirimleri al
  useEffect(() => {
    if (companyId) {
      loadAllNotifications();
    }
  }, [companyId, loadAllNotifications]);
  
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
        // Bildirimleri yeniden yükle
        setTimeout(() => {
          loadAllNotifications();
        }, 1000);
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
  
  // Bildirim silme işlemini başlat
  const handleDeleteClick = (notificationId: string) => {
    setNotificationToDelete(notificationId);
    setDeleteDialogOpen(true);
  };
  
  // Bildirimi sil
  const handleConfirmDelete = async () => {
    if (!notificationToDelete || !companyId) {
      setDeleteDialogOpen(false);
      return;
    }
    
    try {
      const success = await NotificationService.deleteNotification(companyId, notificationToDelete);
      if (success) {
        setSuccessMessage('Bildirim başarıyla silindi.');
        // Listeyi güncelle
        setNotifications(prev => prev.filter(n => n.id !== notificationToDelete));
      } else {
        setError('Bildirim silinirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Bildirim silinirken hata:', error);
      setError('Bildirim silinirken bir hata oluştu.');
    } finally {
      setDeleteDialogOpen(false);
      setNotificationToDelete(null);
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
  
  // Tarih formatı
  const formatDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'dd MMMM yyyy HH:mm');
    } catch (error) {
      console.error('Tarih formatlanırken hata:', error);
      return 'Geçersiz tarih';
    }
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
      
      {/* Bildirim Silme Onay Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Bildirimi Sil</DialogTitle>
        <DialogContent>
          <Typography>Bu bildirimi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Sil
          </Button>
        </DialogActions>
      </Dialog>
      
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