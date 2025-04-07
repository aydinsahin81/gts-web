import React, { useState, useEffect } from 'react';
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
  useTheme,
  useMediaQuery
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
  [theme.breakpoints.down('md')]: {
    width: isCollapsed ? 55 : 180,
  },
}));

const Logo = styled(Box)<{ isCollapsed: boolean }>(({ theme, isCollapsed }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(1.5),
  },
}));

const LogoImage = styled('img')<{ isCollapsed: boolean }>(({ theme, isCollapsed }) => ({
  width: isCollapsed ? 40 : 70,
  height: isCollapsed ? 40 : 70,
  borderRadius: 10,
  marginBottom: isCollapsed ? 0 : 10,
  transition: 'all 0.3s ease',
  [theme.breakpoints.down('md')]: {
    width: isCollapsed ? 30 : 50,
    height: isCollapsed ? 30 : 50,
    marginBottom: isCollapsed ? 0 : 5,
  },
}));

const MenuContainer = styled(List)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(2, 0),
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(0.3, 0),
  },
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
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(0.4, isCollapsed ? 0.5 : 1),
    marginBottom: 1,
    minHeight: 28,
  },
}));

const FooterContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  textAlign: 'center',
  borderTop: '1px solid rgba(255,255,255,0.1)',
  fontSize: '0.75rem',
  opacity: 0.8,
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(1),
    fontSize: '0.7rem',
  },
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
  [theme.breakpoints.down('md')]: {
    right: -10,
    top: 40,
    padding: '4px',
  },
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
  [theme.breakpoints.down('md')]: {
    '& .MuiDrawer-paper': {
      width: 200,
    },
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
  
  // Responsive tasarım için ekran boyutlarını kontrol et
  const isMediumScreen = useMediaQuery(theme.breakpoints.down('lg'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  // İlk yüklemede ve ekran boyutu değiştiğinde sidebar durumunu ayarla
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Küçük ekranlar için varsayılan olarak daraltılmış modu kullan
    return isSmallScreen || isMediumScreen;
  });
  
  // Ekran boyutu değiştiğinde sidebar durumunu güncelle
  useEffect(() => {
    if (isSmallScreen || isMediumScreen) {
      setIsCollapsed(true);
      onCollapse(true);
    }
  }, [isSmallScreen, isMediumScreen, onCollapse]);

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

  // Menü öğelerini render etme fonksiyonu - butonları tek bir yerden oluşturmak için
  const renderMenuItem = (path: string, label: string, icon: React.ReactNode) => {
    return (
      <MenuItem 
        active={isActive(path)} 
        onClick={() => handleNavigation(path)}
        isCollapsed={isCollapsed}
      >
        <ListItemIcon sx={{ 
          color: 'white', 
          minWidth: isSmallScreen ? 16 : 40,
          marginRight: isSmallScreen && !isCollapsed ? 0.5 : 0
        }}>
          {icon}
        </ListItemIcon>
        {!isCollapsed && (
          <ListItemText 
            primary={label} 
            primaryTypographyProps={{ 
              fontSize: isSmallScreen ? '0.65rem' : 'inherit',
              noWrap: true
            }} 
            sx={{ margin: isSmallScreen ? 0 : 'auto' }}
          />
        )}
      </MenuItem>
    );
  };

  return (
    <SidebarContainer isCollapsed={isCollapsed}>
      <ToggleButton onClick={toggleSidebar} size={isSmallScreen ? "small" : "medium"}>
        {isCollapsed ? <ChevronRightIcon fontSize={isSmallScreen ? "small" : "medium"} /> : <ChevronLeftIcon fontSize={isSmallScreen ? "small" : "medium"} />}
      </ToggleButton>
      
      <Logo isCollapsed={isCollapsed}>
        <LogoImage src="/assets/gtslogo.jpg" alt="GTS Logo" isCollapsed={isCollapsed} />
        {!isCollapsed && (
          <Typography variant={isSmallScreen ? "subtitle1" : "h6"} fontWeight="bold">
            GTS Panel
          </Typography>
        )}
      </Logo>
      
      <MenuContainer>
        {renderMenuItem(
          '/dashboard', 
          'Dashboard', 
          <DashboardIcon 
            sx={{ fontSize: isSmallScreen ? 16 : 24 }} 
          />
        )}
        
        {renderMenuItem(
          '/tasks', 
          'Görevler', 
          <AssignmentIcon 
            sx={{ fontSize: isSmallScreen ? 16 : 24 }} 
          />
        )}
        
        {renderMenuItem(
          '/personnel', 
          'Personel', 
          <PeopleIcon 
            sx={{ fontSize: isSmallScreen ? 16 : 24 }} 
          />
        )}
        
        {renderMenuItem(
          '/shifts', 
          'Vardiya', 
          <AccessTimeIcon 
            sx={{ fontSize: isSmallScreen ? 16 : 24 }} 
          />
        )}
        
        {renderMenuItem(
          '/reports', 
          'Raporlar', 
          <AssessmentIcon 
            sx={{ fontSize: isSmallScreen ? 16 : 24 }} 
          />
        )}
        
        {renderMenuItem(
          '/messages', 
          'Mesajlar', 
          <MessageIcon 
            sx={{ fontSize: isSmallScreen ? 16 : 24 }} 
          />
        )}
        
        {renderMenuItem(
          '/surveys', 
          'Anketler', 
          <PollIcon 
            sx={{ fontSize: isSmallScreen ? 16 : 24 }} 
          />
        )}
        
        {renderMenuItem(
          '/branches', 
          'Şubeler', 
          <BusinessIcon 
            sx={{ fontSize: isSmallScreen ? 16 : 24 }} 
          />
        )}
      </MenuContainer>
      
      <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
      
      <Box sx={{ 
        mt: 'auto', 
        p: isSmallScreen ? 1 : 2, 
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
                  mb: 0.5,
                  fontSize: isSmallScreen ? '0.7rem' : 'inherit'
                }}
              >
                Powered by
              </Typography>
              <Typography 
                variant={isSmallScreen ? "subtitle1" : "h6"} 
                sx={{ 
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: isSmallScreen ? '1rem' : 'inherit',
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
              variant={isSmallScreen ? "h6" : "h5"} 
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