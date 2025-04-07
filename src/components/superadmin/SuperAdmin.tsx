import React, { useState, useEffect } from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Avatar, 
  Menu, 
  MenuItem, 
  styled,
  useTheme,
  useMediaQuery,
  Grid,
  TextField,
  InputAdornment,
  Container,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Modal,
  Button,
  Fade,
  Backdrop,
  Divider,
  Slide
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';
import BusinessIcon from '@mui/icons-material/Business';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import { ref, get, update } from 'firebase/database';
import { database } from '../../firebase';
import CompanyCard from './CompanyCard';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: '#102648',
  color: 'white',
  boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.1)',
  position: 'fixed',
  width: '100%',
  zIndex: 99,
}));

const SuperAdminHeader: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleMenuClose();
      navigate('/login');
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  return (
    <StyledAppBar elevation={0}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon />
          <Typography 
            variant={isMobile ? "h6" : "h5"}
            component="h1" 
            sx={{ 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            GTS Süper Admin
          </Typography>
        </Box>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            sx={{ 
              bgcolor: 'primary.main',
              cursor: 'pointer',
              width: 40,
              height: 40
            }}
            onClick={handleMenuOpen}
          >
            {currentUser?.email?.charAt(0).toUpperCase()}
          </Avatar>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: { width: 200, mt: 1 }
            }}
          >
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} />
              Çıkış Yap
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </StyledAppBar>
  );
};

interface Company {
  id: string;
  name: string;
  logo?: string;
  admin: {
    name: string;
    email: string;
  };
  stats: {
    personnelCount: number;
    branchCount: number;
    activeTasks: number;
    completedTasks: number;
    shifts: number;
    surveys: number;
  };
  maxPersonnel?: number;
}

const ModalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 500 },
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 0,
  outline: 'none',
  overflow: 'hidden'
};

