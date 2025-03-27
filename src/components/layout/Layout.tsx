import React, { useState } from 'react';
import { Box, styled } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';

const MainContent = styled(Box)<{ isCollapsed: boolean }>(({ theme, isCollapsed }) => ({
  marginLeft: isCollapsed ? 70 : 260,
  width: `calc(100% - ${isCollapsed ? 70 : 260}px)`,
  minHeight: '100vh',
  backgroundColor: '#f5f5f5',
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
}));

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar 
        openMobile={mobileOpen} 
        onCloseMobile={handleDrawerToggle}
        onCollapse={handleCollapse}
      />
      <MainContent isCollapsed={isCollapsed}>
        <Header onToggleSidebar={handleDrawerToggle} isCollapsed={isCollapsed} />
        <Box component="main" sx={{ p: 3 }}>
          {children}
        </Box>
      </MainContent>
    </Box>
  );
};

export default Layout; 