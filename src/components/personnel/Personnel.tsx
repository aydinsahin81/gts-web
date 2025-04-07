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
  Snackbar,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
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
  Info as InfoIcon,
  Download as DownloadIcon,
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { ref, get, onValue, off, remove, update, set, push } from 'firebase/database';
import { database, auth } from '../../firebase';
import { Html5Qrcode } from 'html5-qrcode';
import CompanyQRModal from './CompanyQRModal';
import PersonnelDetailsModal from './PersonnelDetailsModal';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { useNavigate } from 'react-router-dom';
import { utils, writeFile } from 'xlsx';
import BranchQRModal from '../branches/BranchQRModal';

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

// Personel için styled component tanımlamaları
const ModalHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
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
            <TableCell width="25%">Ad Soyad</TableCell>
            <TableCell width="15%">Telefon</TableCell>
            <TableCell width="20%">E-posta</TableCell>
            {!showDeleted && <TableCell width="10%">Durum</TableCell>}
            <TableCell width="15%">Şube</TableCell>
            <TableCell width="10%">Rol</TableCell>
            <TableCell width="15%" align="right">İşlemler</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {personnel.map((person) => (
            <TableRow 
              key={person.id} 
              hover
              onClick={() => onViewDetails(person.id)}
              sx={{ cursor: 'pointer' }}
            >
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
              <TableCell>
                {person.branchesId ? (
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                    <BusinessIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.main', fontSize: '0.875rem' }} />
                    {person.branchName || 'Bilinmeyen Şube'}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">-</Typography>
                )}
              </TableCell>
              <TableCell>
                <Chip 
                  size="small"
                  label={person.role === 'employee' ? 'Personel' : person.role || 'Personel'} 
                  color={
                    person.role === 'admin' ? 'error' : 
                    person.role === 'manager' ? 'warning' : 
                    'default'
                  }
                  sx={{ 
                    fontSize: '11px', 
                    height: 24,
                    minWidth: 80
                  }}
                />
              </TableCell>
              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                {showDeleted ? (
                  <Tooltip title="İşe Geri Al">
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestore(person.id);
                      }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(person.id);
                        }}
                        sx={{ color: 'primary.main', p: 0.5 }}
                      >
                        <PersonIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Mesaj Gönder">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendMessage(person.id);
                        }}
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
              <TableCell colSpan={showDeleted ? 6 : 7} align="center" sx={{ py: 3 }}>
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

// Personnel arayüzü
interface PersonnelProps {
  branchId?: string;
  isManager?: boolean;
}

