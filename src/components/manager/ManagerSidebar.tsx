import React, { useState, useEffect } from 'react';
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
  CircularProgress,
  Alert,
  Link,
  useTheme
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// İkonlar
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import MessageIcon from '@mui/icons-material/Message';
import PollIcon from '@mui/icons-material/Poll';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// Tab bileşenleri kaldırıldı

const SidebarContainer = styled(Box)<{ isCollapsed: boolean }>(({ theme, isCollapsed }) => ({
  width: isCollapsed ? 70 : 260,
  height: '100%',
  backgroundColor: '#102648',
  color: 'white',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  borderRadius: '10px 0 0 10px',
  boxShadow: '0 0 10px rgba(0,0,0,0.3)',
  flexShrink: 0,
  transition: theme.transitions.create(['width'], {
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

// Tab yapılandırma arayüzü
interface TabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: string;
  enabled: boolean;
}

interface ManagerSidebarProps {
  onTabChange: (component: string) => void;
  onCollapse: (isCollapsed: boolean) => void;
}

const ManagerSidebar: React.FC<ManagerSidebarProps> = ({ onTabChange, onCollapse }) => {
  const { currentUser, userDetails } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tabs, setTabs] = useState<TabConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const theme = useTheme();

  // İzinlere göre tab ayarlarını yükle
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        if (!isFirstLoad) return; // Sadece ilk yüklemede çalışsın
        
        setLoading(true);
        
        if (!currentUser || !userDetails || !userDetails.companyId) {
          setError('Kullanıcı veya şirket bilgisi bulunamadı.');
          setLoading(false);
          return;
        }
        
        // Tab konfigürasyonlarını oluştur (varsayılan olarak tümü devre dışı)
        const allTabs: TabConfig[] = [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: <DashboardIcon />,
            component: 'dashboard',
            enabled: false
          },
          {
            id: 'tasks',
            label: 'Görevler',
            icon: <AssignmentIcon />,
            component: 'tasks',
            enabled: false
          },
          {
            id: 'personnel',
            label: 'Personel',
            icon: <PeopleIcon />,
            component: 'personnel',
            enabled: false
          },
          {
            id: 'shifts',
            label: 'Vardiya',
            icon: <AccessTimeIcon />,
            component: 'shifts',
            enabled: false
          },
          {
            id: 'reports',
            label: 'Raporlar',
            icon: <AssessmentIcon />,
            component: 'reports',
            enabled: false
          },
          {
            id: 'messages',
            label: 'Mesajlar',
            icon: <MessageIcon />,
            component: 'messages',
            enabled: false
          },
          {
            id: 'surveys',
            label: 'Anketler',
            icon: <PollIcon />,
            component: 'surveys',
            enabled: false
          }
        ];
        
        // Yönetici izinlerini getir
        const permissionsRef = ref(database, `companies/${userDetails.companyId}/permissions/managers/${currentUser.uid}`);
        const snapshot = await get(permissionsRef);
        
        if (snapshot.exists()) {
          const permissions = snapshot.val();
          
          // İzinlere göre tabları güncelle
          const enabledTabs = allTabs.map(tab => ({
            ...tab,
            enabled: permissions[tab.id] === true
          }));
          
          // Sadece etkin tabları filtreleyerek ayarla
          const filteredTabs = enabledTabs.filter(tab => tab.enabled);
          
          if (filteredTabs.length > 0) {
            setTabs(filteredTabs);
            // İlk tab'ın içeriğini göster
            onTabChange(filteredTabs[0].component);
          } else {
            // Hiç etkin tab yoksa dashboard'u varsayılan olarak etkinleştir
            setTabs([allTabs[0]]);
            onTabChange(allTabs[0].component);
            setError('Size atanmış herhangi bir modül izni bulunmuyor. Varsayılan olarak Dashboard görüntüleniyor.');
          }
        } else {
          // İzinler bulunamadıysa, sadece dashboard'u etkinleştir
          setTabs([allTabs[0]]);
          onTabChange(allTabs[0].component);
          console.log('Yönetici izinleri bulunamadı, varsayılan olarak Dashboard etkinleştiriliyor.');
        }
        
        setIsFirstLoad(false);
        setLoading(false);
      } catch (error) {
        console.error('Yönetici izinleri alınırken hata:', error);
        setError('Yönetici izinleri yüklenirken bir hata oluştu.');
        
        // Hata durumunda varsayılan olarak dashboard'u göster
        const defaultTab = {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <DashboardIcon />,
          component: 'dashboard',
          enabled: true
        };
        
        setTabs([defaultTab]);
        onTabChange(defaultTab.component);
        setIsFirstLoad(false);
        setLoading(false);
      }
    };
    
    fetchPermissions();
  }, [currentUser, userDetails, onTabChange, isFirstLoad]);

  // Tab değişimini handle et
  const handleTabClick = (index: number) => {
    setActiveTabIndex(index);
    onTabChange(tabs[index].component);
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
        {isCollapsed ? (
          <Typography variant="h4" fontWeight="bold" color="primary">
            Y
          </Typography>
        ) : (
          <Typography variant="h6" fontWeight="bold" align="center">
            Yönetici Paneli
          </Typography>
        )}
      </Logo>
      
      {loading ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: 300,
          width: isCollapsed ? 70 : 260
        }}>
          <CircularProgress color="inherit" />
        </Box>
      ) : (
        <>
          {error && !isCollapsed && (
            <Alert severity="warning" sx={{ m: 2, fontSize: 12 }}>
              {error}
            </Alert>
          )}
          
          <MenuContainer>
            {tabs.map((tab, index) => (
              <MenuItem 
                key={tab.id}
                active={index === activeTabIndex} 
                onClick={() => handleTabClick(index)}
                isCollapsed={isCollapsed}
              >
                <ListItemIcon sx={{ minWidth: isCollapsed ? 'auto' : 40, color: 'white' }}>
                  {tab.icon}
                </ListItemIcon>
                {!isCollapsed && (
                  <ListItemText 
                    primary={tab.label} 
                    primaryTypographyProps={{ 
                      fontSize: 15,
                      fontWeight: index === activeTabIndex ? 'bold' : 'normal'
                    }} 
                  />
                )}
              </MenuItem>
            ))}
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
        </>
      )}
    </SidebarContainer>
  );
};

export default ManagerSidebar; 