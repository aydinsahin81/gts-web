import React, { useState } from 'react';
import { Box, Paper, styled } from '@mui/material';
import ManagerSidebar from './ManagerSidebar';
// Gerçek sayfaları import et
import Tasks from '../tasks/Tasks';
import { useAuth } from '../../contexts/AuthContext';

// İçerik alanını stilize et
const ContentContainer = styled(Box)<{ sidebarWidth: number }>(({ theme, sidebarWidth }) => ({
  flexGrow: 1,
  height: '100%',
  marginLeft: 2,
  width: `calc(100% - ${sidebarWidth + 8}px)`, // Sidebar genişliği + margin
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
}));

// Ana konteyner
const MainContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  width: '100%',
  height: 'calc(100vh - 180px)', // Header yüksekliğini çıkarıyoruz
  backgroundColor: 'transparent',
  overflow: 'hidden',
}));

// Şube görevlerini filtreleme bileşeni
const BranchTasks: React.FC = () => {
  const { userDetails } = useAuth();
  
  // Eğer kullanıcının şube bilgisi varsa, o şubeye ait görevleri filtrele
  if (userDetails && userDetails.branchesId) {
    return <Tasks branchId={userDetails.branchesId} isManager={true} />;
  }
  
  // Şube bilgisi yoksa, tüm görevleri göster (bu durum olmamalı)
  return <Tasks />;
};

const ManagerWithSidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarWidth, setSidebarWidth] = useState(260);

  // Tab değişikliğini handle et
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Sidebar daraltma/genişletmeyi handle et
  const handleSidebarCollapse = (isCollapsed: boolean) => {
    setSidebarWidth(isCollapsed ? 70 : 260);
  };

  // Aktif tab'a göre bileşeni render et
  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <div>Dashboard İçeriği Buraya Gelecek</div>;
      case 'tasks':
        return <BranchTasks />;
      case 'personnel':
        return <div>Personel İçeriği Buraya Gelecek</div>;
      case 'shifts':
        return <div>Vardiya İçeriği Buraya Gelecek</div>;
      case 'reports':
        return <div>Raporlar İçeriği Buraya Gelecek</div>;
      case 'messages':
        return <div>Mesajlar İçeriği Buraya Gelecek</div>;
      case 'surveys':
        return <div>Anketler İçeriği Buraya Gelecek</div>;
      default:
        return <div>Sayfa Bulunamadı</div>;
    }
  };

  return (
    <MainContainer>
      <ManagerSidebar onTabChange={handleTabChange} onCollapse={handleSidebarCollapse} />
      
      <ContentContainer sidebarWidth={sidebarWidth}>
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            height: '100%', 
            borderRadius: 2,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {renderActiveComponent()}
        </Paper>
      </ContentContainer>
    </MainContainer>
  );
};

export default ManagerWithSidebar; 