const Personnel: React.FC<PersonnelProps> = ({ branchId, isManager = false }) => {
  // State tanımlamaları
  const [loading, setLoading] = useState(true);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [filteredPersonnel, setFilteredPersonnel] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
  const [branchQRModalOpen, setBranchQRModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [branchName, setBranchName] = useState<string>('Şube');
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  
  const navigate = useNavigate();

  // Rol seçenekleri
  const roleOptions = [
    { id: 'admin', name: 'Admin' },
    { id: 'manager', name: 'Yönetici' },
    { id: 'employee', name: 'Personel' }
  ];

  // Durum seçenekleri
  const statusOptions = [
    { id: 'hasTask', name: 'Görev Atanmış' },
    { id: 'available', name: 'Müsait' }
  ];

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
        
        // Önce şubeleri yükle
        const branchesRef = ref(database, `companies/${companyId}/branches`);
        const branchesSnapshot = await get(branchesRef);
        let branchesData: Record<string, any> = {};
        
        if (branchesSnapshot.exists()) {
          branchesData = branchesSnapshot.val();
        }
        
        // Personel verilerini yükle
        const personnelRef = ref(database, `companies/${companyId}/personnel`);
        const personnelSnapshot = await get(personnelRef);
        
        if (!personnelSnapshot.exists()) {
          setPersonnel([]);
          setLoading(false);
          return;
        }
        
        const personnelData = personnelSnapshot.exists() ? personnelSnapshot.val() : {};
        
        // Personel listesini hazırla (isDeleted durumuna göre filtrele)
        const personnelList = await Promise.all(
          Object.entries(personnelData)
            .filter(([_, data]: [string, any]) => {
              // showDeleted true ise silinenleri, false ise silinmeyenleri göster
              const isDeleted = data.isDeleted === true;
              return showDeleted ? isDeleted : !isDeleted;
            })
            .map(async ([id, data]: [string, any]) => {
              const person = {
                id,
                name: data.name || 'İsimsiz Personel',
                hasTask: data.hasTask || false,
                email: data.email || '',
                phone: data.phone || '',
                addedAt: data.addedAt || Date.now(),
                deletedAt: data.deletedAt || null,
                isDeleted: data.isDeleted || false,
                branchesId: data.branchesId || null,
                branchName: '',
                role: data.role || '' // Personel rolünü kaydet
              };
              
              // Kullanıcı veritabanından rolü kontrol et (personel verisinde yoksa)
              if (!person.role) {
                const userRef = ref(database, `users/${id}`);
                const userSnapshot = await get(userRef);
                
                if (userSnapshot.exists()) {
                  const userData = userSnapshot.val();
                  person.role = userData.role || userData.userRole || '';
                }
              }
              
              return person;
            })
        );
        
        // Her personel için şube bilgilerini ve users'dan branchesId'yi kontrol et
        const enhancedPersonnel = await Promise.all(
          personnelList.map(async (person) => {
            // Önce personelin şube ID'sini kontrol et
            if (!person.branchesId) {
              // Şube ID'si yoksa users veritabanında kontrol et
              const userRef = ref(database, `users/${person.id}`);
              const userSnapshot = await get(userRef);
              
              if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                if (userData.branchesId) {
                  person.branchesId = userData.branchesId;
                }
              }
            }
            
            // Şube ID'si varsa şube adını bul
            if (person.branchesId && branchesData[person.branchesId as string]) {
              // Şube yapısına göre adı al
              const branchData = branchesData[person.branchesId as string] as any;
              if (branchData.name) {
                person.branchName = branchData.name;
              } else if (branchData.basicInfo && branchData.basicInfo.name) {
                person.branchName = branchData.basicInfo.name;
              } else {
                person.branchName = 'Bilinmeyen Şube';
              }
            }
            
            return person;
          })
        );
        
        // branchId prop'u varsa ve yönetici modundaysak sadece o şubenin personellerini göster
        // ve manager rolüne sahip personelleri filtrele
        let sortedPersonnel = [...enhancedPersonnel];
        if (isManager) {
          console.log("Şubeye ve role göre personel filtreleniyor:");
          
          // Yönetici modunda, manager rolüne sahip personelleri filtreliyoruz
          sortedPersonnel = sortedPersonnel.filter(person => {
            // Önce role göre filtrele - manager rolüne sahip personelleri çıkar
            if (person.role === 'manager' || person.role === 'admin') {
              return false;
            }
            
            // Şube ID'sine göre filtrele (eğer branchId belirtildiyse)
            if (branchId) {
              return person.branchesId === branchId;
            }
            
            return true;
          });
        }
        
        // Ekleme tarihine göre sırala (yeniden eskiye)
        sortedPersonnel.sort((a, b) => b.addedAt - a.addedAt);
        setPersonnel(sortedPersonnel);
        
        // Realtime güncellemeleri dinle - güncellemeler olduğunda tüm süreci tekrarla
        onValue(personnelRef, async (snapshot) => {
          if (!snapshot.exists()) {
            setPersonnel([]);
            return;
          }

          const personnelData = snapshot.val();
          
          // Personel listesini hazırla
          const personnelList = await Promise.all(
            Object.entries(personnelData)
              .filter(([_, data]: [string, any]) => {
                const isDeleted = data.isDeleted === true;
                return showDeleted ? isDeleted : !isDeleted;
              })
              .map(async ([id, data]: [string, any]) => {
                const person = {
                  id,
                  name: data.name || 'İsimsiz Personel',
                  hasTask: data.hasTask || false,
                  email: data.email || '',
                  phone: data.phone || '',
                  addedAt: data.addedAt || Date.now(),
                  deletedAt: data.deletedAt || null,
                  isDeleted: data.isDeleted || false,
                  branchesId: data.branchesId || null,
                  branchName: '',
                  role: data.role || '' // Personel rolünü kaydet
                };
                
                // Kullanıcı veritabanından rolü kontrol et (personel verisinde yoksa)
                if (!person.role) {
                  const userRef = ref(database, `users/${id}`);
                  const userSnapshot = await get(userRef);
                  
                  if (userSnapshot.exists()) {
                    const userData = userSnapshot.val();
                    person.role = userData.role || userData.userRole || '';
                  }
                }
                
                return person;
              })
          );
          
          // Şubeleri yeniden yükle
          const branchesSnapshot = await get(branchesRef);
          const branchesData: Record<string, any> = branchesSnapshot.exists() ? branchesSnapshot.val() : {};
          
          // Her personel için şube bilgilerini ve users'dan branchesId'yi kontrol et
          const enhancedPersonnel = await Promise.all(
            personnelList.map(async (person) => {
              // Önce personelin şube ID'sini kontrol et
              if (!person.branchesId) {
                // Şube ID'si yoksa users veritabanında kontrol et
                const userRef = ref(database, `users/${person.id}`);
                const userSnapshot = await get(userRef);
                
                if (userSnapshot.exists()) {
                  const userData = userSnapshot.val();
                  if (userData.branchesId) {
                    person.branchesId = userData.branchesId;
                  }
                }
              }
              
              // Şube ID'si varsa şube adını bul
              if (person.branchesId && branchesData[person.branchesId as string]) {
                // Şube yapısına göre adı al
                const branchData = branchesData[person.branchesId as string] as any;
                if (branchData.name) {
                  person.branchName = branchData.name;
                } else if (branchData.basicInfo && branchData.basicInfo.name) {
                  person.branchName = branchData.basicInfo.name;
                } else {
                  person.branchName = 'Bilinmeyen Şube';
                }
              }
              
              return person;
            })
          );
          
          // branchId prop'u varsa ve yönetici modundaysak sadece o şubenin personellerini göster
          // ve manager rolüne sahip personelleri filtrele
          let sortedPersonnel = [...enhancedPersonnel];
          if (isManager) {
            console.log("Şubeye ve role göre personel filtreleniyor (realtime):");
            
            // Yönetici modunda, manager rolüne sahip personelleri filtreliyoruz
            sortedPersonnel = sortedPersonnel.filter(person => {
              // Önce role göre filtrele - manager rolüne sahip personelleri çıkar
              if (person.role === 'manager' || person.role === 'admin') {
                return false;
              }
              
              // Şube ID'sine göre filtrele (eğer branchId belirtildiyse)
              if (branchId) {
                return person.branchesId === branchId;
              }
              
              return true;
            });
          }
          
          // Ekleme tarihine göre sırala (yeniden eskiye)
          sortedPersonnel.sort((a, b) => b.addedAt - a.addedAt);
          setPersonnel(sortedPersonnel);
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
  }, [showDeleted, branchId, isManager]); // branchId ve isManager değiştiğinde de useEffect yeniden çalışacak

  // Şubeleri yükleme fonksiyonu
  useEffect(() => {
    const loadBranches = async () => {
      if (!companyId) return;
      
      try {
        const branchesRef = ref(database, `companies/${companyId}/branches`);
        const snapshot = await get(branchesRef);
        
        if (snapshot.exists()) {
          const branchesData = snapshot.val();
          const branchesList = Object.entries(branchesData).map(([id, data]: [string, any]) => ({
            id,
            name: data.name || data.basicInfo?.name || 'Bilinmeyen Şube'
          }));
          setBranches(branchesList);
        }
      } catch (error) {
        console.error('Şubeler yüklenirken hata:', error);
      }
    };
    
    loadBranches();
  }, [companyId]);

  // Filtreleme fonksiyonu
  useEffect(() => {
    let filtered = personnel;
    
    // Arama filtresi
    if (searchTerm.trim()) {
      filtered = filtered.filter(person => 
        person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (person.email && person.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (person.phone && person.phone.includes(searchTerm))
      );
    }
    
    // Şube filtresi
    if (selectedBranch) {
      filtered = filtered.filter(person => person.branchesId === selectedBranch);
    }

    // Rol filtresi
    if (selectedRole) {
      filtered = filtered.filter(person => person.role === selectedRole);
    }

    // Durum filtresi
    if (selectedStatus) {
      filtered = filtered.filter(person => {
        if (selectedStatus === 'hasTask') {
          return person.hasTask;
        } else {
          return !person.hasTask;
        }
      });
    }
    
    setFilteredPersonnel(filtered);
  }, [searchTerm, selectedBranch, selectedRole, selectedStatus, personnel]);

  // Personel detaylarını gösteren modal
  const handleOpenModal = async (person: any) => {
    try {
      console.log("Modal açılıyor, personel:", person);
      
      // Veritabanından kullanıcı bilgilerini kontrol et
      if (person.id) {
        const userRef = ref(database, `users/${person.id}`);
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          console.log("Kullanıcı verileri:", userData);
          
          // Users veritabanında branchesId var mı kontrol et
          if (userData.branchesId && !person.branchesId) {
            console.log("Kullanıcı veritabanında branchesId bulundu:", userData.branchesId);
            person.branchesId = userData.branchesId;
          }
        }
      }
      
    setSelectedPersonnel(person);
    setModalOpen(true);
    setConfirmDelete(false); // Reset delete confirmation state
    
    if (person.id) {
        setLoadingTasks(true);
        // Personele ait görevleri yükle
        await loadPersonnelTasks(person.id);
        }
      } catch (error) {
        console.error('Personel bilgileri yüklenirken hata:', error);
      } finally {
        setLoadingTasks(false);
    }
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

  // Şube adını yükleme
  useEffect(() => {
    const loadBranchName = async () => {
      if (isManager && branchId && companyId) {
        try {
          const branchRef = ref(database, `companies/${companyId}/branches/${branchId}`);
          const snapshot = await get(branchRef);
          
          if (snapshot.exists()) {
            const branchData = snapshot.val();
            // Şube adını kontrol et - iki farklı yapıda olabilir
            if (branchData.name) {
              setBranchName(branchData.name);
            } else if (branchData.basicInfo && branchData.basicInfo.name) {
              setBranchName(branchData.basicInfo.name);
            }
          }
        } catch (error) {
          console.error('Şube adı yüklenirken hata:', error);
        }
      }
    };
    
    loadBranchName();
  }, [isManager, branchId, companyId]);
  
  // QR kodunu görüntülemek için modal açma/kapama işlevleri
  const handleOpenCompanyQRModal = () => {
    if (isManager && branchId) {
      setBranchQRModalOpen(true);
    } else {
      setCompanyQRModalOpen(true);
    }
  };

  const handleCloseCompanyQRModal = () => {
    setCompanyQRModalOpen(false);
  };
  
  const handleCloseBranchQRModal = () => {
    setBranchQRModalOpen(false);
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

  // Excel indirme fonksiyonu
  const handleDownloadExcel = () => {
    // Excel verilerini hazırla
    const excelData = personnel.map(person => ({
      'Ad Soyad': person.name,
      'E-posta': person.email || '-',
      'Telefon': person.phone || '-',
      'Durum': showDeleted ? 'Silinmiş' : (person.hasTask ? 'Görev Atanmış' : 'Müsait'),
      'Eklenme Tarihi': new Date(person.addedAt).toLocaleDateString('tr-TR'),
      'Silinme Tarihi': person.deletedAt ? new Date(person.deletedAt).toLocaleDateString('tr-TR') : '-'
    }));

    // Excel çalışma kitabı oluştur
    const wb = utils.book_new();
    const ws = utils.json_to_sheet(excelData);

    // Sütun genişliklerini ayarla
    const colWidths = [
      { wch: 30 }, // Ad Soyad
      { wch: 30 }, // E-posta
      { wch: 15 }, // Telefon
      { wch: 15 }, // Durum
      { wch: 15 }, // Eklenme Tarihi
      { wch: 15 }  // Silinme Tarihi
    ];
    ws['!cols'] = colWidths;

    // Başlık stilini ayarla
    const headerStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "CCCCCC" } },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    // Başlık hücrelerine stil uygula
    for (let i = 0; i < Object.keys(excelData[0]).length; i++) {
      const cellRef = utils.encode_cell({ r: 0, c: i });
      if (!ws[cellRef]) continue;
      ws[cellRef].s = headerStyle;
    }

    // Çalışma sayfasını kitaba ekle
    utils.book_append_sheet(wb, ws, showDeleted ? 'Silinen Personeller' : 'Aktif Personeller');

    // Excel dosyasını indir
    writeFile(wb, `${showDeleted ? 'Silinen_Personeller' : 'Aktif_Personeller'}_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`);
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
            color="info"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadExcel}
            disabled={personnel.length === 0}
          >
            Excel İndir
          </Button>
          {!isManager && (
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
          )}
        </Box>
      </HeaderContainer>

      {/* Arama ve Filtre Barı */}
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        gap: 2,
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Personel Ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ 
            maxWidth: 300,
            flexGrow: 1
          }}
        />
        
        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          flexGrow: 1
        }}>
          <Autocomplete
            size="small"
            options={branches}
            getOptionLabel={(option) => option.name}
            value={branches.find(b => b.id === selectedBranch) || null}
            onChange={(_, newValue) => setSelectedBranch(newValue?.id || null)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Şube Seçin"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            sx={{ minWidth: 200 }}
          />

          <Autocomplete
            size="small"
            options={roleOptions}
            getOptionLabel={(option) => option.name}
            value={roleOptions.find(r => r.id === selectedRole) || null}
            onChange={(_, newValue) => setSelectedRole(newValue?.id || null)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Rol Seçin"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            sx={{ minWidth: 200 }}
          />

          <Autocomplete
            size="small"
            options={statusOptions}
            getOptionLabel={(option) => option.name}
            value={statusOptions.find(s => s.id === selectedStatus) || null}
            onChange={(_, newValue) => setSelectedStatus(newValue?.id || null)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Durum Seçin"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <CheckCircleIcon />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            sx={{ minWidth: 200 }}
          />
        </Box>
      </Box>
      
      {/* Personel Listesi */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredPersonnel.length === 0 ? (
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
            {searchTerm ? "Arama sonucu bulunamadı" : (showDeleted ? "Silinen personel bulunmuyor" : "Henüz personel bulunmuyor")}
          </Typography>
        </Box>
      ) : viewMode === 'card' ? (
        <Grid container spacing={2}>
          {filteredPersonnel.map((person) => (
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
                    
                    {person.branchesId && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <BusinessIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {person.branchName || 'Bilinmeyen Şube'}
                        </Typography>
                      </Box>
                    )}
                    
                    {!showDeleted && person.hasTask && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
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
          personnel={filteredPersonnel}
          onViewDetails={(id) => {
            const selectedPerson = filteredPersonnel.find(p => p.id === id);
            if (selectedPerson) {
              setSelectedPersonnel(selectedPerson);
              setModalOpen(true);
            }
          }}
          onDelete={(id) => {
            const selectedPerson = filteredPersonnel.find(p => p.id === id);
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
      
      {/* Personel Ayrıntıları Modalı */}
      <PersonnelDetailsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedPersonnel={selectedPersonnel}
        personnelTasks={personnelTasks}
        loadingTasks={loadingTasks}
        showDeleted={showDeleted}
        confirmDelete={confirmDelete}
        onDeleteConfirm={handleDeleteConfirm}
        onCancelDelete={() => setConfirmDelete(false)}
        onDeletePersonnel={handleDeletePersonnel}
        isManager={isManager}
      />
      
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

      {/* Şirket QR Modal - Normal kullanıcılar için */}
      {!isManager && (
        <CompanyQRModal 
          open={companyQRModalOpen} 
          onClose={handleCloseCompanyQRModal} 
        />
      )}
      
      {/* Şube QR Modal - Yöneticiler için */}
      {isManager && branchId && (
        <BranchQRModal 
          open={branchQRModalOpen} 
          onClose={handleCloseBranchQRModal} 
          branchId={branchId}
          branchName={branchName}
        />
      )}

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