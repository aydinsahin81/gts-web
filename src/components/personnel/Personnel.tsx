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
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ToggleButtonGroup,
  ToggleButton,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
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
  Search as SearchIcon,
  PhotoLibrary as PhotoLibraryIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { ref, get, onValue, off, remove, update, set, push } from 'firebase/database';
import { database, auth } from '../../firebase';
import { Html5Qrcode } from 'html5-qrcode';
import CompanyQRModal from './CompanyQRModal';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { useNavigate } from 'react-router-dom';

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

// İnce personel kartı için styled component
const SlimPersonnelCard = styled(Card)(({ theme }) => ({
  borderRadius: 8,
  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
  margin: '4px 0',
  transition: 'background-color 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: theme.palette.grey[50],
    cursor: 'pointer'
  }
}));

// Liste görünümü için tablo bileşeni
const PersonnelTable: React.FC<{ 
  personnel: any[],
  onViewDetails: (id: string) => void,
  onDelete: (id: string) => void,
  onSendMessage: (id: string) => void,
  showDeleted: boolean,
  onRestore: (id: string) => void
}> = ({ 
  personnel, 
  onViewDetails, 
  onDelete, 
  onSendMessage,
  showDeleted,
  onRestore
}) => {
  return (
    <TableContainer component={Paper} sx={{ 
      mt: 2, 
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
      borderRadius: 2,
      maxHeight: 'calc(100vh - 240px)',
      overflowY: 'auto'
    }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell width="30%">Ad Soyad</TableCell>
            <TableCell width="20%">Telefon</TableCell>
            <TableCell width="25%">E-posta</TableCell>
            {!showDeleted && <TableCell width="10%">Durum</TableCell>}
            <TableCell width="15%" align="right">İşlemler</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {personnel.map((person) => (
            <TableRow key={person.id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: person.fcmToken ? '#4caf50' : '#f44336',
                      mr: 1.5
                    }}
                  >
                    {person.name?.charAt(0) || 'P'}
                  </Avatar>
                  <Typography variant="body2" fontWeight="medium">
                    {person.name}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {person.phone || '-'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ 
                  maxWidth: '180px', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {person.email || '-'}
                </Typography>
              </TableCell>
              {!showDeleted && (
                <TableCell>
                  <Chip 
                    size="small"
                    label={person.hasTask ? "Görev Atanmış" : "Müsait"} 
                    color={person.hasTask ? "primary" : "success"}
                    sx={{ fontSize: '11px', height: 24 }}
                  />
                </TableCell>
              )}
              <TableCell align="right">
                {showDeleted ? (
                  <Tooltip title="İşe Geri Al">
                    <IconButton 
                      size="small" 
                      onClick={() => onRestore(person.id)}
                      sx={{ color: 'success.main', p: 0.5 }}
                    >
                      <PersonAddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <>
                    <Tooltip title="Detaylar">
                      <IconButton 
                        size="small" 
                        onClick={() => onViewDetails(person.id)}
                        sx={{ color: 'primary.main', p: 0.5 }}
                      >
                        <PersonIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Mesaj Gönder">
                      <IconButton 
                        size="small" 
                        onClick={() => onSendMessage(person.id)}
                        sx={{ color: 'success.main', p: 0.5, ml: 0.5 }}
                      >
                        <EmailIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
          {personnel.length === 0 && (
            <TableRow>
              <TableCell colSpan={showDeleted ? 4 : 5} align="center" sx={{ py: 3 }}>
                <Typography color="text.secondary">
                  {showDeleted ? "Silinen personel bulunmuyor" : "Personel bulunamadı"}
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Silme onay modalı
const DeleteConfirmModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  personName: string;
  hasTask: boolean;
}> = ({ open, onClose, onConfirm, loading, personName, hasTask }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Personel Silme Onayı
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          <b>{personName}</b> adlı personeli silmek istediğinizden emin misiniz?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {hasTask 
            ? "Bu personele aktif görev atanmış durumda. Lütfen önce görevi başka bir personele atayın."
            : "Bu işlem geri alınamaz ve personele ait tüm veriler silinecektir."}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          İptal
        </Button>
        <Button 
          onClick={onConfirm} 
          color="error" 
          variant="contained" 
          disabled={loading || hasTask}
          startIcon={loading ? <CircularProgress size={16} /> : <DeleteIcon />}
        >
          {loading ? 'Siliniyor...' : 'Evet, Sil'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Personel Bilgi Modalı
const PersonnelInfoModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #eee',
        pb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <InfoIcon sx={{ color: 'primary.main', mr: 1 }} />
          <Typography variant="h6">Personel Sayfası Kullanımı</Typography>
        </Box>
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 3, maxHeight: '70vh', overflowY: 'auto' }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="primary">
          Personel Sayfası Genel Bakış
        </Typography>
        <Typography paragraph>
          Bu sayfada şirketinizin personellerini görüntüleyebilir, ekleyebilir, silebilir ve mesaj gönderebilirsiniz. 
          Personel verilerini yönetmek için aşağıdaki özellikleri kullanabilirsiniz:
        </Typography>
        
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Kart ve Liste Görünümü
          </Typography>
          <Typography variant="body2" paragraph>
            Sağ üst köşedeki <ViewModuleIcon fontSize="small" sx={{ verticalAlign: 'middle' }}/> ve <ViewListIcon fontSize="small" sx={{ verticalAlign: 'middle' }}/> 
            butonları ile personel listesini kart veya tablo şeklinde görüntüleyebilirsiniz.
          </Typography>
        </Box>
        
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Personel Ekleme
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Yeni Personel Ekle</strong> butonu ile tek tek personel ekleyebilir veya QR kod ile personel 
            kaydı yapabilirsiniz. Personel eklerken isim, telefon ve e-posta bilgilerini girebilirsiniz.
          </Typography>
          <Typography variant="body2">
            <strong>QR Kod Basma</strong> butonu ile de şirketinize özel QR kod oluşturabilir ve 
            personellerinizin kolayca kaydolması için kullanabilirsiniz.
          </Typography>
        </Box>
        
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Personel Yönetimi
          </Typography>
          <Typography variant="body2" paragraph>
            Her personelin kartında veya tablo satırında:
          </Typography>
          <List dense disablePadding>
            <ListItem disableGutters>
              <ListItemAvatar sx={{ minWidth: 36 }}>
                <PersonIcon fontSize="small" color="primary" />
              </ListItemAvatar>
              <ListItemText 
                primary="Detaylar"
                secondary="Personel detaylarını görüntülemek için personel kartına tıklayabilirsiniz." 
              />
            </ListItem>
            <ListItem disableGutters>
              <ListItemAvatar sx={{ minWidth: 36 }}>
                <EmailIcon fontSize="small" color="secondary" />
              </ListItemAvatar>
              <ListItemText 
                primary="Mesaj Gönderme" 
                secondary="Mesaj ikonu ile personele özel mesaj gönderebilirsiniz." 
              />
            </ListItem>
            <ListItem disableGutters>
              <ListItemAvatar sx={{ minWidth: 36 }}>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemAvatar>
              <ListItemText 
                primary="Silme" 
                secondary="Silme ikonu ile personeli sistemden kaldırabilirsiniz." 
              />
            </ListItem>
          </List>
        </Box>
        
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Durum İşaretleri
          </Typography>
          <Typography variant="body2" paragraph>
            Personellerin görev durumlarını takip edebilirsiniz:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Chip 
              label="Müsait" 
              color="success" 
              size="small" 
              sx={{ mr: 2, fontSize: '11px', height: 24 }} 
            />
            <Typography variant="body2">
              Personele henüz görev atanmamış, yeni görev verebilirsiniz.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Chip 
              label="Görev Atanmış" 
              color="primary" 
              size="small" 
              sx={{ mr: 2, fontSize: '11px', height: 24 }} 
            />
            <Typography variant="body2">
              Personel bir veya daha fazla göreve atanmış durumda.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
        <Button 
          onClick={onClose} 
          variant="contained" 
          color="primary"
          sx={{ borderRadius: 2 }}
        >
          Anladım
        </Button>
      </DialogActions>
    </Dialog>
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
  const [isScanning, setIsScanning] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [showDeleted, setShowDeleted] = useState(false); // Silinen personelleri gösterme durumu
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [companyQRModalOpen, setCompanyQRModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const navigate = useNavigate();

  // Görünüm modunu localStorage'dan yükle
  useEffect(() => {
    const savedViewMode = localStorage.getItem('personnelViewMode');
    if (savedViewMode === 'list' || savedViewMode === 'card') {
      setViewMode(savedViewMode);
    }
  }, []);

  // Görünüm modu değiştiğinde localStorage'a kaydet
  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: 'card' | 'list' | null
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
      localStorage.setItem('personnelViewMode', newViewMode);
    }
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
  }, [showDeleted]); // showDeleted değiştiğinde useEffect yeniden çalışacak

  // Veri işleme fonksiyonu
  const processData = (personnelData: any) => {
    if (!personnelData) {
      setPersonnel([]);
      return;
    }

    // Personel listesini hazırla (isDeleted durumuna göre filtrele)
    const personnelList = Object.entries(personnelData)
      .filter(([_, data]: [string, any]) => {
        // showDeleted true ise silinenleri, false ise silinmeyenleri göster
        const isDeleted = data.isDeleted === true;
        return showDeleted ? isDeleted : !isDeleted;
      })
      .map(([id, data]: [string, any]) => ({
        id,
        name: data.name || 'İsimsiz Personel',
        hasTask: data.hasTask || false,
        email: data.email || '',
        phone: data.phone || '',
        addedAt: data.addedAt || Date.now(),
        deletedAt: data.deletedAt || null,
        isDeleted: data.isDeleted || false
      }));
    
    // Ekleme tarihine göre sırala (yeniden eskiye)
    const sortedPersonnel = [...personnelList].sort((a, b) => b.addedAt - a.addedAt);
    setPersonnel(sortedPersonnel);
  };

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

  // Personel silme işlemi
  const handleDeletePersonnel = async () => {
    if (!selectedPersonnel || !auth.currentUser) return;
    
    // Aktif görev kontrolü
    if (selectedPersonnel.hasTask) {
      setSnackbarMessage('Görev atanmış personel silinemez. Lütfen önce görevi başka bir personele atayın.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setDeleteModalOpen(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Şirket ID'sini al
      const userRef = ref(database, `users/${auth.currentUser.uid}`);
      const userSnapshot = await get(userRef);
      const userData = userSnapshot.val();
      const companyId = userData.companyId;
      
      if (!companyId) {
        throw new Error('Şirket ID bulunamadı');
      }
      
      // Personeli soft delete yap (isDeleted işareti ekle)
      const personnelRef = ref(database, `companies/${companyId}/personnel/${selectedPersonnel.id}`);
      await update(personnelRef, {
        isDeleted: true,
        deletedAt: Date.now()
      });
      
      // Kullanıcının companyId'sini null yap
      const personnelUserRef = ref(database, `users/${selectedPersonnel.id}`);
      await update(personnelUserRef, {
        companyId: null
      });
      
      // Başarı mesajı
      setSnackbarMessage('Personel başarıyla silindi');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // Modalı kapat ve listeden kaldır
      setDeleteModalOpen(false);
      setModalOpen(false); // Personel detay modalını kapat
      setPersonnel(prev => prev.filter(p => p.id !== selectedPersonnel.id));
    } catch (error) {
      console.error('Personel silinirken hata:', error);
      setSnackbarMessage('Personel silinirken bir hata oluştu');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
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
      
      // Personel zaten şirkette mi kontrol et
      const personnelSnapshot = await get(ref(database, `companies/${companyId}/personnel/${employeeId}`));
      
      if (personnelSnapshot.exists()) {
        const personnelData = personnelSnapshot.val();
        
        // Personel silinmiş mi kontrol et
        if (personnelData.isDeleted) {
          // Silinen personeli geri al
          await update(ref(database, `companies/${companyId}/personnel/${employeeId}`), {
            isDeleted: null,
            deletedAt: null
          });
          
          // Kullanıcı bilgilerini güncelle
          await update(ref(database, `users/${employeeId}`), {
            companyId: companyId
          });
          
          return;
        }
        
        throw new Error('Bu kullanıcı zaten şirkette aktif olarak çalışıyor');
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

  // QR kod resim yükleme
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsScanning(true);
    
    const html5QrCode = new Html5Qrcode("qr-reader");
    
    // QR kodu çözümle
    html5QrCode.scanFile(file, true)
      .then(decodedText => {
        setPersonnelId(decodedText);
        setIsScanning(false);
      })
      .catch(error => {
        console.error("QR kod tarama hatası:", error);
        setAddError("QR kod tanınamadı veya geçersiz. Lütfen başka bir resim deneyin.");
        setIsScanning(false);
      });
  };
  
  // QR kod resim yükleme butonunu tetikle
  const handleQrCodeImageScan = () => {
    fileInputRef.current?.click();
  };

  // QR kodunu görüntülemek için modal açma/kapama işlevleri
  const handleOpenCompanyQRModal = () => {
    setCompanyQRModalOpen(true);
  };

  const handleCloseCompanyQRModal = () => {
    setCompanyQRModalOpen(false);
  };

  // Mesaj sayfasına yönlendirme
  const handleSendMessage = (personnelId: string) => {
    // Personelin adını ve ID'sini mesaj sayfasına parametre olarak gönder
    navigate(`/messages?personnelId=${personnelId}`);
  };

  // İşe Geri Alma fonksiyonu
  const handleRestorePersonnel = async (personnelId: string) => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      // Personeli geri al
      await update(ref(database, `companies/${companyId}/personnel/${personnelId}`), {
        isDeleted: null,
        deletedAt: null
      });
      
      // Kullanıcı bilgilerini güncelle
      await update(ref(database, `users/${personnelId}`), {
        companyId: companyId
      });
      
      // Başarı mesajı
      setSnackbarMessage('Personel başarıyla işe geri alındı');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // Listeyi güncelle
      setPersonnel(prev => prev.filter(p => p.id !== personnelId));
    } catch (error) {
      console.error('Personel geri alınırken hata:', error);
      setSnackbarMessage('Personel geri alınırken bir hata oluştu');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollableContent>
      {/* Başlık, Görünüm Seçici ve Ekleme Butonu */}
      <HeaderContainer>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
            Personeller
          </Typography>
          <Button
            variant={showDeleted ? "contained" : "outlined"}
            color="error"
            size="small"
            onClick={() => setShowDeleted(!showDeleted)}
            startIcon={<DeleteIcon />}
          >
            {showDeleted ? "Aktif Personeller" : "Silinen Personeller"}
          </Button>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="personel görünümü"
            size="small"
          >
            <ToggleButton value="card" aria-label="kart görünümü">
              <ViewModuleIcon />
            </ToggleButton>
            <ToggleButton value="list" aria-label="liste görünümü">
              <ViewListIcon />
            </ToggleButton>
          </ToggleButtonGroup>
          <IconButton
            color="warning"
            onClick={() => setInfoModalOpen(true)}
            sx={{ 
              bgcolor: 'warning.light', 
              color: 'white', 
              '&:hover': { bgcolor: 'warning.main' },
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              width: 36,
              height: 36
            }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
          <Button
            variant="contained"
            color="success"
            startIcon={<QrCode2Icon />}
            onClick={handleOpenCompanyQRModal}
          >
            Şirket QR
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            sx={{ borderRadius: 2 }}
            onClick={handleOpenAddModal}
            disabled={showDeleted}
          >
            Yeni Personel Ekle
          </Button>
        </Box>
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
            {showDeleted ? "Silinen personel bulunmuyor" : "Henüz personel bulunmuyor"}
          </Typography>
        </Box>
      ) : viewMode === 'card' ? (
        <Grid container spacing={2}>
          {personnel.map((person) => (
            <Grid item xs={12} sm={6} md={3} key={person.id}>
              <PersonnelCard onClick={() => !showDeleted && handleOpenModal(person)}>
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
                        {!showDeleted && (
                          <Chip
                            label={person.hasTask ? 'Görev Atanmış' : 'Müsait'}
                            size="small"
                            color={person.hasTask ? 'primary' : 'success'}
                            sx={{ fontWeight: 'medium', mt: 0.5 }}
                          />
                        )}
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
                    
                    {!showDeleted && person.hasTask && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <TaskIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="body2" color="primary">
                          Aktif görevleri var
                        </Typography>
                      </Box>
                    )}
                    
                    {showDeleted && (
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<PersonAddIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestorePersonnel(person.id);
                          }}
                        >
                          İşe Geri Al
                        </Button>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </PersonnelCard>
            </Grid>
          ))}
        </Grid>
      ) : (
        <PersonnelTable 
          personnel={personnel}
          onViewDetails={(id) => {
            const selectedPerson = personnel.find(p => p.id === id);
            if (selectedPerson) {
              setSelectedPersonnel(selectedPerson);
              setModalOpen(true);
            }
          }}
          onDelete={(id) => {
            const selectedPerson = personnel.find(p => p.id === id);
            if (selectedPerson) {
              setSelectedPersonnel(selectedPerson);
              setDeleteModalOpen(true);
            }
          }}
          onSendMessage={handleSendMessage}
          showDeleted={showDeleted}
          onRestore={handleRestorePersonnel}
        />
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
                    {!showDeleted && (
                      <Chip
                        label={selectedPersonnel.hasTask ? 'Görev Atanmış' : 'Müsait'}
                        size="small"
                        color={selectedPersonnel.hasTask ? 'primary' : 'success'}
                        sx={{ fontWeight: 'medium', mt: 0.5 }}
                      />
                    )}
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
            
            <Box sx={{ mb: 2 }}>
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
              
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleQrCodeImageScan}
                startIcon={<PhotoLibraryIcon />}
                sx={{ mt: 1 }}
                disabled={isScanning}
              >
                {isScanning ? 'Taranıyor...' : 'Galeriden QR Kod Tara'}
              </Button>
              
              {/* Gizli dosya yükleme input'u */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              
              {/* QR kod tarayıcısı için gizli div */}
              <div id="qr-reader" style={{ display: 'none' }}></div>
            </Box>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddSinglePersonnel}
                disabled={isAddingPersonnel || !personnelId.trim() || isScanning}
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

      {/* Şirket QR Modal */}
      <CompanyQRModal 
        open={companyQRModalOpen} 
        onClose={handleCloseCompanyQRModal} 
      />

      {/* Silme Onay Modalı */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeletePersonnel}
        loading={loading}
        personName={selectedPersonnel?.name || ''}
        hasTask={selectedPersonnel?.hasTask || false}
      />

      {/* Personel Bilgi Modalı */}
      <PersonnelInfoModal 
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
      />

      {/* Snackbar bileşeni */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </ScrollableContent>
  );
};

export default Personnel; 