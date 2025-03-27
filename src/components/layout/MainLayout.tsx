import React, { useState } from 'react';
import { Box, styled, Drawer, useMediaQuery, useTheme } from '@mui/material';
import Sidebar from './Sidebar';
import Header from './Header';

const MainContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: '#f5f5f5',
}));

const ContentContainer = styled(Box)<{ isCollapsed: boolean }>(({ theme, isCollapsed }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  paddingTop: 88, // Header yüksekliği + ekstra padding
  marginLeft: isCollapsed ? 70 : 260, // Sidebar genişliği
  width: `calc(100% - ${isCollapsed ? 70 : 260}px)`,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  [theme.breakpoints.down('md')]: {
    marginLeft: 0,
    width: '100%',
  },
}));

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
  };
  
  return (
    <MainContainer>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar onCollapse={handleCollapse} />
      )}
      
      {/* Mobile Sidebar */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Daha iyi mobil performansı için
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: 260, boxSizing: 'border-box' },
        }}
      >
        <Sidebar 
          onCloseMobile={handleDrawerToggle} 
          onCollapse={handleCollapse}
        />
      </Drawer>
      
      {/* Header */}
      <Header onToggleSidebar={handleDrawerToggle} />
      
      {/* Main Content */}
      <ContentContainer isCollapsed={isCollapsed}>
        {children}
      </ContentContainer>
    </MainContainer>
  );
};

export default MainLayout; 