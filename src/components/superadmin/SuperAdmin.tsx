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
  CircularProgress
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';
import BusinessIcon from '@mui/icons-material/Business';
import SearchIcon from '@mui/icons-material/Search';
import { ref, get } from 'firebase/database';
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
}

const SuperAdmin: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
                
                const companyData = {
                  id,
                  name: companyInfo.name || company.name || 'İsimsiz Şirket',
                  logo: companyInfo.logo || company.logo || '',
                  admin: {
                    name: companyInfo.admin?.name || company.admin?.name || 'Admin Bilgisi Yok',
                    email: companyInfo.admin?.email || company.admin?.email || ''
                  },
                  stats
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

      const stats = {
        personnelCount: personnelSnapshot.exists() ? Object.keys(personnelSnapshot.val() || {}).length : 0,
        branchCount: branchesSnapshot.exists() ? Object.keys(branchesSnapshot.val() || {}).length : 0,
        activeTasks: tasksSnapshot.exists() ? Object.keys(tasksSnapshot.val() || {}).length : 0,
        completedTasks: completedTasksSnapshot.exists() ? Object.keys(completedTasksSnapshot.val() || {}).length : 0,
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

  const filteredCompanies = companies.filter(company => {
    if (!company || !company.name) return false;
    return company.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SuperAdminHeader />
      <Box sx={{ 
        flexGrow: 1, 
        mt: 8,
        p: 3,
        bgcolor: 'background.default'
      }}>
        <Container maxWidth="xl">
          <Box sx={{ mb: 4 }}>
            <TextField
              fullWidth
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
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {filteredCompanies.map((company) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={company.id}>
                  <CompanyCard
                    {...company}
                    onViewDetails={handleViewDetails}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default SuperAdmin; 