import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Divider,
  Button,
  CircularProgress,
  styled,
  Chip,
  Grid,
  Modal,
  IconButton,
  Paper,
  TextField,
  Tab,
  Tabs,
  Alert,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  TaskAlt as TaskIcon,
  EmailOutlined as EmailIcon,
  PhoneAndroid as PhoneIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  PersonAdd as PersonAddIcon,
  Group as GroupIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { ref, get, onValue, off, remove, update, set, push } from 'firebase/database';
import { database, auth } from '../../firebase';

// Kaydırılabilir ana içerik için styled component
const ScrollableContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  overflowY: 'auto',
  height: 'calc(100vh - 64px)', // Header yüksekliğini çıkarıyoruz
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

// Başlık alanı için styled component
const HeaderContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
}));

// Personel kartı için styled component
const PersonnelCard = styled(Card)(({ theme }) => ({
  borderRadius: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  height: '100%',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
    cursor: 'pointer'
  }
}));

// Modal için styled component
const StyledModal = styled(Modal)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const ModalContent = styled(Paper)(({ theme }) => ({
  position: 'relative',
  width: '80%',
  maxWidth: 600,
  maxHeight: '80vh',
  overflow: 'auto',
  padding: theme.spacing(3),
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
}));

const ModalHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
}));

const ModalSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.grey[200]}`,
}));

// Personel ekleme modalı için styled component
const AddPersonnelModalContent = styled(Paper)(({ theme }) => ({
  position: 'relative',
  width: '90%',
  maxWidth: 500,
  maxHeight: '80vh',
  overflow: 'auto',
  padding: theme.spacing(3),
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
}));

const TabPanel = (props: { children: React.ReactNode; value: number; index: number }) => {
  const { children, value, index } = props;
  return (
    <div role="tabpanel" hidden={value !== index} style={{ padding: '16px 0' }}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

const Personnel: React.FC = () => {
  // State tanımlamaları
  const [loading, setLoading] = useState(true);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [selectedPersonnel, setSelectedPersonnel] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [personnelTasks, setPersonnelTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [personnelId, setPersonnelId] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [isAddingPersonnel, setIsAddingPersonnel] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Veri işleme fonksiyonu
  const processData = (personnelData: any) => {
    if (!personnelData) {
      setPersonnel([]);
      return;
    }

    // Personel listesini hazırla
    const personnelList = Object.entries(personnelData).map(([id, data]: [string, any]) => ({
      id,
      name: data.name || 'İsimsiz Personel',
      hasTask: data.hasTask || false,
      email: data.email || '',
      phone: data.phone || '',
      addedAt: data.addedAt || Date.now(),
    }));
    
    // Ekleme tarihine göre sırala (yeniden eskiye)
    const sortedPersonnel = [...personnelList].sort((a, b) => b.addedAt - a.addedAt);
    setPersonnel(sortedPersonnel);
  };

  // Component mount olduğunda veri yükleme
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Giriş yapmış kullanıcıyı kontrol et
        const user = auth.currentUser;
        if (!user) return;
        
        // Kullanıcı verilerini al ve şirket ID'sini bul
        const userSnapshot = await get(ref(database, `users/${user.uid}`));
        if (!userSnapshot.exists()) return;
        
        const userData = userSnapshot.val();
        const companyId = userData.companyId || null;
        setCompanyId(companyId);
        
        if (!companyId) {
          setLoading(false);
          return;
        }
        
        // Personel referansı oluştur
        const personnelRef = ref(database, `companies/${companyId}/personnel`);
        
        // Başlangıç verilerini al
        const personnelSnapshot = await get(personnelRef);
        const personnelData = personnelSnapshot.exists() ? personnelSnapshot.val() : {};
        
        // Verileri işle
        processData(personnelData);
        
        // Realtime güncellemeleri dinle
        onValue(personnelRef, (snapshot) => {
          const personnelData = snapshot.exists() ? snapshot.val() : {};
          processData(personnelData);
        });
      } catch (error) {
        console.error('Personel verilerini yüklerken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    // Cleanup fonksiyonu
    return () => {
      // Realtime listener'ları kaldır
      if (companyId) {
        off(ref(database, `companies/${companyId}/personnel`));
      }
    };
  }, []);

  // Personel detaylarını gösteren modal
  const handleOpenModal = async (person: any) => {
    setSelectedPersonnel(person);
    setModalOpen(true);
    await loadPersonnelTasks(person.id);
  };

  // Personele ait görevleri yükleyen fonksiyon
  const loadPersonnelTasks = async (personnelId: string) => {
    if (!companyId) return;
    
    setLoadingTasks(true);
    try {
      // Görevleri yükle
      const tasksRef = ref(database, `companies/${companyId}/tasks`);
      const tasksSnapshot = await get(tasksRef);
      
      if (tasksSnapshot.exists()) {
        const tasksData = tasksSnapshot.val();
        const personnelTasks = Object.entries(tasksData)
          .map(([id, data]: [string, any]) => ({
            id,
            ...data,
          }))
          .filter((task: any) => task.personnelId === personnelId);
        
        setPersonnelTasks(personnelTasks);
      } else {
        setPersonnelTasks([]);
      }
    } catch (error) {
      console.error('Görevleri yüklerken hata:', error);
      setPersonnelTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Personel silme onay modalını göster
  const handleDeleteConfirm = () => {
    setConfirmDelete(true);
  };

  // Personeli silme işlemi
  const handleDeletePersonnel = async () => {
    if (!companyId || !selectedPersonnel) return;
    
    try {
      // Personeli veritabanından sil
      await remove(ref(database, `companies/${companyId}/personnel/${selectedPersonnel.id}`));
      
      // Kullanıcının companyId değerini sil (null olarak güncelle)
      await update(ref(database, `users/${selectedPersonnel.id}`), {
        companyId: null,
      });
      
      setModalOpen(false);
      setConfirmDelete(false);
      setSelectedPersonnel(null);
    } catch (error) {
      console.error('Personel silinirken hata:', error);
      alert('Personel silinirken bir hata oluştu.');
    }
  };

  // Görev durumuna göre renk döndür
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success.main';
      case 'started':
        return 'info.main';
      case 'accepted':
        return 'secondary.main';
      case 'pending':
      default:
        return 'warning.main';
    }
  };

  // Görev durumuna göre metin döndür
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'started':
        return 'Görev Başladı';
      case 'accepted':
        return 'Kabul Edildi';
      case 'pending':
      default:
        return 'Beklemede';
    }
  };

  // Personel ekleme modalını açma
  const handleOpenAddModal = () => {
    setAddModalOpen(true);
    // Formları sıfırla
    setPersonnelId('');
    setBulkText('');
    setAddError(null);
    setAddSuccess(null);
    setTabValue(0);
  };

  // Modal tab değişimi
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setAddError(null);
    setAddSuccess(null);
  };

  // Toplu personel ekleme işlemini güncelle
  const handleAddBulkPersonnel = async () => {
    if (!bulkText.trim()) {
      setAddError('Lütfen en az bir personel ID girin');
      return;
    }

    setIsAddingPersonnel(true);
    setAddError(null);
    setAddSuccess(null);

    try {
      // Metin alanından her satırı bir personel ID'si olarak al
      const lines = bulkText.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('Lütfen en az bir personel ID girin');
      }

      let successCount = 0;
      let errorCount = 0;
      
      // Her satır bir personel ID'si olarak işlenecek
      for (const line of lines) {
        const id = line.trim();
        if (id) {
          try {
            await addPersonnel(id);
            successCount++;
          } catch (error) {
            errorCount++;
            console.error(`${id} ID'li personel eklenirken hata:`, error);
          }
        }
      }

      if (successCount > 0) {
        setAddSuccess(`${successCount} personel başarıyla eklendi${errorCount > 0 ? `, ${errorCount} personel eklenemedi` : ''}`);
        setBulkText(''); // Metin alanını temizle
      } else {
        setAddError('Hiçbir personel eklenemedi');
      }
    } catch (error: any) {
      setAddError(error.message || 'Toplu personel eklerken bir hata oluştu');
    } finally {
      setIsAddingPersonnel(false);
    }
  };

  // Tekli personel ekleme işlemi
  const handleAddSinglePersonnel = async () => {
    if (!personnelId.trim()) {
      setAddError('Lütfen bir Personel ID girin');
      return;
    }

    setIsAddingPersonnel(true);
    setAddError(null);
    setAddSuccess(null);

    try {
      await addPersonnel(personnelId.trim());
      setAddSuccess('Personel başarıyla eklendi');
      setPersonnelId('');
    } catch (error: any) {
      setAddError(error.message || 'Personel eklenirken bir hata oluştu');
    } finally {
      setIsAddingPersonnel(false);
    }
  };

  // Personel ekleme temel fonksiyonu
  const addPersonnel = async (employeeId: string): Promise<void> => {
    if (!employeeId) {
      throw new Error('Personel ID gereklidir');
    }

    if (!companyId) {
      throw new Error('Şirket bilgisi bulunamadı');
    }

    // Mevcut personel sayısını ve limit kontrolü
    const personnelSnapshot = await get(ref(database, `companies/${companyId}/personnel`));
    const currentPersonnelCount = personnelSnapshot.exists() ? Object.keys(personnelSnapshot.val()).length : 0;
    
    // Şirket bilgilerinden maksimum personel sayısını al
    const maxPersonnelSnapshot = await get(ref(database, `companies/${companyId}/info/maxPersonnel`));
    const maxPersonnel = maxPersonnelSnapshot.exists() ? maxPersonnelSnapshot.val() : 5; // Varsayılan 5
    
    if (currentPersonnelCount >= maxPersonnel) {
      throw new Error(`Personel limitiniz dolmuştur (${maxPersonnel}). Daha fazla personel eklemek için bizimle iletişime geçin.`);
    }

    // Kullanıcıyı bul
    const userSnapshot = await get(ref(database, `users/${employeeId}`));
    
    if (userSnapshot.exists()) {
      // Kullanıcı bulundu
      const userData = userSnapshot.val();
      
      // Kullanıcı zaten bir şirkete bağlı mı kontrol et
      if (userData.companyId) {
        throw new Error('Bu kullanıcı zaten bir şirkete bağlı');
      }
      
      // Personeli ekle
      await set(ref(database, `companies/${companyId}/personnel/${employeeId}`), {
        name: `${userData.firstName || ''} ${userData.lastName || ''}`,
        hasTask: false,
        addedAt: Date.now(),
        email: userData.email || '',
        phone: userData.phone || '',
      });
      
      // Kullanıcı bilgilerini güncelle
      await update(ref(database, `users/${employeeId}`), {
        companyId: companyId,
      });
      
      return;
    }
    
    // EmployeeId ile ara
    const usersSnapshot = await get(ref(database, 'users'));
    if (usersSnapshot.exists()) {
      const usersData = usersSnapshot.val();
      for (const [userId, userData] of Object.entries(usersData)) {
        if ((userData as any).employeeId === employeeId) {
          // Kullanıcı bulundu
          if ((userData as any).companyId) {
            throw new Error('Bu kullanıcı zaten bir şirkete bağlı');
          }
          
          // Personeli ekle
          await set(ref(database, `companies/${companyId}/personnel/${userId}`), {
            name: `${(userData as any).firstName || ''} ${(userData as any).lastName || ''}`,
            hasTask: false,
            addedAt: Date.now(),
            email: (userData as any).email || '',
            phone: (userData as any).phone || '',
          });
          
          // Kullanıcı bilgilerini güncelle
          await update(ref(database, `users/${userId}`), {
            companyId: companyId,
          });
          
          return;
        }
      }
    }
    
    throw new Error('Bu ID ile kayıtlı kullanıcı bulunamadı');
  };

  return (
    <ScrollableContent>
      {/* Başlık ve Ekleme Butonu */}
      <HeaderContainer>
        <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
          Personeller
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          sx={{ borderRadius: 2 }}
          onClick={handleOpenAddModal}
        >
          Yeni Personel Ekle
        </Button>
      </HeaderContainer>
      
      {/* Personel Listesi */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : personnel.length === 0 ? (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            mt: 4,
            p: 4,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1
          }}
        >
          <PersonIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Henüz personel bulunmuyor
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {personnel.map((person) => (
            <Grid item xs={12} sm={6} md={3} key={person.id}>
              <PersonnelCard onClick={() => handleOpenModal(person)}>
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <Avatar 
                        sx={{ 
                          width: 50, 
                          height: 50, 
                          bgcolor: 'primary.main',
                          fontSize: 22
                        }}
                      >
                        {person.name.substring(0, 1).toUpperCase()}
                      </Avatar>
                      <Box sx={{ ml: 1.5 }}>
                        <Typography variant="h6" fontWeight="bold" noWrap>
                          {person.name}
                        </Typography>
                        <Chip
                          label={person.hasTask ? 'Görev Atanmış' : 'Müsait'}
                          size="small"
                          color={person.hasTask ? 'primary' : 'success'}
                          sx={{ fontWeight: 'medium', mt: 0.5 }}
                        />
                      </Box>
                    </Box>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    {person.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {person.email}
                        </Typography>
                      </Box>
                    )}
                    
                    {person.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {person.phone}
                        </Typography>
                      </Box>
                    )}
                    
                    {person.hasTask && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <TaskIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="body2" color="primary">
                          Aktif görevleri var
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </PersonnelCard>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Personel Detay Modalı */}
      <StyledModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        aria-labelledby="personel-detay-modal"
      >
        <ModalContent>
          {selectedPersonnel && (
            <>
              <ModalHeader>
                <Typography variant="h5" fontWeight="bold">
                  Personel Ayrıntıları
                </Typography>
                <IconButton onClick={() => setModalOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </ModalHeader>
              
              {/* Profil Bilgileri */}
              <ModalSection>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar 
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      bgcolor: 'primary.main',
                      fontSize: 36,
                      mr: 2
                    }}
                  >
                    {selectedPersonnel.name.substring(0, 1).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      {selectedPersonnel.name}
                    </Typography>
                    <Chip
                      label={selectedPersonnel.hasTask ? 'Görev Atanmış' : 'Müsait'}
                      size="small"
                      color={selectedPersonnel.hasTask ? 'primary' : 'success'}
                      sx={{ fontWeight: 'medium', mt: 0.5 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      ID: {selectedPersonnel.id}
                    </Typography>
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                {/* İletişim Bilgileri */}
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
                  İletişim Bilgileri
                </Typography>
                
                {selectedPersonnel.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {selectedPersonnel.email}
                    </Typography>
                  </Box>
                )}
                
                {selectedPersonnel.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {selectedPersonnel.phone}
                    </Typography>
                  </Box>
                )}
              </ModalSection>
              
              {/* Görev Bilgileri */}
              <ModalSection>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  Atanmış Görevler
                </Typography>
                
                {loadingTasks ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <CircularProgress size={30} />
                  </Box>
                ) : personnelTasks.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ my: 2, textAlign: 'center' }}>
                    Bu personele henüz görev atanmamış.
                  </Typography>
                ) : (
                  personnelTasks.map((task) => (
                    <Card 
                      key={task.id} 
                      sx={{ 
                        mb: 1.5, 
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        border: `1px solid`,
                        borderColor: 'grey.200',
                      }}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {task.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {task.description ? task.description.substring(0, 100) + (task.description.length > 100 ? '...' : '') : 'Açıklama yok'}
                            </Typography>
                          </Box>
                          <Chip 
                            label={getStatusText(task.status)}
                            size="small"
                            sx={{ 
                              bgcolor: `${getStatusColor(task.status)}20`, 
                              color: getStatusColor(task.status),
                              fontWeight: 'medium' 
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  ))
                )}
              </ModalSection>
              
              {/* İşlem Butonları */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setModalOpen(false)}
                >
                  Kapat
                </Button>
                {!confirmDelete ? (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleDeleteConfirm}
                  >
                    Personeli Sil
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      color="inherit"
                      size="small"
                      onClick={() => setConfirmDelete(false)}
                    >
                      İptal
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      onClick={handleDeletePersonnel}
                    >
                      Silmeyi Onayla
                    </Button>
                  </Box>
                )}
              </Box>
            </>
          )}
        </ModalContent>
      </StyledModal>
      
      {/* Personel Ekleme Modalı */}
      <StyledModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        aria-labelledby="personel-ekleme-modal"
      >
        <AddPersonnelModalContent>
          <ModalHeader>
            <Typography variant="h5" fontWeight="bold">
              Personel Ekle
            </Typography>
            <IconButton onClick={() => setAddModalOpen(false)}>
              <CloseIcon />
            </IconButton>
          </ModalHeader>
          
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab 
              icon={<PersonAddIcon />} 
              label="Tek Personel" 
              iconPosition="start"
            />
            <Tab 
              icon={<GroupIcon />} 
              label="Toplu Ekle" 
              iconPosition="start"
            />
          </Tabs>
          
          {addError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAddError(null)}>
              {addError}
            </Alert>
          )}
          
          {addSuccess && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAddSuccess(null)}>
              {addSuccess}
            </Alert>
          )}
          
          <TabPanel value={tabValue} index={0}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Eklemek istediğiniz personelin ID'sini girin. Personel uygulama üzerinden kayıt olmuş olmalıdır.
            </Typography>
            
            <TextField
              label="Personel ID"
              fullWidth
              value={personnelId}
              onChange={(e) => setPersonnelId(e.target.value)}
              margin="normal"
              variant="outlined"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddSinglePersonnel}
                disabled={isAddingPersonnel || !personnelId.trim()}
                startIcon={isAddingPersonnel ? <CircularProgress size={20} /> : <PersonAddIcon />}
              >
                {isAddingPersonnel ? 'Ekleniyor...' : 'Personel Ekle'}
              </Button>
            </Box>
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Toplu personel eklemek için ID'leri alt alta yazın. Her satırda bir personel ID'si olmalıdır.
            </Typography>
            
            <TextField
              label="Personel ID listesi"
              fullWidth
              multiline
              rows={6}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Örnek:
123456
789012
345678"
              variant="outlined"
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddBulkPersonnel}
                disabled={isAddingPersonnel || !bulkText.trim()}
                startIcon={isAddingPersonnel ? <CircularProgress size={20} /> : <GroupIcon />}
              >
                {isAddingPersonnel ? 'Yükleniyor...' : 'Toplu Ekle'}
              </Button>
            </Box>
          </TabPanel>
        </AddPersonnelModalContent>
      </StyledModal>
    </ScrollableContent>
  );
};

export default Personnel; 