import React, { useState, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Menu, 
  MenuItem, 
  styled, 
  Chip,
  Divider,
  useTheme,
  Paper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Business from '@mui/icons-material/Business';
import { useAuth } from '../../contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import NotificationMenu from '../notifications/NotificationMenu';
import ManagerWithSidebar from './ManagerWithSidebar';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: 'white',
  color: theme.palette.text.primary,
  boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.1)',
  position: 'fixed',
  width: '100%',
  zIndex: 99,
}));

const UserChip = styled(Chip)(({ theme }) => ({
  height: 42,
  borderRadius: 21,
  padding: theme.spacing(0.5, 1),
  backgroundColor: '#0D47A1',
  transition: 'all 0.2s ease-in-out',
  '& .MuiChip-label': {
    color: 'white',
    transition: 'color 0.2s ease-in-out',
  },
  '&:hover': {
    backgroundColor: 'white',
    '& .MuiChip-label': {
      color: '#0D47A1',
    },
    '& .MuiIconButton-root': {
      color: '#0D47A1',
    },
  },
}));

const BranchChip = styled(Chip)(({ theme }) => ({
  marginLeft: theme.spacing(2),
  backgroundColor: '#1976D2',
  color: 'white',
  '& .MuiSvgIcon-root': {
    color: 'white',
  },
}));

const ManagerDashboard: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [branchName, setBranchName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('Görev Takip Sistemi');
  const { currentUser, logout, userDetails } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchData = async () => {
      if (userDetails && userDetails.companyId) {
        try {
          // Debug için önce userDetails içeriğini görelim
          console.log("UserDetails:", userDetails);
          
          // 1. Şirket bilgilerini al
          const companyRef = ref(database, `companies/${userDetails.companyId}`);
          const companySnapshot = await get(companyRef);
          
          if (companySnapshot.exists()) {
            const companyData = companySnapshot.val();
            console.log("Company Data:", companyData);
            
            if (companyData.info && companyData.info.name) {
              setCompanyName(companyData.info.name);
            } else if (companyData.name) {
              setCompanyName(companyData.name);
            } else {
              console.log("Şirket adı bulunamadı, companyData:", companyData);
              setCompanyName(userDetails.companyName || 'Görev Takip Sistemi');
            }
          }
          
          // 2. Şube bilgilerini al
          if (userDetails.branchesId) {
            const branchSnapshot = await get(ref(database, `companies/${userDetails.companyId}/branches/${userDetails.branchesId}`));
            if (branchSnapshot.exists()) {
              const branchData = branchSnapshot.val();
              console.log("Branch Data:", branchData);
              setBranchName(branchData.name || 'Bilinmeyen Şube');
            }
          }
        } catch (error) {
          console.error("Veri yüklenirken hata:", error);
        }
      }
    };
    
    fetchData();
  }, [userDetails]);
  
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
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };
  
  const userFullName = userDetails 
    ? `${userDetails.firstName} ${userDetails.lastName}` 
    : 'Kullanıcı';

  return (
    <>
      <StyledAppBar elevation={0}>
        <Toolbar>
          <Typography 
            variant="h5"
            component="h1" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 'bold', 
              color: '#0D47A1',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {companyName}
            
            {branchName && (
              <BranchChip
                icon={<Business />}
                label={branchName}
                size="medium"
              />
            )}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <NotificationMenu />
            
            <UserChip
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {userFullName}
                  </Typography>
                  <Box 
                    component="span"
                    onClick={handleMenuOpen}
                    sx={{ 
                      ml: 0.5, 
                      p: 0, 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center' 
                    }}
                  >
                    <ExpandMoreIcon fontSize="small" />
                  </Box>
                </Box>
              }
              onClick={handleMenuOpen}
              sx={{ cursor: 'pointer' }}
            />
            
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                sx: { width: 200, mt: 1 }
              }}
            >
              <MenuItem onClick={() => {
                handleMenuClose();
                navigate('/manager/profile');
              }}>
                Profil
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                Güvenli Çıkış
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </StyledAppBar>
      
      {/* Header'dan sonraki içerik alanı */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 0, 
          mt: 8, // AppBar yüksekliğini hesaba katarak üst kenar boşluğu
          overflow: 'hidden',
          height: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ManagerWithSidebar bileşenini göster */}
        <ManagerWithSidebar />
      </Box>
    </>
  );
};

export default ManagerDashboard; 