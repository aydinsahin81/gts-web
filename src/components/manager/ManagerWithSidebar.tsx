import React, { useState } from 'react';
import { Box, Paper, styled } from '@mui/material';
import ManagerSidebar from './ManagerSidebar';

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

const ManagerWithSidebar: React.FC = () => {
  const [activeComponent, setActiveComponent] = useState<React.ReactNode | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(260);

  // Tab değişikliğini handle et
  const handleTabChange = (component: React.ReactNode) => {
    setActiveComponent(component);
  };

  // Sidebar daraltma/genişletmeyi handle et
  const handleSidebarCollapse = (isCollapsed: boolean) => {
    setSidebarWidth(isCollapsed ? 70 : 260);
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
          {activeComponent}
        </Paper>
      </ContentContainer>
    </MainContainer>
  );
};

export default ManagerWithSidebar; 