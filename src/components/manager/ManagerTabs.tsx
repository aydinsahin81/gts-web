import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Typography, CircularProgress, Alert } from '@mui/material';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import ManagerDashboardTab from './tabs/ManagerDashboardTab';
import ManagerTasksTab from './tabs/ManagerTasksTab';
import ManagerPersonnelTab from './tabs/ManagerPersonnelTab';
import ManagerShiftsTab from './tabs/ManagerShiftsTab';
import ManagerReportsTab from './tabs/ManagerReportsTab';
import ManagerMessagesTab from './tabs/ManagerMessagesTab';
import ManagerSurveysTab from './tabs/ManagerSurveysTab';

// TabPanel bileşeni
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`manager-tabpanel-${index}`}
      aria-labelledby={`manager-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Tab özelliğini döndüren yardımcı fonksiyon
const a11yProps = (index: number) => {
  return {
    id: `manager-tab-${index}`,
    'aria-controls': `manager-tabpanel-${index}`,
  };
};

// Tab arayüzü
interface TabConfig {
  id: string;
  label: string;
  component: React.ReactNode;
  enabled: boolean;
}

const ManagerTabs: React.FC = () => {
  const { currentUser, userDetails } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tabs, setTabs] = useState<TabConfig[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
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
            component: <ManagerDashboardTab />,
            enabled: false
          },
          {
            id: 'tasks',
            label: 'Görevler',
            component: <ManagerTasksTab />,
            enabled: false
          },
          {
            id: 'personnel',
            label: 'Personel',
            component: <ManagerPersonnelTab />,
            enabled: false
          },
          {
            id: 'shifts',
            label: 'Vardiya',
            component: <ManagerShiftsTab />,
            enabled: false
          },
          {
            id: 'reports',
            label: 'Raporlar',
            component: <ManagerReportsTab />,
            enabled: false
          },
          {
            id: 'messages',
            label: 'Mesajlar',
            component: <ManagerMessagesTab />,
            enabled: false
          },
          {
            id: 'surveys',
            label: 'Anketler',
            component: <ManagerSurveysTab />,
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
          } else {
            // Hiç etkin tab yoksa dashboard'u varsayılan olarak etkinleştir
            setTabs([allTabs[0]]);
            setError('Size atanmış herhangi bir modül izni bulunmuyor. Varsayılan olarak Dashboard görüntüleniyor.');
          }
        } else {
          // İzinler bulunamadıysa, sadece dashboard'u etkinleştir
          setTabs([allTabs[0]]);
          console.log('Yönetici izinleri bulunamadı, varsayılan olarak Dashboard etkinleştiriliyor.');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Yönetici izinleri alınırken hata:', error);
        setError('Yönetici izinleri yüklenirken bir hata oluştu.');
        
        // Hata durumunda varsayılan olarak dashboard'u göster
        setTabs([{
          id: 'dashboard',
          label: 'Dashboard',
          component: <ManagerDashboardTab />,
          enabled: true
        }]);
        
        setLoading(false);
      }
    };
    
    fetchPermissions();
  }, [currentUser, userDetails]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab, index) => (
            <Tab key={tab.id} label={tab.label} {...a11yProps(index)} />
          ))}
        </Tabs>
      </Box>
      
      {tabs.map((tab, index) => (
        <TabPanel key={tab.id} value={tabValue} index={index}>
          {tab.component}
        </TabPanel>
      ))}
    </Box>
  );
};

export default ManagerTabs; 