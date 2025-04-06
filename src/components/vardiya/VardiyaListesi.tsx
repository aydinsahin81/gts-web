import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Grid, 
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
  Divider,
  Snackbar,
  Alert,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Chip,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import { ref, push, set, serverTimestamp, get, update, remove } from 'firebase/database';
import { database } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

// Personel tipi
interface Personnel {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface VardiyaListesiProps {
  branchId?: string;
  isManager?: boolean;
}

const VardiyaListesi: React.FC<VardiyaListesiProps> = ({ branchId, isManager = false }) => {
  const { currentUser, userDetails } = useAuth();
  const [open, setOpen] = useState(false);
  const [vardiyaAdi, setVardiyaAdi] = useState('');
  const [girisZamani, setGirisZamani] = useState('');
  const [gecKalmaToleransi, setGecKalmaToleransi] = useState(10);
  const [cikisZamani, setCikisZamani] = useState('');
  const [erkenCikmaToleransi, setErkenCikmaToleransi] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vardiyalar, setVardiyalar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  // Personel seçme modal state'leri
  const [personnelModalOpen, setPersonnelModalOpen] = useState(false);
  const [selectedVardiyaId, setSelectedVardiyaId] = useState<string | null>(null);
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  const [filteredPersonnel, setFilteredPersonnel] = useState<Personnel[]>([]);

  // Vardiya silme için state'ler
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteVardiyaId, setDeleteVardiyaId] = useState<string | null>(null);
  const [deleteVardiyaName, setDeleteVardiyaName] = useState('');
  const [deleteErrorOpen, setDeleteErrorOpen] = useState(false);

  // Şube seçimi için state
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Vardiyaları veritabanından getir
  useEffect(() => {
    const fetchVardiyalar = async () => {
      if (!userDetails?.companyId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Önce şubeleri yükle
        await fetchBranches();
        
        const vardiyaRef = ref(database, `companies/${userDetails.companyId}/shifts`);
        const snapshot = await get(vardiyaRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          let vardiyalar = Object.keys(data).map(id => ({
            id,
            name: data[id].name || 'İsimsiz Vardiya',
            startTime: data[id].startTime || '',
            endTime: data[id].endTime || '',
            lateTolerance: data[id].lateTolerance || 0,
            earlyExitTolerance: data[id].earlyExitTolerance || 0,
            personnel: data[id].personnel || {},
            branchesId: data[id].branchesId || data[id].branchId || null
          }));
          
          // Şube yöneticisi için sadece kendi şubesine ait vardiyaları listele
          if (isManager && branchId) {
            console.log(`Sadece şube ID'si ${branchId} olan vardiyalar filtreleniyor`);
            vardiyalar = vardiyalar.filter(vardiya => {
              // Sadece eşleşen şubeye sahip vardiyaları getir
              return vardiya.branchesId === branchId;
            });
            
            console.log(`Filtrelenen vardiya sayısı: ${vardiyalar.length}`);
          }

          setVardiyalar(vardiyalar);
        } else {
          setVardiyalar([]);
        }
      } catch (error) {
        console.error('Vardiyalar yüklenirken hata:', error);
        setOpenSnackbar(true);
        setSnackbarMessage('Vardiyalar yüklenirken bir hata oluştu');
        setSnackbarSeverity('error');
      } finally {
        setLoading(false);
      }
    };

    fetchVardiyalar();
  }, [userDetails, isManager, branchId]);

