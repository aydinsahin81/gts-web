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
  styled
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
  Download as DownloadIcon
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { tr } from 'date-fns/locale';
import { ref, set, push, get, onValue, off } from 'firebase/database';
import { database, auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

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
              ...data,
              basicInfo: data.basicInfo || {},
              locationInfo: data.locationInfo || {},
              contactInfo: data.contactInfo || {}
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
        
        // Şube verilerini hazırla
        const branchData = {
          createdAt: Date.now(),
          basicInfo: {
            name: branchForm.name,
            openingDate: branchForm.openingDate ? branchForm.openingDate.toISOString() : null,
          },
          locationInfo: {
            address: branchForm.address,
            district: branchForm.district || '',
            city: branchForm.city || '',
            postalCode: branchForm.postalCode || '',
            country: branchForm.country,
          },
          contactInfo: {
            phone: branchForm.phone,
            email: branchForm.email || '',
            website: branchForm.website || '',
          }
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
                    <Card elevation={2} sx={{ height: '100%' }}>
                      <CardHeader
                        title={branch.basicInfo.name}
                        subheader={`Oluşturulma: ${new Date(branch.createdAt).toLocaleDateString('tr-TR')}`}
                        action={
                          <IconButton aria-label="düzenle">
                            <BusinessIcon />
                          </IconButton>
                        }
                      />
                      <Divider />
                      <CardContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          <LocationIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                          {branch.locationInfo.address}
                          {branch.locationInfo.district && `, ${branch.locationInfo.district}`}
                          {branch.locationInfo.city && `, ${branch.locationInfo.city}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <PhoneIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                          {branch.contactInfo.phone}
                        </Typography>
                        {branch.contactInfo.email && (
                          <Typography variant="body2" color="text.secondary">
                            <EmailIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                            {branch.contactInfo.email}
                          </Typography>
                        )}
                      </CardContent>
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