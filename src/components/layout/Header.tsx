import React, { useState, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Box, 
  Avatar, 
  Menu, 
  MenuItem, 
  styled, 
  Chip,
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../../contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import NotificationMenu from '../notifications/NotificationMenu';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: 'white',
  color: theme.palette.text.primary,
  boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.1)',
  position: 'fixed',
  width: 'calc(100% - 260px)',
  marginLeft: 260,
  zIndex: 99,
  [theme.breakpoints.down('md')]: {
    width: '100%',
    marginLeft: 0,
  },
}));

const MenuButton = styled(IconButton)(({ theme }) => ({
  marginRight: theme.spacing(2),
  display: 'none',
  [theme.breakpoints.down('md')]: {
    display: 'inline-flex',
  },
}));

const UserChip = styled(Chip)(({ theme }) => ({
  height: 42,
  borderRadius: 21,
  padding: theme.spacing(0.5, 1),
  backgroundColor: theme.palette.background.default,
  '& .MuiChip-avatar': {
    width: 32,
    height: 32,
  },
}));

interface HeaderProps {
  onToggleSidebar: () => void;
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const { currentUser, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const userSnapshot = await get(ref(database, `users/${currentUser.uid}`));
          if (userSnapshot.exists()) {
            const data = userSnapshot.val();
            setUserData({
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              email: data.email || '',
              companyName: data.companyName || '',
            });
          }
        } catch (error) {
          console.error("Kullanıcı bilgileri alınamadı:", error);
        }
      }
    };
    
    fetchUserData();
  }, [currentUser]);
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      handleMenuClose();
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };
  
  const userFullName = userData 
    ? `${userData.firstName} ${userData.lastName}` 
    : 'Kullanıcı';

  return (
    <StyledAppBar elevation={0}>
      <Toolbar>
        <MenuButton 
          edge="start" 
          color="inherit" 
          aria-label="menu" 
          onClick={onToggleSidebar}
        >
          <MenuIcon />
        </MenuButton>
        
        <Typography 
          variant={isMobile ? "h6" : "h5"}
          component="h1" 
          sx={{ 
            flexGrow: 1, 
            fontWeight: 'bold', 
            color: '#0D47A1',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {userData?.companyName || 'Görev Takip Sistemi'}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <NotificationMenu />
          
          <UserChip
            avatar={
              <Avatar 
                alt={userFullName}
                src="" 
                sx={{ bgcolor: '#0D47A1' }}
              >
                {userData?.firstName?.charAt(0)}
              </Avatar>
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {userFullName}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={handleMenuOpen}
                  sx={{ ml: 0.5, p: 0 }}
                >
                  <ExpandMoreIcon fontSize="small" />
                </IconButton>
              </Box>
            }
            onClick={handleMenuOpen}
            sx={{ cursor: 'pointer' }}
          />
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: { width: 200, mt: 1 }
            }}
          >
            <MenuItem onClick={() => {
              handleMenuClose();
              navigate('/profile');
            }}>
              Profil
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              Güvenli Çıkış
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </StyledAppBar>
  );
};

export default Header; 