  // Personel listesini getir
  const fetchPersonnel = async () => {
    if (!userDetails?.companyId) return;
    
    setLoadingPersonnel(true);
    try {
      const personnelRef = ref(database, `companies/${userDetails.companyId}/personnel`);
      const snapshot = await get(personnelRef);
      
      // Tüm vardiyaları al ve atanmış personelleri bul
      const shiftsRef = ref(database, `companies/${userDetails.companyId}/shifts`);
      const shiftsSnapshot = await get(shiftsRef);
      
      // Tüm atanmış personelleri topla (mevcut vardiya hariç)
      const assignedPersonnel = new Set<string>();
      
      if (shiftsSnapshot.exists()) {
        const shiftsData = shiftsSnapshot.val();
        
        Object.entries(shiftsData).forEach(([shiftId, shiftData]: [string, any]) => {
          // Mevcut seçili vardiyayı hariç tut (düzenleme durumunda)
          if (shiftId !== selectedVardiyaId && shiftData.personnel) {
            // Bu vardiyada atanmış tüm personelleri set'e ekle
            Object.keys(shiftData.personnel).forEach(personId => {
              assignedPersonnel.add(personId);
            });
          }
        });
      }
      
      console.log('Zaten atanmış personel sayısı:', assignedPersonnel.size);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Personnel veritabanından tüm personelleri al
        let personnelList = Object.entries(data)
          .filter(([id, personData]: [string, any]) => {
            // Silinen personelleri filtrele
            if (personData.isDeleted) return false;
            
            // Başka vardiyalara atanmış personelleri filtrele
            return !assignedPersonnel.has(id);
          })
          .map(([id, personData]: [string, any]) => ({
            id,
            name: personData.name || 'İsimsiz Personel',
            email: personData.email || '',
            phone: personData.phone || '',
            branchesId: personData.branchesId || null
          }));
          
        // Şube yöneticisi için sadece kendi şubesine bağlı personelleri listeleme
        if (isManager && branchId) {
          console.log(`Manager modu: Sadece şube ID'si ${branchId} olan personeller getiriliyor`);
          
          // Önce personel veritabanında branchesId'si olanları filtrele
          const filteredPersonnel = [];
          
          // Her personel için şube bilgisini kontrol et
          for (const person of personnelList) {
            // Personnel veritabanında branchesId varsa direkt olarak kontrol et
            if (person.branchesId === branchId) {
              filteredPersonnel.push(person);
              continue;
            }
            
            // Eğer personnel veritabanında branchesId yoksa, users veritabanında kontrol et
            const userRef = ref(database, `users/${person.id}`);
            const userSnapshot = await get(userRef);
            
            if (userSnapshot.exists()) {
              const userData = userSnapshot.val();
              if (userData.branchesId === branchId) {
                // Users'daki branchesId'yi person nesnesine ekle
                person.branchesId = userData.branchesId;
                filteredPersonnel.push(person);
              }
            }
          }
          
          console.log(`Şube için filtrelenen personel sayısı: ${filteredPersonnel.length}`);
          personnelList = filteredPersonnel;
        }
        
        setPersonnelList(personnelList);
        setFilteredPersonnel(personnelList);
      } else {
        setPersonnelList([]);
        setFilteredPersonnel([]);
      }
    } catch (error) {
      console.error("Personel listesi yüklenirken hata:", error);
    } finally {
      setLoadingPersonnel(false);
    }
  };

  // Personel modalı açıldığında personel listesini getir
  useEffect(() => {
    if (personnelModalOpen) {
      fetchPersonnel();
    }
  }, [personnelModalOpen]);

  // Personel arama filtrelemesi
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPersonnel(personnelList);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = personnelList.filter(person => 
      person.name.toLowerCase().includes(term) || 
      (person.email && person.email.toLowerCase().includes(term)) ||
      (person.phone && person.phone.includes(term))
    );
    
    setFilteredPersonnel(filtered);
  }, [searchTerm, personnelList]);

  // Personel seçme modalını açma işlevi
  const handleOpenPersonnelModal = (vardiyaId: string) => {
    setSelectedVardiyaId(vardiyaId);
    
    // Varsa mevcut seçili personelleri belirle
    const vardiya = vardiyalar.find(v => v.id === vardiyaId);
    if (vardiya && vardiya.personnel) {
      console.log("Personnel verisi:", vardiya.personnel);
      
      // Personnel bir dizi veya obje olabilir, kontrol et
      if (Array.isArray(vardiya.personnel)) {
        setSelectedPersonnel(vardiya.personnel);
      } else if (typeof vardiya.personnel === 'object') {
        // Obje formatındaysa (key: true) anahtarları al
        setSelectedPersonnel(Object.keys(vardiya.personnel));
      } else {
        setSelectedPersonnel([]);
      }
    } else {
      setSelectedPersonnel([]);
    }
    
    setPersonnelModalOpen(true);
  };

  // Personel seçme modalını kapatma işlevi
  const handleClosePersonnelModal = () => {
    setPersonnelModalOpen(false);
    setSelectedVardiyaId(null);
    setSelectedPersonnel([]);
    setSearchTerm('');
  };

  // Tüm personeli seçme/kaldırma işlevi
  const handleToggleAll = () => {
    if (selectedPersonnel.length === filteredPersonnel.length) {
      setSelectedPersonnel([]);
    } else {
      setSelectedPersonnel(filteredPersonnel.map(p => p.id));
    }
  };

  // Tek personel seçme/kaldırma işlevi
  const handleTogglePersonnel = (id: string) => {
    const selectedIndex = selectedPersonnel.indexOf(id);
    let newSelected = [...selectedPersonnel];
    
    if (selectedIndex === -1) {
      newSelected.push(id);
    } else {
      newSelected.splice(selectedIndex, 1);
    }
    
    setSelectedPersonnel(newSelected);
  };

  // Personel kaydetme işlevi
  const handleSavePersonnel = async () => {
    if (!selectedVardiyaId || !userDetails?.companyId) return;
    
    setIsSubmitting(true);
    try {
      // Vardiya personel bölümünü güncelle
      const personnelRef = ref(database, `companies/${userDetails.companyId}/shifts/${selectedVardiyaId}/personnel`);
      
      // Personel listesini hazırla (nesne olarak)
      const personnelData: Record<string, boolean> = {};
      selectedPersonnel.forEach(id => {
        personnelData[id] = true;
      });
      
      // Veritabanına kaydet
      await set(personnelRef, personnelData);
      
      // Başarı mesajı
      setSnackbarMessage('Personel atama başarıyla kaydedildi');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      
      // Vardiyalar listesini güncelle
      setVardiyalar(prevVardiyalar => 
        prevVardiyalar.map(vardiya => 
          vardiya.id === selectedVardiyaId
            ? { ...vardiya, personnel: selectedPersonnel }
            : vardiya
        )
      );
      
      // Modalı kapat
      handleClosePersonnelModal();
    } catch (error) {
      console.error('Personel kaydedilirken hata:', error);
      setSnackbarMessage('Personel kaydedilirken bir hata oluştu');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Şubeleri veritabanından getir
  const fetchBranches = async () => {
    if (!userDetails?.companyId) return;
    
    setLoadingBranches(true);
    try {
      const branchesRef = ref(database, `companies/${userDetails.companyId}/branches`);
      const snapshot = await get(branchesRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const branchesArray = Object.keys(data).map(id => {
          // Şube yapısına göre adını kontrol et
          const branchData = data[id];
          let branchName = 'İsimsiz Şube';
          
          if (branchData.name) {
            branchName = branchData.name;
          } else if (branchData.basicInfo && branchData.basicInfo.name) {
            branchName = branchData.basicInfo.name;
          }
          
          return {
            id,
            name: branchName
          };
        });
        
        setBranches(branchesArray);
      } else {
        setBranches([]);
      }
    } catch (error) {
      console.error('Şubeler yüklenirken hata:', error);
    } finally {
      setLoadingBranches(false);
    }
  };

  // Modal açıldığında şubeleri getir
  useEffect(() => {
    if (open && !isManager) {
      fetchBranches();
    }
  }, [open, isManager, userDetails]);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    // Formu sıfırla
    setVardiyaAdi('');
    setGirisZamani('');
    setGecKalmaToleransi(10);
    setCikisZamani('');
    setErkenCikmaToleransi(10);
    setSelectedBranch(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!vardiyaAdi) {
      setError('Vardiya adı gereklidir');
      return;
    }
    if (!girisZamani) {
      setError('Giriş zamanı gereklidir');
      return;
    }
    if (!cikisZamani) {
      setError('Çıkış zamanı gereklidir');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      // Şirket ID'sini userDetails'dan al
      const companyId = userDetails?.companyId;
      
      if (!companyId) {
        throw new Error('Şirket bilgisi bulunamadı');
      }
      
      // Yeni vardiya referansı oluştur
      const shiftsRef = ref(database, `companies/${companyId}/shifts`);
      const newShiftRef = push(shiftsRef);
      const shiftId = newShiftRef.key;
      
      // Vardiya verilerini hazırla
      const shiftData: any = {
        createdAt: serverTimestamp(),
        name: vardiyaAdi,
        startTime: girisZamani,
        lateTolerance: gecKalmaToleransi,
        endTime: cikisZamani,
        earlyExitTolerance: erkenCikmaToleransi
      };
      
      // Eğer şube seçildiyse, şube ID'sini ekle
      if (selectedBranch) {
        shiftData.branchesId = selectedBranch.id;
      }
      
      // Veritabanına kaydet
      await set(newShiftRef, shiftData);
      
      console.log('Vardiya başarıyla eklendi:', shiftId);
      
      // Listeye yeni vardiyayı ekle (veritabanından tekrar çekmek yerine)
      setVardiyalar(prevVardiyalar => [
        ...prevVardiyalar,
        {
          id: shiftId,
          ...shiftData,
          // serverTimestamp yerine şimdiki zamanı kullan
          createdAt: Date.now(),
          personnel: [],
          branchesId: selectedBranch ? selectedBranch.id : null
        }
      ]);
      
      // Başarı mesajı göster
      setSnackbarMessage('Vardiya başarıyla eklendi');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      
      // Başarılı olursa modalı kapat
      handleClose();
    } catch (error) {
      console.error('Vardiya eklenirken hata oluştu:', error);
      setError('Vardiya eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      
      // Hata mesajı göster
      setSnackbarMessage('Vardiya eklenirken bir hata oluştu');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Snackbar kapatma
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // Vardiya kartında personel sayısını görüntüleme
  const renderPersonnelCount = (vardiya: any) => {
    const count = vardiya.personnel ? vardiya.personnel.length : 0;
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        <strong>Personel:</strong> {count} kişi
      </Typography>
    );
  };

  // Vardiya kartında şube bilgisini görüntüleme
  const renderBranchInfo = (vardiya: any) => {
    if (!vardiya.branchesId) {
      return null;
    }

    // Şube adını bul
    const branch = branches.find(branch => branch.id === vardiya.branchesId);
    const branchName = branch ? branch.name : 'Bilinmeyen Şube';

    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        <strong>Şube:</strong> {branchName}
      </Typography>
    );
  };

  // Vardiya silme fonksiyonları
  const handleDeleteClick = (vardiya: any) => {
    // Personel atanmış mı kontrol et
    const hasPersonnel = vardiya.personnel && vardiya.personnel.length > 0;
    
    if (hasPersonnel) {
      // Personel atanmışsa hata modalını göster
      setDeleteErrorOpen(true);
    } else {
      // Personel yoksa silme onay modalını göster
      setDeleteVardiyaId(vardiya.id);
      setDeleteVardiyaName(vardiya.name);
      setDeleteConfirmOpen(true);
    }
  };

  const handleCloseDeleteError = () => {
    setDeleteErrorOpen(false);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setDeleteVardiyaId(null);
    setDeleteVardiyaName('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteVardiyaId || !userDetails?.companyId) return;
    
    setIsSubmitting(true);
    try {
      // Vardiyayı veritabanından sil
      const vardiyaRef = ref(database, `companies/${userDetails.companyId}/shifts/${deleteVardiyaId}`);
      await remove(vardiyaRef);
      
      // Vardiyalar listesini güncelle
      setVardiyalar(prevVardiyalar => prevVardiyalar.filter(v => v.id !== deleteVardiyaId));
      
      // Başarı mesajı
      setSnackbarMessage('Vardiya başarıyla silindi');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      
      // Modalı kapat
      handleCloseDeleteConfirm();
    } catch (error) {
      console.error('Vardiya silinirken hata:', error);
      setSnackbarMessage('Vardiya silinirken bir hata oluştu');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Excel'e veri aktarma olayını dinle
  useEffect(() => {
    const handleExportToExcel = (event: CustomEvent) => {
      const { worksheet } = event.detail;
      
      // Vardiya verilerini Excel'e ekle
      vardiyalar.forEach(vardiya => {
        const personnelCount = vardiya.personnel ? vardiya.personnel.length : 0;
        
        worksheet.addRow({
          name: vardiya.name,
          startTime: vardiya.startTime,
          endTime: vardiya.endTime,
          personnelCount: `${personnelCount} kişi`,
          lateTolerance: `${vardiya.lateTolerance || 10} dk`,
          earlyExitTolerance: `${vardiya.earlyExitTolerance || 10} dk`
        });
      });
    };
    
    // Event listener'ı ekle
    window.addEventListener('export-vardiya-to-excel', handleExportToExcel as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('export-vardiya-to-excel', handleExportToExcel as EventListener);
    };
  }, [vardiyalar]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Vardiya Listesi
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />} 
          onClick={handleClickOpen}
        >
          Vardiya Ekle
        </Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column' }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Vardiyalar yükleniyor...
          </Typography>
        </Box>
      ) : vardiyalar.length === 0 ? (
        <Paper 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            borderRadius: 2,
            backgroundColor: '#f8f9fa',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            height: '50vh',
            justifyContent: 'center'
          }}
        >
          <AccessTimeIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.7 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Henüz vardiya bulunmamaktadır
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: '500px' }}>
            Personelleriniz için vardiya ekleyerek giriş ve çıkış saatlerini takip edebilirsiniz.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />} 
            onClick={handleClickOpen}
          >
            Vardiya Ekle
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {vardiyalar.map((vardiya) => (
            <Grid item xs={12} sm={6} md={4} key={vardiya.id}>
              <Paper 
                sx={{ 
                  p: 2.5, 
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    {vardiya.name}
                  </Typography>
                  <IconButton 
                    size="small" 
                    color="primary" 
                    onClick={() => handleOpenPersonnelModal(vardiya.id)}
                    sx={{ 
                      border: '1px solid', 
                      borderColor: 'primary.main',
                      borderRadius: '50%',
                      padding: '4px',
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                      }
                    }}
                  >
                    <PersonIcon fontSize="small" />
                    <AddIcon fontSize="small" sx={{ position: 'absolute', right: 0, bottom: 0, fontSize: 12, backgroundColor: 'white', borderRadius: '50%' }} />
                  </IconButton>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    <strong>Giriş:</strong> {vardiya.startTime}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    <strong>Çıkış:</strong> {vardiya.endTime}
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 1.5 }} />
                
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Geç Kalma Toleransı:</strong> {vardiya.lateTolerance} dk
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Erken Çıkma Toleransı:</strong> {vardiya.earlyExitTolerance} dk
                </Typography>
                
                {renderBranchInfo(vardiya)}
                
                {renderPersonnelCount(vardiya)}
                
                <Box sx={{ mt: 'auto', pt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                  <Tooltip title={vardiya.personnel && vardiya.personnel.length > 0 ? 
                    "Personel atanmış vardiyalar silinemez" : "Vardiyayı sil"}>
                    <span>
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleDeleteClick(vardiya)}
                        sx={{ 
                          border: '1px solid', 
                          borderColor: 'error.main',
                          borderRadius: '50%',
                          padding: '4px',
                          opacity: vardiya.personnel && vardiya.personnel.length > 0 ? 0.5 : 1,
                          '&:hover': {
                            backgroundColor: vardiya.personnel && vardiya.personnel.length > 0 ? 'inherit' : 'error.main',
                            color: vardiya.personnel && vardiya.personnel.length > 0 ? 'error.main' : 'white',
                          }
                        }}
                        disabled={vardiya.personnel && vardiya.personnel.length > 0}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Vardiya Ekleme Modal */}
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6">Yeni Vardiya Ekle</Typography>
          <IconButton edge="end" color="inherit" onClick={handleClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {error && (
              <Grid item xs={12}>
                <Typography color="error" variant="body2">{error}</Typography>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                autoFocus
                label="Vardiya Adı"
                placeholder="Örn: Sabah Vardiyası, Gece Vardiyası"
                value={vardiyaAdi}
                onChange={(e) => setVardiyaAdi(e.target.value)}
                fullWidth
                required
              />
            </Grid>
            
            {/* Şube seçimi - sadece ana admin için görünür */}
            {!isManager && (
              <Grid item xs={12}>
                <Autocomplete
                  id="branch-select"
                  options={branches}
                  getOptionLabel={(option) => option.name}
                  value={selectedBranch}
                  onChange={(event, newValue) => {
                    setSelectedBranch(newValue);
                  }}
                  loading={loadingBranches}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Şube (İsteğe Bağlı)"
                      placeholder="Bir şube seçin veya boş bırakın"
                      helperText="Vardiyayı belirli bir şubeyle ilişkilendirmek isterseniz seçebilirsiniz"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingBranches ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  noOptionsText="Şube bulunamadı"
                />
              </Grid>
            )}
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Giriş Zamanı"
                type="time"
                value={girisZamani}
                onChange={(e) => setGirisZamani(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTimeIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Çıkış Zamanı"
                type="time"
                value={cikisZamani}
                onChange={(e) => setCikisZamani(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTimeIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Geç Kalma Toleransı (dk)</InputLabel>
                <Select
                  value={gecKalmaToleransi}
                  onChange={(e) => setGecKalmaToleransi(Number(e.target.value))}
                  label="Geç Kalma Toleransı (dk)"
                >
                  {[5, 10, 15, 20, 30, 45, 60].map((val) => (
                    <MenuItem key={val} value={val}>{val} dakika</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Erken Çıkma Toleransı (dk)</InputLabel>
                <Select
                  value={erkenCikmaToleransi}
                  onChange={(e) => setErkenCikmaToleransi(Number(e.target.value))}
                  label="Erken Çıkma Toleransı (dk)"
                >
                  {[5, 10, 15, 20, 30, 45, 60].map((val) => (
                    <MenuItem key={val} value={val}>{val} dakika</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={isSubmitting}>
            İptal
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Personel Seçme Modal */}
      <Dialog
        open={personnelModalOpen}
        onClose={handleClosePersonnelModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            height: '70vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, py: 1.5 }}>
          <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>Vardiyaya Personel Ekle</Typography>
          <IconButton edge="end" color="inherit" onClick={handleClosePersonnelModal} aria-label="close" size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Autocomplete
            fullWidth
            size="small"
            options={personnelList}
            getOptionLabel={(option) => option.name}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Personel Ara"
                variant="outlined"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  )
                }}
                onChange={(e) => setSearchTerm(e.target.value)}
                value={searchTerm}
              />
            )}
            onChange={(_, newValue) => {
              if (newValue) {
                setSearchTerm(newValue.name);
              }
            }}
            noOptionsText="Personel bulunamadı"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem' }}>
            Not: Zaten başka vardiyaya atanmış personeller burada listelenmez. Bir personel sadece bir vardiyada olabilir.
          </Typography>
        </Box>
        
        <DialogContent dividers sx={{ p: 0, flexGrow: 1, overflow: 'auto' }}>
          {loadingPersonnel ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : filteredPersonnel.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 3 }}>
              <Typography variant="body1" color="text.secondary">
                Personel bulunamadı veya arama sonucu boş.
              </Typography>
            </Box>
          ) : (
            <>
              <ListItem 
                button 
                onClick={handleToggleAll}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'action.hover',
                  py: 0.5,
                  minHeight: 40
                }}
                dense
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox
                    edge="start"
                    checked={selectedPersonnel.length === filteredPersonnel.length && filteredPersonnel.length > 0}
                    indeterminate={selectedPersonnel.length > 0 && selectedPersonnel.length < filteredPersonnel.length}
                    tabIndex={-1}
                    disableRipple
                    size="small"
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Tümünü Seç / Seçimi Kaldır" 
                  primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                />
              </ListItem>
              
              <List disablePadding>
                {filteredPersonnel.map((person) => {
                  const isSelected = selectedPersonnel.indexOf(person.id) !== -1;
                  
                  return (
                    <ListItem 
                      key={person.id} 
                      button 
                      onClick={() => handleTogglePersonnel(person.id)}
                      sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: isSelected ? 'action.selected' : 'inherit',
                        py: 0.5,
                        minHeight: 36
                      }}
                      dense
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox
                          edge="start"
                          checked={isSelected}
                          tabIndex={-1}
                          disableRipple
                          size="small"
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={person.name} 
                        primaryTypographyProps={{ fontSize: '0.9rem' }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </>
          )}
        </DialogContent>
        
        <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
          <Box sx={{ flexGrow: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selectedPersonnel.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1, alignSelf: 'center', fontSize: '0.85rem' }}>
                Seçilen: {selectedPersonnel.length} personel
              </Typography>
            )}
            {selectedPersonnel.slice(0, 5).map((id) => {
              const person = personnelList.find(p => p.id === id);
              return person ? (
                <Chip 
                  key={id} 
                  label={person.name} 
                  size="small" 
                  onDelete={() => handleTogglePersonnel(id)}
                  sx={{ height: 24, '& .MuiChip-label': { fontSize: '0.75rem' } }}
                />
              ) : null;
            })}
            {selectedPersonnel.length > 5 && (
              <Chip 
                label={`+${selectedPersonnel.length - 5} kişi daha`} 
                size="small" 
                variant="outlined"
                sx={{ height: 24, '& .MuiChip-label': { fontSize: '0.75rem' } }}
              />
            )}
          </Box>
        </Box>
        
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={handleClosePersonnelModal} disabled={isSubmitting} size="small">
            İptal
          </Button>
          <Button 
            onClick={handleSavePersonnel} 
            variant="contained" 
            color="primary"
            disabled={isSubmitting}
            size="small"
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Silme Hata Modalı */}
      <Dialog
        open={deleteErrorOpen}
        onClose={handleCloseDeleteError}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Vardiya Silinemez</Typography>
          <IconButton edge="end" color="inherit" onClick={handleCloseDeleteError} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Personel atanmış vardiyalar silinemez. Lütfen önce vardiyadan tüm personeli kaldırınız.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteError} variant="contained" color="primary">
            Tamam
          </Button>
        </DialogActions>
      </Dialog>

      {/* Silme Onay Modalı */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Vardiya Silme Onayı</Typography>
          <IconButton edge="end" color="inherit" onClick={handleCloseDeleteConfirm} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            <strong>{deleteVardiyaName}</strong> vardiyasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm} disabled={isSubmitting}>
            İptal
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="contained" 
            color="error"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {isSubmitting ? 'Siliniyor...' : 'Evet, Sil'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bildirim Snackbar */}
      <Snackbar 
        open={openSnackbar} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VardiyaListesi;