const SuperAdmin: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newMaxPersonnel, setNewMaxPersonnel] = useState<number>(0);
  const [updating, setUpdating] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        console.log('Süper admin kullanıcısı:', currentUser);
        console.log('Şirketler yükleniyor...');
        
        // Önce kullanıcının rolünü kontrol et
        const userRef = ref(database, `users/${currentUser?.uid}`);
        const userSnapshot = await get(userRef);
        console.log('Kullanıcı bilgileri:', userSnapshot.val());
        
        if (!userSnapshot.exists() || userSnapshot.val().role !== 'superadmin') {
          console.log('Kullanıcı süper admin değil');
          navigate('/login');
          return;
        }

        const companiesRef = ref(database, 'companies');
        const snapshot = await get(companiesRef);
        
        if (snapshot.exists()) {
          const companiesData = snapshot.val();
          console.log('Ham şirket verileri:', companiesData);
          
          const companiesList = await Promise.all(
            Object.entries(companiesData)
              .filter(([id, company]: [string, any]) => {
                console.log(`Şirket ${id} kontrolü:`, company);
                return company && typeof company === 'object';
              })
              .map(async ([id, company]: [string, any]) => {
                console.log(`Şirket ${id} işleniyor:`, company);
                const stats = await calculateCompanyStats(id);
                console.log(`Şirket ${id} istatistikleri:`, stats);
                
                // Şirket bilgilerini al
                const companyInfoRef = ref(database, `companies/${id}/info`);
                const companyInfoSnapshot = await get(companyInfoRef);
                const companyInfo = companyInfoSnapshot.exists() ? companyInfoSnapshot.val() : {};
                console.log(`Şirket ${id} için companyInfo:`, companyInfo);
                
                // Admin bilgilerini users koleksiyonundan al
                let adminInfo = {
                  name: 'Admin Bilgisi Yok',
                  email: ''
                };
                
                if (companyInfo && companyInfo.admin) {
                  console.log(`Şirket ${id} için admin ID:`, companyInfo.admin);
                  // Admin ID'sini kullanarak direkt users koleksiyonundan bilgileri al
                  const adminUserRef = ref(database, `users/${companyInfo.admin}`);
                  const adminUserSnapshot = await get(adminUserRef);
                  if (adminUserSnapshot.exists()) {
                    const adminUserData = adminUserSnapshot.val();
                    console.log(`Admin ${companyInfo.admin} için kullanıcı verisi:`, adminUserData);
                    adminInfo = {
                      name: `${adminUserData.firstName} ${adminUserData.lastName}` || 'Admin Bilgisi Yok',
                      email: adminUserData.email || ''
                    };
                    console.log(`Admin bilgileri güncellendi:`, adminInfo);
                  } else {
                    console.log(`Admin ${companyInfo.admin} için kullanıcı bulunamadı`);
                  }
                } else {
                  console.log(`Şirket ${id} için admin bilgisi bulunamadı`);
                }

                const companyData = {
                  id,
                  name: companyInfo.name || company.name || 'İsimsiz Şirket',
                  logo: companyInfo.logo || company.logo || '',
                  admin: adminInfo,
                  stats,
                  maxPersonnel: companyInfo.maxPersonnel || 0
                };
                
                console.log(`İşlenmiş şirket ${id} verisi:`, companyData);
                return companyData;
              })
          );
          
          console.log('Tüm işlenmiş şirket listesi:', companiesList);
          setCompanies(companiesList.filter(company => company !== null));
        } else {
          console.log('Hiç şirket bulunamadı');
          setCompanies([]);
        }
      } catch (error) {
        console.error('Şirketler yüklenirken hata:', error);
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchCompanies();
    }
  }, [currentUser, navigate]);

  const calculateCompanyStats = async (companyId: string) => {
    try {
      console.log(`${companyId} için istatistikler hesaplanıyor...`);
      
      const [
        personnelSnapshot,
        branchesSnapshot,
        tasksSnapshot,
        completedTasksSnapshot,
        shiftsSnapshot,
        surveysSnapshot
      ] = await Promise.all([
        get(ref(database, `companies/${companyId}/personnel`)),
        get(ref(database, `companies/${companyId}/branches`)),
        get(ref(database, `companies/${companyId}/tasks`)),
        get(ref(database, `companies/${companyId}/completedTasks`)),
        get(ref(database, `companies/${companyId}/shifts`)),
        get(ref(database, `companies/${companyId}/surveys`))
      ]);

      // Tamamlanmış görevleri hesaplama
      let completedTasksCount = 0;
      if (completedTasksSnapshot.exists()) {
        const completedTasksData = completedTasksSnapshot.val();
        // Her bir görev ID'si için
        Object.keys(completedTasksData).forEach(taskId => {
          const taskDates = completedTasksData[taskId];
          // Her bir tarih için
          Object.keys(taskDates).forEach(date => {
            const timeslots = taskDates[date];
            // Her bir saat dilimi için
            completedTasksCount += Object.keys(timeslots).length;
          });
        });
      }

      const stats = {
        personnelCount: personnelSnapshot.exists() ? Object.keys(personnelSnapshot.val() || {}).length : 0,
        branchCount: branchesSnapshot.exists() ? Object.keys(branchesSnapshot.val() || {}).length : 0,
        activeTasks: tasksSnapshot.exists() ? Object.keys(tasksSnapshot.val() || {}).length : 0,
        completedTasks: completedTasksCount,
        shifts: shiftsSnapshot.exists() ? Object.keys(shiftsSnapshot.val() || {}).length : 0,
        surveys: surveysSnapshot.exists() ? Object.keys(surveysSnapshot.val() || {}).length : 0
      };

      console.log(`${companyId} istatistikleri:`, stats);
      return stats;
    } catch (error) {
      console.error(`${companyId} için istatistikler hesaplanırken hata:`, error);
      return {
        personnelCount: 0,
        branchCount: 0,
        activeTasks: 0,
        completedTasks: 0,
        shifts: 0,
        surveys: 0
      };
    }
  };

  const handleViewDetails = (companyId: string) => {
    // Şirket detayları sayfasına yönlendir
    navigate(`/superadmin/company/${companyId}`);
  };

  const handleOpenModal = (company: Company) => {
    setSelectedCompany(company);
    setNewMaxPersonnel(company.maxPersonnel || 0);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
  };

  const handleUpdateMaxPersonnel = async () => {
    if (!selectedCompany) return;
    
    try {
      setUpdating(true);
      const companyInfoRef = ref(database, `companies/${selectedCompany.id}/info`);
      await update(companyInfoRef, { maxPersonnel: newMaxPersonnel });
      
      // Yerel state'i güncelle
      setCompanies(prevCompanies => 
        prevCompanies.map(company => 
          company.id === selectedCompany.id 
            ? { ...company, maxPersonnel: newMaxPersonnel } 
            : company
        )
      );
      
      handleCloseModal();
    } catch (error) {
      console.error('Personel sayısı güncellenirken hata:', error);
    } finally {
      setUpdating(false);
    }
  };

  const filteredCompanies = companies.filter(company => {
    if (!company || !company.name) return false;
    return company.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Liste görünümü bileşeni
  const CompanyListView = () => (
    <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
            <TableCell>Şirket</TableCell>
            <TableCell>Admin</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Personel</TableCell>
            <TableCell>Şubeler</TableCell>
            <TableCell>Aktif Görevler</TableCell>
            <TableCell>Tamamlanan</TableCell>
            <TableCell>Vardiyalar</TableCell>
            <TableCell>Anketler</TableCell>
            <TableCell>Max Personel</TableCell>
            <TableCell>İşlem</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredCompanies.map((company) => (
            <TableRow 
              key={company.id} 
              sx={{ 
                '&:hover': { bgcolor: '#f9f9f9' },
                cursor: 'pointer'
              }}
              onClick={() => handleOpenModal(company)}
            >
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar
                    src={company.logo}
                    alt={company.name}
                    sx={{ width: 40, height: 40, bgcolor: '#102648' }}
                  >
                    {company.name.charAt(0)}
                  </Avatar>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {company.name}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>{company.admin.name}</TableCell>
              <TableCell>{company.admin.email}</TableCell>
              <TableCell>{company.stats.personnelCount}</TableCell>
              <TableCell>{company.stats.branchCount}</TableCell>
              <TableCell>{company.stats.activeTasks}</TableCell>
              <TableCell>{company.stats.completedTasks}</TableCell>
              <TableCell>{company.stats.shifts}</TableCell>
              <TableCell>{company.stats.surveys}</TableCell>
              <TableCell>{company.maxPersonnel || 0}</TableCell>
              <TableCell>
                <IconButton 
                  size="small" 
                  color="primary" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenModal(company);
                  }}
                  sx={{ bgcolor: '#102648', color: 'white', '&:hover': { bgcolor: '#0D1F3C' } }}
                >
                  <PeopleAltIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
  
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SuperAdminHeader />
      <Box sx={{ 
        flexGrow: 1, 
        mt: 8,
        p: 3,
        bgcolor: 'background.default',
        overflow: 'auto'
      }}>
        <Container maxWidth="xl">
          <Box sx={{ 
            mb: 4, 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <TextField
              variant="outlined"
              placeholder="Şirket ara..."
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
                maxWidth: 400,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: 'background.paper'
                }
              }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton 
                color={viewMode === 'card' ? 'primary' : 'default'} 
                onClick={() => setViewMode('card')}
                sx={{ 
                  bgcolor: viewMode === 'card' ? '#102648' : 'transparent',
                  color: viewMode === 'card' ? 'white' : 'inherit',
                  '&:hover': { bgcolor: viewMode === 'card' ? '#0D1F3C' : 'rgba(0,0,0,0.04)' }
                }}
              >
                <ViewModuleIcon />
              </IconButton>
              <IconButton 
                color={viewMode === 'list' ? 'primary' : 'default'} 
                onClick={() => setViewMode('list')}
                sx={{ 
                  bgcolor: viewMode === 'list' ? '#102648' : 'transparent',
                  color: viewMode === 'list' ? 'white' : 'inherit',
                  '&:hover': { bgcolor: viewMode === 'list' ? '#0D1F3C' : 'rgba(0,0,0,0.04)' }
                }}
              >
                <ViewListIcon />
              </IconButton>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : viewMode === 'card' ? (
            <Box sx={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto', pb: 2 }}>
              <Grid container spacing={3}>
                {filteredCompanies.map((company) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={company.id}>
                    <CompanyCard
                      {...company}
                      onViewDetails={() => handleOpenModal(company)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <CompanyListView />
          )}
        </Container>
      </Box>

      {/* Personel Sayısı Güncelleme Modal */}
      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
          },
        }}
      >
        <Fade in={isModalOpen}>
          <Box sx={ModalStyle}>
            <Box sx={{ 
              p: 2, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              bgcolor: '#102648',
              color: 'white'
            }}>
              <Typography variant="h6">
                Personel Sayısı Güncelleme
              </Typography>
              <IconButton 
                size="small" 
                onClick={handleCloseModal}
                sx={{ color: 'white' }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
            
            <Box sx={{ p: 3 }}>
              {selectedCompany && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar
                      src={selectedCompany.logo}
                      alt={selectedCompany.name}
                      sx={{ width: 50, height: 50, mr: 2, bgcolor: '#102648' }}
                    >
                      {selectedCompany.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{selectedCompany.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedCompany.admin.name}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Mevcut Personel Sayısı: <strong>{selectedCompany.stats.personnelCount}</strong>
                  </Typography>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Mevcut Maksimum Personel Sayısı: <strong>{selectedCompany.maxPersonnel || 0}</strong>
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="Yeni Maksimum Personel Sayısı"
                    variant="outlined"
                    type="number"
                    value={newMaxPersonnel}
                    onChange={(e) => setNewMaxPersonnel(parseInt(e.target.value) || 0)}
                    inputProps={{ min: 0 }}
                    sx={{ mb: 3 }}
                  />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button 
                      variant="outlined" 
                      onClick={handleCloseModal}
                      startIcon={<CloseIcon />}
                    >
                      İptal
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={handleUpdateMaxPersonnel}
                      disabled={updating}
                      startIcon={<SaveIcon />}
                      sx={{
                        bgcolor: '#102648',
                        '&:hover': {
                          bgcolor: '#0D1F3C'
                        }
                      }}
                    >
                      {updating ? 'Güncelleniyor...' : 'Güncelle'}
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
};

export default SuperAdmin; 