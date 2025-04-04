import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  styled,
  Typography,
  IconButton,
  Drawer,
  Link,
  useTheme
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// İkonlar
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import MessageIcon from '@mui/icons-material/Message';
import PollIcon from '@mui/icons-material/Poll';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BusinessIcon from '@mui/icons-material/Business';
import MonitorIcon from '@mui/icons-material/Monitor';

const SidebarContainer = styled(Box)<{ isCollapsed: boolean }>(({ theme, isCollapsed }) => ({
  width: isCollapsed ? 70 : 260,
  height: '100vh',
  backgroundColor: '#102648',
  color: 'white',
  display: 'flex',
  flexDirection: 'column',
  position: 'fixed',
  left: 0,
  top: 0,
  zIndex: 100,
  boxShadow: '0 0 10px rgba(0,0,0,0.3)',
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
}));

const Logo = styled(Box)<{ isCollapsed: boolean }>(({ theme, isCollapsed }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
}));

const LogoImage = styled('img')<{ isCollapsed: boolean }>(({ isCollapsed }) => ({
  width: isCollapsed ? 40 : 70,
  height: isCollapsed ? 40 : 70,
  borderRadius: 10,
  marginBottom: isCollapsed ? 0 : 10,
  transition: 'all 0.3s ease',
}));

const MenuContainer = styled(List)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(2, 0),
}));

const MenuItem = styled(ListItem)<{ active?: boolean; isCollapsed: boolean }>(({ theme, active, isCollapsed }) => ({
  padding: theme.spacing(1.5, isCollapsed ? 2 : 3),
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

const ToggleButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: -12,
  top: 55,
  backgroundColor: '#0D47A1',
  color: 'white',
  '&:hover': {
    backgroundColor: '#0D47A1',
  },
  zIndex: 101,
  border: '2px solid white',
  boxShadow: '0 0 5px rgba(0,0,0,0.2)',
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: 240,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: 240,
    boxSizing: 'border-box',
    backgroundColor: '#102648',
    color: theme.palette.common.white,
  },
}));

interface SidebarProps {
  openMobile?: boolean;
  onCloseMobile?: () => void;
  onCollapse: (isCollapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ openMobile, onCloseMobile, onCollapse }) => {
  const { logout } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const toggleSidebar = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    onCollapse(newCollapsedState);
  };

  return (
    <SidebarContainer isCollapsed={isCollapsed}>
      <ToggleButton onClick={toggleSidebar} size="small">
        {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </ToggleButton>
      
      <Logo isCollapsed={isCollapsed}>
        <LogoImage src="/assets/gtslogo.jpg" alt="GTS Logo" isCollapsed={isCollapsed} />
        {!isCollapsed && (
          <Typography variant="h6" fontWeight="bold">
            GTS Panel
          </Typography>
        )}
      </Logo>
      
      <MenuContainer>
        <MenuItem 
          active={isActive('/dashboard')} 
          onClick={() => handleNavigation('/dashboard')}
          isCollapsed={isCollapsed}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <DashboardIcon />
          </ListItemIcon>
          {!isCollapsed && <ListItemText primary="Dashboard" />}
        </MenuItem>
        
        <MenuItem 
          active={isActive('/tasks')} 
          onClick={() => handleNavigation('/tasks')}
          isCollapsed={isCollapsed}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <AssignmentIcon />
          </ListItemIcon>
          {!isCollapsed && <ListItemText primary="Görevler" />}
        </MenuItem>
        
        <MenuItem 
          active={isActive('/personnel')} 
          onClick={() => handleNavigation('/personnel')}
          isCollapsed={isCollapsed}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <PeopleIcon />
          </ListItemIcon>
          {!isCollapsed && <ListItemText primary="Personel" />}
        </MenuItem>
        
        <MenuItem 
          active={isActive('/shifts')} 
          onClick={() => handleNavigation('/shifts')}
          isCollapsed={isCollapsed}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <AccessTimeIcon />
          </ListItemIcon>
          {!isCollapsed && <ListItemText primary="Vardiya" />}
        </MenuItem>
        
        <MenuItem 
          active={isActive('/reports')} 
          onClick={() => handleNavigation('/reports')}
          isCollapsed={isCollapsed}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <AssessmentIcon />
          </ListItemIcon>
          {!isCollapsed && <ListItemText primary="Raporlar" />}
        </MenuItem>
        
        <MenuItem 
          active={isActive('/messages')} 
          onClick={() => handleNavigation('/messages')}
          isCollapsed={isCollapsed}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <MessageIcon />
          </ListItemIcon>
          {!isCollapsed && <ListItemText primary="Mesajlar" />}
        </MenuItem>
        
        <MenuItem 
          active={isActive('/surveys')} 
          onClick={() => handleNavigation('/surveys')}
          isCollapsed={isCollapsed}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <PollIcon />
          </ListItemIcon>
          {!isCollapsed && <ListItemText primary="Anketler" />}
        </MenuItem>
        
        <MenuItem 
          active={isActive('/branches')} 
          onClick={() => handleNavigation('/branches')}
          isCollapsed={isCollapsed}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <BusinessIcon />
          </ListItemIcon>
          {!isCollapsed && <ListItemText primary="Şubeler" />}
        </MenuItem>
        
        <MenuItem 
          active={isActive('/customer-screen')} 
          onClick={() => handleNavigation('/customer-screen')}
          isCollapsed={isCollapsed}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <MonitorIcon />
          </ListItemIcon>
          {!isCollapsed && <ListItemText primary="Müşteri Ekranı" />}
        </MenuItem>
      </MenuContainer>
      
      <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
      
      <Box sx={{ 
        mt: 'auto', 
        p: 2, 
        textAlign: 'center',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Link 
          href="https://www.mt-teknoloji.com" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          {!isCollapsed ? (
            <>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'white',
                  opacity: 0.8,
                  mb: 0.5
                }}
              >
                Powered by
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'white',
                  fontWeight: 'bold',
                  '&:hover': {
                    color: theme.palette.primary.light,
                    transition: 'color 0.2s'
                  }
                }}
              >
                AQUASOFT
              </Typography>
            </>
          ) : (
            <Typography 
              variant="h5" 
              sx={{ 
                color: 'white',
                fontWeight: 'bold',
                '&:hover': {
                  color: theme.palette.primary.light,
                  transition: 'color 0.2s'
                }
              }}
            >
              A
            </Typography>
          )}
        </Link>
      </Box>
    </SidebarContainer>
  );
};

export default Sidebar; 