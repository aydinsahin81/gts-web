import React, { useState } from 'react';
import { Box, Paper, styled } from '@mui/material';
import ManagerSidebar from './ManagerSidebar';
// Gerçek sayfaları import et
import Tasks from '../tasks/Tasks';
import Personnel from '../personnel/Personnel';
import Shifts from '../vardiya/Shifts';
import Reports from '../reports/Reports';
import Messages from '../messages/Messages';
import SinglePersonMessage from '../messages/SinglePersonMessage';
import Surveys from '../../pages/Surveys';
import ManagerDashboard from '../dashboard/ManagerDashboard';
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

// BranchSurveys bileşeni tipi için detaylı tanımlama
interface UserDetails {
  branchesId?: string;
  companyId?: string;
  [key: string]: any;
}

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

// Şube personelini filtreleme bileşeni
const BranchPersonnel: React.FC = () => {
  const { userDetails } = useAuth();
  
  // Eğer kullanıcının şube bilgisi varsa, o şubeye ait personeli filtrele
  if (userDetails && userDetails.branchesId) {
    console.log("Personel görüntüleniyor, şube ID:", userDetails.branchesId);
    return <Personnel branchId={userDetails.branchesId} isManager={true} />;
  }
  
  // Şube bilgisi yoksa, tüm personeli göster (bu durum olmamalı)
  return <Personnel isManager={true} />;
};

// Şube vardiyalarını filtreleme bileşeni
const BranchShifts: React.FC = () => {
  const { userDetails } = useAuth();
  
  // Eğer kullanıcının şube bilgisi varsa, o şubeye ait vardiyaları filtrele
  if (userDetails && userDetails.branchesId) {
    console.log("Vardiya görüntüleniyor, şube ID:", userDetails.branchesId);
    return <Shifts branchId={userDetails.branchesId} isManager={true} />;
  }
  
  // Şube bilgisi yoksa, tüm vardiyaları göster (bu durum olmamalı)
  return <Shifts isManager={true} />;
};

// Şube raporlarını filtreleme bileşeni
const BranchReports: React.FC = () => {
  const { userDetails } = useAuth();
  
  // Eğer kullanıcının şube bilgisi varsa, o şubeye ait raporları filtrele
  if (userDetails && userDetails.branchesId) {
    console.log("Rapor görüntüleniyor, şube ID:", userDetails.branchesId);
    return <Reports branchId={userDetails.branchesId} isManager={true} />;
  }
  
  // Şube bilgisi yoksa, tüm raporları göster (bu durum olmamalı)
  return <Reports isManager={true} />;
};

// Şube mesajlarını filtreleme bileşeni
const BranchMessages: React.FC<{ userDetails: UserDetails | null }> = ({ userDetails }) => {
  return (
    <Messages isManager={true} branchId={userDetails?.branchesId} />
  );
};

// Şube anketlerini filtreleme bileşeni
const BranchSurveys: React.FC<{ userDetails: UserDetails | null }> = ({ userDetails }) => {
  return (
    <Surveys isManager={true} branchId={userDetails?.branchesId} />
  );
};

const ManagerWithSidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const { userDetails } = useAuth();

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
        return <ManagerDashboard />;
      case 'tasks':
        return <BranchTasks />;
      case 'personnel':
        return <BranchPersonnel />;
      case 'shifts':
        return <BranchShifts />;
      case 'reports':
        return <BranchReports />;
      case 'messages':
        return <BranchMessages userDetails={userDetails} />;
      case 'surveys':
        return <BranchSurveys userDetails={userDetails} />;
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