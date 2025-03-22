import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  styled,
  Typography
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

// İkonlar
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

const SidebarContainer = styled(Box)(({ theme }) => ({
  width: 260,
  height: '100vh',
  backgroundColor: '#0D47A1',
  color: 'white',
  display: 'flex',
  flexDirection: 'column',
  position: 'fixed',
  left: 0,
  top: 0,
  zIndex: 100,
  boxShadow: '0 0 10px rgba(0,0,0,0.3)',
}));

const Logo = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
}));

const LogoImage = styled('img')({
  width: 70,
  height: 70,
  borderRadius: 10,
  marginBottom: 10
});

const MenuContainer = styled(List)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(2, 0),
}));

const MenuItem = styled(ListItem)<{ active?: boolean }>(({ theme, active }) => ({
  padding: theme.spacing(1.5, 3),
  marginBottom: theme.spacing(0.5),
  cursor: 'pointer',
  borderLeft: active ? '4px solid white' : '4px solid transparent',
  backgroundColor: active ? 'rgba(255,255,255,0.1)' : 'transparent',
  '&:hover': {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
}));

const FooterContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  textAlign: 'center',
  borderTop: '1px solid rgba(255,255,255,0.1)',
  fontSize: '0.75rem',
  opacity: 0.8
}));

interface SidebarProps {
  openMobile?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ openMobile, onCloseMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  return (
    <SidebarContainer>
      <Logo>
        <LogoImage src="/assets/gtslogo.jpg" alt="GTS Logo" />
        <Typography variant="h6" fontWeight="bold">
          GTS Panel
        </Typography>
      </Logo>
      
      <MenuContainer>
        <MenuItem 
          active={isActive('/dashboard')} 
          onClick={() => handleNavigation('/dashboard')}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </MenuItem>
        
        <MenuItem 
          active={isActive('/tasks')} 
          onClick={() => handleNavigation('/tasks')}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <AssignmentIcon />
          </ListItemIcon>
          <ListItemText primary="Görevler" />
        </MenuItem>
        
        <MenuItem 
          active={isActive('/personnel')} 
          onClick={() => handleNavigation('/personnel')}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <PeopleIcon />
          </ListItemIcon>
          <ListItemText primary="Personel" />
        </MenuItem>
        
        <MenuItem 
          active={isActive('/reports')} 
          onClick={() => handleNavigation('/reports')}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <AssessmentIcon />
          </ListItemIcon>
          <ListItemText primary="Raporlar" />
        </MenuItem>
        
        <MenuItem 
          active={isActive('/profile')} 
          onClick={() => handleNavigation('/profile')}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <AccountCircleIcon />
          </ListItemIcon>
          <ListItemText primary="Profil" />
        </MenuItem>
      </MenuContainer>
      
      <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
      
      <FooterContainer>
        <Typography variant="caption" display="block" gutterBottom>
          Powered by
        </Typography>
        <Typography variant="body2" fontWeight="bold">
          MT TEKNOLOJİ
        </Typography>
      </FooterContainer>
    </SidebarContainer>
  );
};

export default Sidebar; 