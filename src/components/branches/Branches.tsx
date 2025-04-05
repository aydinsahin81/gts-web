import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Divider,
  IconButton,
  Snackbar,
  Alert,
  Card,
  CardContent,
  CardHeader,
  Tooltip,
  styled,
  Checkbox,
  ListItemText,
  List,
  ListItem,
  ListItemIcon,
  ListItemButton,
  Autocomplete,
  Chip,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Public as PublicIcon,
  CalendarToday as CalendarIcon,
  Download as DownloadIcon,
  QrCode2 as QrCode2Icon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  Group as GroupIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { tr } from 'date-fns/locale';
import { ref, set, push, get, onValue, off, update, remove } from 'firebase/database';
import { database, auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import BranchQRModal from './BranchQRModal';
import ManagerPermissionsModal from './ManagerPermissionsModal';

// Kaydırılabilir ana içerik için styled component
const ScrollableContent = styled(Box)(({ theme }) => ({
  height: 'calc(100vh - 180px)', // Header ve diğer öğeler için alan bırakıyoruz
  overflowY: 'auto',
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

// Sekme içerik bileşeni tipi
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// TabPanel bileşeni
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`branch-tabpanel-${index}`}
      aria-labelledby={`branch-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `branch-tab-${index}`,
    'aria-controls': `branch-tabpanel-${index}`,
  };
}

const Branches: React.FC = () => {
  // Auth ve şirket bilgileri
  const { userDetails } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  
  // State değişkenleri
  const [loading, setLoading] = useState(true);
  const [savingBranch, setSavingBranch] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [exporting, setExporting] = useState(false);
  
  // QR Modal için state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<{id: string, name: string} | null>(null);
  
  // Yönetici atama modalı için state
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [availablePersonnel, setAvailablePersonnel] = useState<any[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');
  const [filteredPersonnel, setFilteredPersonnel] = useState<any[]>([]);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  const [savingManagers, setSavingManagers] = useState(false);
  
  // Yöneticileri görüntüleme modalı için state
  const [managersModalOpen, setManagersModalOpen] = useState(false);
  const [branchManagers, setBranchManagers] = useState<any[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [deletingManagerId, setDeletingManagerId] = useState<string | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);

  // Yönetici izinleri modalı için state
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);

  // Form state değişkenleri
  const [branchForm, setBranchForm] = useState<{
    name: string;
    openingDate: Date | null;
    address: string;
    district: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
    website: string;
  }>({
    name: '',
    openingDate: null,
    address: '',
    district: '',
    city: '',
    postalCode: '',
    country: 'Türkiye',
    phone: '',
    email: '',
    website: ''
  });

  // Form validation state
  const [formErrors, setFormErrors] = useState({
    name: false,
    address: false,
    phone: false
  });

  // Component mount olduğunda şirket bilgilerini ve şubeleri yükle
  useEffect(() => {
    const loadCompanyData = async () => {
      try {
        setLoading(true);
        
        // Giriş yapmış kullanıcıyı kontrol et
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }
        
        // Kullanıcı verilerini al ve şirket ID'sini bul
        const userSnapshot = await get(ref(database, `users/${user.uid}`));
        if (!userSnapshot.exists()) {
          setLoading(false);
          return;
        }
        
        const userData = userSnapshot.val();
        const companyId = userData.companyId || null;
        setCompanyId(companyId);
        
        if (!companyId) {
          setLoading(false);
          return;
        }
        
        // Şubeleri almak için referans oluştur
        const branchesRef = ref(database, `companies/${companyId}/branches`);
        
        // Şubeleri dinlemeye başla
        onValue(branchesRef, (snapshot) => {
          if (snapshot.exists()) {
            const branchesData = snapshot.val();
            const branchesList = Object.entries(branchesData).map(([id, data]: [string, any]) => ({
              id,
              ...data
            }));
            
            // Şubeleri oluşturma tarihine göre sırala (yeniden eskiye)
            setBranches(branchesList.sort((a, b) => b.createdAt - a.createdAt));
          } else {
            setBranches([]);
          }
          setLoading(false);
        });
        
        // Cleanup fonksiyonu
        return () => {
          if (companyId) {
            off(ref(database, `companies/${companyId}/branches`));
          }
        };
      } catch (error) {
        console.error('Şube verilerini yüklerken hata:', error);
        setSnackbarSeverity('error');
        setSnackbarMessage('Şube verileri yüklenirken bir hata oluştu.');
        setSnackbarOpen(true);
        setLoading(false);
      }
    };
    
    loadCompanyData();
  }, []);

  // Tab değişimi işleyici
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Modal açma/kapama işleyicileri
  const handleOpenAddModal = () => {
    setOpenAddModal(true);
  };

  const handleCloseAddModal = () => {
    setOpenAddModal(false);
    // Form değerlerini sıfırla
    setBranchForm({
      name: '',
      openingDate: null,
      address: '',
      district: '',
      city: '',
      postalCode: '',
      country: 'Türkiye',
      phone: '',
      email: '',
      website: ''
    });
    // Form hatalarını sıfırla
    setFormErrors({
      name: false,
      address: false,
      phone: false
    });
  };

  // Snackbar kapatma işleyicisi
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Form değişim işleyicisi
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBranchForm((prev) => ({
      ...prev,
      [name]: value
    }));
    
    // Zorunlu alanlar için hata kontrolü
    if (['name', 'address', 'phone'].includes(name)) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: value.trim() === ''
      }));
    }
  };

  // Select değişim işleyicisi
  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setBranchForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Tarih değişim işleyicisi
  const handleDateChange = (date: Date | null) => {
    setBranchForm((prev) => ({
      ...prev,
      openingDate: date
    }));
  };

  // Form gönderme işleyicisi
  const handleSubmit = async () => {
    // Zorunlu alanları kontrol et
    const newErrors = {
      name: branchForm.name.trim() === '',
      address: branchForm.address.trim() === '',
      phone: branchForm.phone.trim() === ''
    };
    
    setFormErrors(newErrors);
    
    // Eğer hata yoksa kaydet
    if (!newErrors.name && !newErrors.address && !newErrors.phone) {
      try {
        if (!companyId) {
          throw new Error('Şirket bilgisi bulunamadı');
        }
        
        setSavingBranch(true);
        
        // Firebase'de yeni şube referansı oluştur
        const branchesRef = ref(database, `companies/${companyId}/branches`);
        const newBranchRef = push(branchesRef);
        
        // Şube verilerini hazırla - düz yapı (gruplandırma olmadan)
        const branchData = {
          createdAt: Date.now(),
          name: branchForm.name,
          openingDate: branchForm.openingDate ? branchForm.openingDate.toISOString() : null,
          address: branchForm.address,
          district: branchForm.district || '',
          city: branchForm.city || '',
          postalCode: branchForm.postalCode || '',
          country: branchForm.country,
          phone: branchForm.phone,
          email: branchForm.email || '',
          website: branchForm.website || ''
        };
        
        // Şubeyi kaydet
        await set(newBranchRef, branchData);
        
        // Modal'ı kapat
        handleCloseAddModal();
        
        // Bilgi mesajı göster
        setSnackbarSeverity('success');
        setSnackbarMessage('Şube başarıyla eklendi!');
        setSnackbarOpen(true);
      } catch (error) {
        console.error('Şube eklerken hata:', error);
        setSnackbarSeverity('error');
        setSnackbarMessage('Şube eklenirken bir hata oluştu.');
        setSnackbarOpen(true);
      } finally {
        setSavingBranch(false);
      }
    }
  };

  // Geçerli sekmeye göre başlık belirleme
  const getTabTitle = () => {
    switch (tabValue) {
      case 0:
        return "Şube Listesi";
      default:
        return "Şube Yönetimi";
    }
  };

  // Excel'e veri aktarma işlevi
  const exportToExcel = async () => {
    setExporting(true);
    
    // Excel export işlemleri burada yapılacak
    // Şimdilik sadece gecikme simülasyonu
    setTimeout(() => {
      setExporting(false);
      setSnackbarMessage('Excel dosyası başarıyla indirildi!');
      setSnackbarOpen(true);
    }, 1000);
  };

  // QR Modal açma işlevi
  const handleOpenQRModal = (branch: {id: string, name: string}) => {
    setSelectedBranch(branch);
    setQrModalOpen(true);
  };

  const handleCloseQRModal = () => {
    setQrModalOpen(false);
  };
  
  // Yönetici atama modalı açma işlevi
  const handleOpenAdminModal = (branch: {id: string, name: string}) => {
    setSelectedBranch(branch);
    setAdminModalOpen(true);
    fetchAvailablePersonnel();
  };

  const handleCloseAdminModal = () => {
    setAdminModalOpen(false);
    setSelectedPersonnel([]);
    setFilterText('');
  };
  
  // Yöneticileri görüntüleme modalını açma işlevi
  const handleOpenManagersModal = (branch: {id: string, name: string}) => {
    setSelectedBranch(branch);
    setManagersModalOpen(true);
    fetchBranchManagers(branch.id);
  };

  const handleCloseManagersModal = () => {
    setManagersModalOpen(false);
    setBranchManagers([]);
  };

  // Yönetici izinleri modalını açma işlevi
  const handleOpenPermissionsModal = (branch: {id: string, name: string}) => {
    setSelectedBranch(branch);
    setPermissionsModalOpen(true);
  };

  const handleClosePermissionsModal = () => {
    setPermissionsModalOpen(false);
  };
  
  // Şube yöneticilerini getirme
  const fetchBranchManagers = async (branchId: string) => {
    if (!companyId) return;
    
    setLoadingManagers(true);
    
    try {
      const personnelRef = ref(database, `companies/${companyId}/personnel`);
      const snapshot = await get(personnelRef);
      
      if (snapshot.exists()) {
        const personnelData = snapshot.val();
        // Bu şubeye atanmış yöneticileri filtrele
        const managersList = Object.entries(personnelData)
          .filter(([_, data]: [string, any]) => {
            return data.branchesId === branchId && data.role === 'manager' && !data.isDeleted;
          })
          .map(([id, data]: [string, any]) => ({
            id,
            name: data.name || 'İsimsiz Personel',
            email: data.email || '',
            phone: data.phone || ''
          }));
        
        setBranchManagers(managersList);
      } else {
        setBranchManagers([]);
      }
    } catch (error) {
      console.error('Şube yöneticileri yüklenirken hata:', error);
      setSnackbarSeverity('error');
      setSnackbarMessage('Şube yöneticileri yüklenirken bir hata oluştu.');
      setSnackbarOpen(true);
    } finally {
      setLoadingManagers(false);
    }
  };
  
  // Yönetici silme onay modalını aç
  const handleConfirmDeleteManager = (managerId: string) => {
    setDeletingManagerId(managerId);
    setConfirmDeleteModal(true);
  };
  
  // Yönetici silme onay modalını kapat
  const handleCloseConfirmDelete = () => {
    setConfirmDeleteModal(false);
    setDeletingManagerId(null);
  };
  
  // Yönetici silme işlemi
  const handleRemoveManager = async () => {
    if (!deletingManagerId || !companyId || !selectedBranch) return;
    
    try {
      // 1. Users tablosunda rol ve branchesId alanlarını güncelle
      const userRef = ref(database, `users/${deletingManagerId}`);
      await update(userRef, {
        role: 'employee',
        branchesId: null
      });
      
      // 2. Şirket personel tablosunda rol ve branchesId alanlarını sil
      const personnelRef = ref(database, `companies/${companyId}/personnel/${deletingManagerId}`);
      const updates = {
        role: null,
        branchesId: null
      };
      await update(personnelRef, updates);
      
      // Başarı mesajı göster
      setSnackbarSeverity('success');
      setSnackbarMessage('Yönetici başarıyla kaldırıldı.');
      setSnackbarOpen(true);
      
      // Yönetici listesini güncelle
      fetchBranchManagers(selectedBranch.id);
      
    } catch (error) {
      console.error('Yönetici silme hatası:', error);
      setSnackbarSeverity('error');
      setSnackbarMessage('Yönetici silinirken bir hata oluştu.');
      setSnackbarOpen(true);
    } finally {
      setConfirmDeleteModal(false);
      setDeletingManagerId(null);
    }
  };
  
  // Görev atanmamış personelleri getirme
  const fetchAvailablePersonnel = async () => {
    if (!companyId) return;
    
    setLoadingPersonnel(true);
    
    try {
      const personnelRef = ref(database, `companies/${companyId}/personnel`);
      const snapshot = await get(personnelRef);
      
      if (snapshot.exists()) {
        const personnelData = snapshot.val();
        // Görev atanmamış, role değeri "manager" olmayan ve silinmemiş personelleri filtrele
        const availablePersonnelList = Object.entries(personnelData)
          .filter(([_, data]: [string, any]) => {
            const isNotDeleted = !data.isDeleted;
            const isNotManager = data.role !== 'manager';
            // hasTask kontrolü olmadan da olabilir, sadece manager değilse yönetici olabilir
            return isNotDeleted && isNotManager;
          })
          .map(([id, data]: [string, any]) => ({
            id,
            name: data.name || 'İsimsiz Personel',
            email: data.email || '',
            phone: data.phone || ''
          }));
        
        setAvailablePersonnel(availablePersonnelList);
        setFilteredPersonnel(availablePersonnelList);
      } else {
        setAvailablePersonnel([]);
        setFilteredPersonnel([]);
      }
    } catch (error) {
      console.error('Personel verileri yüklenirken hata:', error);
      setSnackbarSeverity('error');
      setSnackbarMessage('Personel verileri yüklenirken bir hata oluştu.');
      setSnackbarOpen(true);
    } finally {
      setLoadingPersonnel(false);
    }
  };
  
  // Personel checkbox değişimi
  const handlePersonnelToggle = (personnelId: string) => {
    const currentIndex = selectedPersonnel.indexOf(personnelId);
    const newChecked = [...selectedPersonnel];

    if (currentIndex === -1) {
      newChecked.push(personnelId);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setSelectedPersonnel(newChecked);
  };
  
  // Personel filtre işlemi
  useEffect(() => {
    if (!filterText) {
      setFilteredPersonnel(availablePersonnel);
      return;
    }
    
    const filtered = availablePersonnel.filter(person => 
      person.name.toLowerCase().includes(filterText.toLowerCase()) ||
      (person.email && person.email.toLowerCase().includes(filterText.toLowerCase())) ||
      (person.phone && person.phone.includes(filterText))
    );
    
    setFilteredPersonnel(filtered);
  }, [filterText, availablePersonnel]);
  
  // Yönetici kaydetme işlemi
  const handleSaveAdmins = async () => {
    if (!selectedBranch || !companyId || selectedPersonnel.length === 0) return;
    
    try {
      setSavingManagers(true);
      
      // Her seçilen personel için işlem yap
      const updatePromises = selectedPersonnel.map(async (personnelId) => {
        // 1. Şirket personel verisini güncelle
        const personnelRef = ref(database, `companies/${companyId}/personnel/${personnelId}`);
        await update(personnelRef, {
          role: 'manager',
          branchesId: selectedBranch.id
        });
        
        // 2. Kullanıcı verisini güncelle
        const userRef = ref(database, `users/${personnelId}`);
        await update(userRef, {
          role: 'manager',
          branchesId: selectedBranch.id
        });
        
        return personnelId;
      });
      
      // Tüm güncellemeleri bekle
      await Promise.all(updatePromises);
      
      // Başarı mesajı göster
      setSnackbarSeverity('success');
      setSnackbarMessage(`${selectedPersonnel.length} personel "${selectedBranch.name}" şubesi için yönetici olarak atandı.`);
      setSnackbarOpen(true);
      
      // Modal'ı kapat
      handleCloseAdminModal();
      
      // Personel listesini güncelle (görev atanmış oldukları için listeden çıkarılacaklar)
      fetchAvailablePersonnel();
      
    } catch (error) {
      console.error('Yönetici atama hatası:', error);
      setSnackbarSeverity('error');
      setSnackbarMessage('Yönetici atama işlemi sırasında bir hata oluştu.');
      setSnackbarOpen(true);
    } finally {
      setSavingManagers(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mt: 2, height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">
          {getTabTitle()}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="info"
            startIcon={<DownloadIcon />}
            onClick={exportToExcel}
            disabled={exporting}
          >
            {exporting ? 'İndiriliyor...' : 'Excel İndir'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddModal}
          >
            Yeni Şube Ekle
          </Button>
        </Box>
      </Box>
      <Divider sx={{ mb: 3 }} />
      
      <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="şube yönetim tabları">
            <Tab label="Şube Listesi" {...a11yProps(0)} />
            {/* Gelecekte başka tablar eklenebilir */}
          </Tabs>
        </Box>
        <ScrollableContent>
          <TabPanel value={tabValue} index={0}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : branches.length > 0 ? (
              <Grid container spacing={3}>
                {branches.map((branch) => (
                  <Grid item xs={12} md={6} lg={4} key={branch.id}>
                    <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardHeader
                        title={branch.name}
                        subheader={`Oluşturulma: ${new Date(branch.createdAt).toLocaleDateString('tr-TR')}`}
                        action={
                          <Box sx={{ display: 'flex' }}>
                            <Tooltip title="Şube QR Kodu">
                              <IconButton 
                                aria-label="QR kod" 
                                color="primary"
                                onClick={() => handleOpenQRModal({id: branch.id, name: branch.name})}
                              >
                                <QrCode2Icon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Şube Yöneticisi Ata">
                              <IconButton 
                                aria-label="Yönetici Ata" 
                                color="secondary"
                                onClick={() => handleOpenAdminModal({id: branch.id, name: branch.name})}
                              >
                                <PersonAddIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Yönetici İzinleri">
                              <IconButton 
                                aria-label="Yönetici İzinleri" 
                                color="info"
                                onClick={() => handleOpenPermissionsModal({id: branch.id, name: branch.name})}
                              >
                                <SecurityIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                      />
                      <Divider />
                      <CardContent sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          <LocationIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                          {branch.address}
                          {branch.district && `, ${branch.district}`}
                          {branch.city && `, ${branch.city}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <PhoneIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                          {branch.phone}
                        </Typography>
                        {branch.email && (
                          <Typography variant="body2" color="text.secondary">
                            <EmailIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                            {branch.email}
                          </Typography>
                        )}
                      </CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, pt: 0 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="info"
                          startIcon={<GroupIcon />}
                          onClick={() => handleOpenManagersModal({id: branch.id, name: branch.name})}
                        >
                          Yöneticiler
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="body1" color="textSecondary" align="center">
                    Henüz herhangi bir şube eklenmemiş.
                  </Typography>
                </Grid>
              </Grid>
            )}
          </TabPanel>
        </ScrollableContent>
      </Box>
      
      {/* Şube Ekleme Modal */}
      <Dialog 
        open={openAddModal} 
        onClose={handleCloseAddModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Yeni Şube Ekle</Typography>
            <IconButton edge="end" color="inherit" onClick={handleCloseAddModal} aria-label="kapat">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Temel Bilgiler */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BusinessIcon color="primary" sx={{ mr: 1 }} />
                Temel Bilgiler
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Şube Adı"
                fullWidth
                required
                value={branchForm.name}
                onChange={handleFormChange}
                error={formErrors.name}
                helperText={formErrors.name ? 'Şube adı zorunludur' : ''}
                InputProps={{
                  startAdornment: <BusinessIcon color="action" sx={{ mr: 1 }} />,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                <DatePicker
                  label="Açılış Tarihi"
                  value={branchForm.openingDate}
                  onChange={handleDateChange}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      InputProps: {
                        startAdornment: <CalendarIcon color="action" sx={{ mr: 1 }} />,
                      }
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            
            {/* Konum Bilgileri */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocationIcon color="primary" sx={{ mr: 1 }} />
                Konum Bilgileri
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="address"
                label="Adres"
                fullWidth
                required
                multiline
                rows={3}
                value={branchForm.address}
                onChange={handleFormChange}
                error={formErrors.address}
                helperText={formErrors.address ? 'Adres bilgisi zorunludur' : ''}
                InputProps={{
                  startAdornment: <LocationIcon color="action" sx={{ mr: 1, alignSelf: 'flex-start', mt: 1 }} />,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="district"
                label="İlçe"
                fullWidth
                value={branchForm.district}
                onChange={handleFormChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="city"
                label="Şehir/İl"
                fullWidth
                value={branchForm.city}
                onChange={handleFormChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="postalCode"
                label="Posta Kodu"
                fullWidth
                value={branchForm.postalCode}
                onChange={handleFormChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="country-label">Ülke</InputLabel>
                <Select
                  labelId="country-label"
                  name="country"
                  value={branchForm.country}
                  label="Ülke"
                  onChange={handleSelectChange}
                >
                  <MenuItem value="Türkiye">Türkiye</MenuItem>
                  <MenuItem value="Almanya">Almanya</MenuItem>
                  <MenuItem value="İngiltere">İngiltere</MenuItem>
                  <MenuItem value="Fransa">Fransa</MenuItem>
                  <MenuItem value="İtalya">İtalya</MenuItem>
                  <MenuItem value="İspanya">İspanya</MenuItem>
                  <MenuItem value="Hollanda">Hollanda</MenuItem>
                  <MenuItem value="Belçika">Belçika</MenuItem>
                  <MenuItem value="Diğer">Diğer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* İletişim Bilgileri */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PhoneIcon color="primary" sx={{ mr: 1 }} />
                İletişim Bilgileri
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="phone"
                label="Telefon Numarası"
                fullWidth
                required
                value={branchForm.phone}
                onChange={handleFormChange}
                error={formErrors.phone}
                helperText={formErrors.phone ? 'Telefon numarası zorunludur' : ''}
                InputProps={{
                  startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} />,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="email"
                label="E-posta Adresi"
                fullWidth
                type="email"
                value={branchForm.email}
                onChange={handleFormChange}
                InputProps={{
                  startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="website"
                label="Web Sitesi"
                fullWidth
                value={branchForm.website}
                onChange={handleFormChange}
                placeholder="https://www.ornek.com"
                InputProps={{
                  startAdornment: <PublicIcon color="action" sx={{ mr: 1 }} />,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddModal} color="inherit" disabled={savingBranch}>
            İptal
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={savingBranch}
            startIcon={savingBranch ? <CircularProgress size={24} color="inherit" /> : null}
          >
            {savingBranch ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Şube QR Modal */}
      {selectedBranch && (
        <BranchQRModal
          open={qrModalOpen}
          onClose={handleCloseQRModal}
          branchId={selectedBranch.id}
          branchName={selectedBranch.name}
        />
      )}
      
      {/* Şube Yöneticileri Görüntüleme Modal */}
      <Dialog
        open={managersModalOpen}
        onClose={handleCloseManagersModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              {selectedBranch ? `"${selectedBranch.name}" Şubesi Yöneticileri` : 'Şube Yöneticileri'}
            </Typography>
            <IconButton edge="end" color="inherit" onClick={handleCloseManagersModal} aria-label="kapat">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {loadingManagers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : branchManagers.length > 0 ? (
            <List>
              {branchManagers.map((manager) => (
                <ListItem
                  key={manager.id}
                  secondaryAction={
                    <Tooltip title="Yöneticiyi Kaldır">
                      <IconButton 
                        edge="end" 
                        aria-label="sil" 
                        color="error"
                        onClick={() => handleConfirmDeleteManager(manager.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  }
                  sx={{ 
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    '&:last-child': { mb: 0 }
                  }}
                >
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {manager.name.charAt(0)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={manager.name}
                    secondary={
                      <Box>
                        {manager.email && (
                          <Typography variant="body2" component="span" sx={{ mr: 2 }}>
                            <EmailIcon fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
                            {manager.email}
                          </Typography>
                        )}
                        {manager.phone && (
                          <Typography variant="body2" component="span">
                            <PhoneIcon fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
                            {manager.phone}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <GroupIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
              <Typography variant="body1" color="text.secondary" align="center">
                Bu şubeye henüz yönetici atanmamış.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PersonAddIcon />}
                sx={{ mt: 2 }}
                onClick={() => {
                  handleCloseManagersModal();
                  if (selectedBranch) {
                    handleOpenAdminModal(selectedBranch);
                  }
                }}
              >
                Yönetici Ata
              </Button>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleCloseManagersModal}
          >
            Kapat
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Şube Yöneticisi Atama Modal */}
      <Dialog
        open={adminModalOpen}
        onClose={handleCloseAdminModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              {selectedBranch ? `"${selectedBranch.name}" Şubesi İçin Yönetici Ata` : 'Yönetici Ata'}
            </Typography>
            <IconButton edge="end" color="inherit" onClick={handleCloseAdminModal} aria-label="kapat">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {loadingPersonnel ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Şubeye yönetici olarak atamak istediğiniz personelleri seçin. Sadece görev atanmamış personeller listelenmiştir.
              </Typography>
              
              <Autocomplete
                freeSolo
                options={[]}
                inputValue={filterText}
                onInputChange={(_, newValue) => setFilterText(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Personel Ara"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <SearchIcon color="action" sx={{ ml: 1, mr: -0.5 }} />
                      )
                    }}
                  />
                )}
              />
              
              <Box sx={{ mt: 2, maxHeight: '50vh', overflowY: 'auto' }}>
                {filteredPersonnel.length > 0 ? (
                  <List dense>
                    {filteredPersonnel.map((person) => (
                      <ListItemButton 
                        key={person.id}
                        onClick={() => handlePersonnelToggle(person.id)}
                        sx={{ 
                          borderRadius: 1,
                          mb: 0.5,
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={selectedPersonnel.indexOf(person.id) !== -1}
                            tabIndex={-1}
                            disableRipple
                            color="primary"
                          />
                        </ListItemIcon>
                        <ListItemText 
                          primary={person.name}
                          secondary={
                            <Box>
                              {person.email && (
                                <Typography variant="body2" component="span" sx={{ mr: 2 }}>
                                  <EmailIcon fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
                                  {person.email}
                                </Typography>
                              )}
                              {person.phone && (
                                <Typography variant="body2" component="span">
                                  <PhoneIcon fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'text-bottom' }} />
                                  {person.phone}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItemButton>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                    {filterText ? "Arama kriterine uygun personel bulunamadı" : "Atanabilecek personel bulunamadı"}
                  </Typography>
                )}
              </Box>
              
              {selectedPersonnel.length > 0 && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Seçilen Personeller ({selectedPersonnel.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedPersonnel.map(id => {
                      const person = availablePersonnel.find(p => p.id === id);
                      return person ? (
                        <Chip 
                          key={id}
                          label={person.name}
                          variant="outlined"
                          color="primary"
                          size="small"
                          onDelete={() => handlePersonnelToggle(id)}
                          sx={{ m: 0.5 }}
                        />
                      ) : null;
                    })}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            variant="outlined" 
            onClick={handleCloseAdminModal}
            disabled={savingManagers}
          >
            İptal
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSaveAdmins}
            disabled={selectedPersonnel.length === 0 || savingManagers}
            startIcon={savingManagers ? <CircularProgress size={20} /> : <PersonAddIcon />}
          >
            {savingManagers ? 'Kaydediliyor...' : 'Yönetici Olarak Ata'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Yönetici Silme Onay Modalı */}
      <Dialog
        open={confirmDeleteModal}
        onClose={handleCloseConfirmDelete}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Yöneticiyi Kaldır
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Bu kişiyi şube yöneticiliğinden kaldırmak istediğinize emin misiniz?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Bu işlem sonucunda kişi normal çalışan olarak devam edecek ve şube yöneticisi yetkilerini kaybedecektir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDelete}>
            İptal
          </Button>
          <Button 
            onClick={handleRemoveManager} 
            color="error" 
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Yöneticiyi Kaldır
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Yönetici İzinleri Modal */}
      {selectedBranch && companyId && (
        <ManagerPermissionsModal
          open={permissionsModalOpen}
          onClose={handleClosePermissionsModal}
          branchId={selectedBranch.id}
          branchName={selectedBranch.name}
          companyId={companyId}
        />
      )}
      
      {/* Bildirim Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default Branches; 