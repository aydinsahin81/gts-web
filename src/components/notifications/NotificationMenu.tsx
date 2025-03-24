import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  styled
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationService, { Notification } from '../../services/NotificationService';
import { useAuth } from '../../contexts/AuthContext';

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#0D47A1',
    color: 'white',
  },
}));

const NotificationContainer = styled(Box)(({ theme }) => ({
  width: 350,
  maxHeight: 400,
  overflow: 'auto',
  padding: 0,
}));

const NotificationHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: '#f5f5f5',
  borderBottom: '1px solid #e0e0e0',
  position: 'sticky',
  top: 0,
  zIndex: 1,
}));

const NotificationItem = styled(ListItem)(({ theme }) => ({
  borderBottom: '1px solid #f0f0f0',
  padding: theme.spacing(1.5, 2),
  '&:hover': {
    backgroundColor: '#f9f9f9',
  },
}));

const EmptyNotification = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));

// Bildirim durumuna göre renk belirleme
const getStatusColor = (status: string) => {
  switch (status) {
    case 'sent':
      return '#4caf50'; // Yeşil
    case 'failed':
      return '#f44336'; // Kırmızı
    default:
      return '#ff9800'; // Turuncu (beklemede)
  }
};

// Tarih formatı
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString('tr-TR', { 
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const NotificationMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentUser } = useAuth();
  
  // Menüyü açma/kapama
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    loadNotifications();
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Bildirimleri yükle
  const loadNotifications = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const companyId = await NotificationService.getCurrentUserCompany(currentUser.uid);
      if (companyId) {
        const recentNotifications = await NotificationService.getRecentNotifications(companyId, 10);
        setNotifications(recentNotifications);
        
        // Başarılı gönderilen bildirim sayısını hesapla
        const sentCount = recentNotifications.filter(n => n.status === 'sent').length;
        setUnreadCount(sentCount);
      }
    } catch (error) {
      console.error('Bildirimler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Bildirim servisi başlatma ve dinleme
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    const setupNotificationService = async () => {
      if (!currentUser) return;
      
      try {
        const companyId = await NotificationService.getCurrentUserCompany(currentUser.uid);
        if (companyId) {
          // Bildirim işleme servisini başlat (1 dakikada bir kontrol et)
          cleanup = NotificationService.startNotificationProcessing(companyId, 1);
          
          // Yeni bildirimler için abonelik
          const unsubscribe = NotificationService.onNewNotifications((newNotifications) => {
            setNotifications(prev => {
              // Yeni ve eski bildirimleri birleştir (tekrarları önleyerek)
              const combined = [...prev];
              
              newNotifications.forEach(newNotif => {
                const existingIndex = combined.findIndex(n => n.id === newNotif.id);
                if (existingIndex >= 0) {
                  combined[existingIndex] = newNotif;
                } else {
                  combined.unshift(newNotif);
                }
              });
              
              // Tarihe göre sırala
              return combined
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 10);
            });
            
            // Bildirim sayısını güncelle
            const sentCount = newNotifications.filter(n => n.status === 'sent').length;
            if (sentCount > 0) {
              setUnreadCount(prev => prev + sentCount);
            }
          });
          
          // İlk yükleme
          loadNotifications();
          
          // Temizleme fonksiyonunu güncelle
          const originalCleanup = cleanup;
          cleanup = () => {
            originalCleanup();
            unsubscribe();
          };
        }
      } catch (error) {
        console.error('Bildirim servisi başlatma hatası:', error);
      }
    };
    
    setupNotificationService();
    
    // Temizleme işlevi
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [currentUser]);
  
  return (
    <>
      <IconButton 
        color="inherit" 
        onClick={handleMenuOpen}
        sx={{ marginRight: 2 }}
      >
        <StyledBadge badgeContent={unreadCount} max={99}>
          <NotificationsIcon />
        </StyledBadge>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { width: 350, maxHeight: 500, overflow: 'auto' }
        }}
      >
        <NotificationHeader>
          <Typography variant="subtitle1" fontWeight="bold">
            Bildirimler
          </Typography>
        </NotificationHeader>
        
        <NotificationContainer>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={32} />
            </Box>
          ) : notifications.length > 0 ? (
            <List disablePadding>
              {notifications.map((notification) => (
                <NotificationItem key={notification.id} divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body1" fontWeight="medium">
                          {notification.title}
                        </Typography>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: getStatusColor(notification.status),
                            ml: 1
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary">
                          {notification.body}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(notification.createdAt)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {notification.recipients?.length || 0} alıcı
                          </Typography>
                        </Box>
                      </>
                    }
                  />
                </NotificationItem>
              ))}
            </List>
          ) : (
            <EmptyNotification>
              <Typography>Bildirim bulunmuyor</Typography>
            </EmptyNotification>
          )}
        </NotificationContainer>
      </Menu>
    </>
  );
};

export default NotificationMenu; 