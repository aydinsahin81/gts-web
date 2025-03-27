import React, { useState, useEffect, useCallback } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  CircularProgress,
  styled,
  Chip
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import NotificationService, { Notification, Personnel } from '../../services/NotificationService';
import { useAuth } from '../../contexts/AuthContext';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../../firebase';

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#0D47A1',
    color: 'white',
  },
}));

const NotificationContainer = styled(Box)(({ theme }) => ({
  width: 400,
  maxHeight: 500,
  overflow: 'auto',
  padding: 0,
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '8px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#bbb',
    borderRadius: '8px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#888',
  },
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
      return 'success.light'; // Yeşil
    case 'pending':
      return 'warning.light'; // Turuncu
    default:
      return 'success.light'; // Varsayılan yeşil
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
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [viewedNotifications, setViewedNotifications] = useState<Set<string>>(() => {
    // localStorage'dan okundu bildirimleri al
    const saved = localStorage.getItem('viewedNotifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [newReadNotifications, setNewReadNotifications] = useState<string[]>([]);
  const { currentUser } = useAuth();
  
  // Okundu bildirimleri localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('viewedNotifications', JSON.stringify(Array.from(viewedNotifications)));
  }, [viewedNotifications]);
  
  // Bildirime tıklandığında okundu olarak işaretle
  const handleNotificationClick = (notificationId: string) => {
    setViewedNotifications(prev => {
      const newSet = new Set(prev);
      newSet.add(notificationId);
      return newSet;
    });
  };
  
  // Menüyü açma/kapama
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    loadNotifications();
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
    setNewReadNotifications([]);
  };
  
  // Personel bilgilerini getir
  const loadPersonnel = useCallback(async (companyId: string) => {
    try {
      const personnelList = await NotificationService.getAllPersonnel(companyId);
      setPersonnel(personnelList);
    } catch (error) {
      console.error('Personel bilgileri yüklenirken hata:', error);
    }
  }, []);
  
  // Alıcı personel adlarını al
  const getPersonNames = useCallback((personIds: string[]) => {
    if (!personIds || personIds.length === 0) return "Alıcı yok";
    
    const names = personIds.map(id => {
      const person = personnel.find(p => p.id === id);
      return person ? `${person.firstName} ${person.lastName}` : "Bilinmeyen Personel";
    });
    
    return names.join(", ");
  }, [personnel]);
  
  // Bildirimleri yükle
  const loadNotifications = useCallback(async () => {
    if (!currentUser || !companyId) return;
    
    setLoading(true);
    try {
      const recentNotifications = await NotificationService.getRecentNotifications(companyId, 20);
      setNotifications(recentNotifications);
      
      // Sadece görülmemiş bildirimleri say
      const newCount = recentNotifications.filter(n => {
        return n.status === 'sent' && 
               (!n.read || n.read.length === 0) && 
               !viewedNotifications.has(n.id);
      }).length;
      
      setUnreadCount(newCount);
    } catch (error) {
      console.error('Bildirimler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, companyId, viewedNotifications]);
  
  // Bildirimlerdeki değişiklikleri dinle
  const setupNotificationListener = useCallback((companyId: string) => {
    const notificationsRef = ref(database, `companies/${companyId}/notifications`);
    
    onValue(notificationsRef, (snapshot) => {
      if (!snapshot.exists()) return;
      
      const notificationsData = snapshot.val();
      const notificationsList: Notification[] = [];
      let newUnreadCount = 0;
      const newReadNotificationsIds: string[] = [];
      
      Object.entries(notificationsData).forEach(([id, data]: [string, any]) => {
        const notification = {
          id,
          ...data
        };
        
        notificationsList.push(notification);
        
        // Sadece görülmemiş bildirimleri say
        if (notification.status === 'sent' && 
            (!notification.read || notification.read.length === 0) && 
            !viewedNotifications.has(id)) {
          newUnreadCount++;
        }
        
        // Okunma durumunu takip et
        if (notification.read && notification.read.length > 0) {
          // Eğer bildirim daha önce görülmemişse ve yeni okuyanlar varsa
          if (!viewedNotifications.has(id)) {
            newReadNotificationsIds.push(id);
            newUnreadCount++;
          }
        }
      });
      
      notificationsList.sort((a, b) => b.createdAt - a.createdAt);
      setNotifications(notificationsList.slice(0, 20));
      setUnreadCount(newUnreadCount);
      
      setNewReadNotifications(prevIds => {
        const allIds = new Set([...prevIds, ...newReadNotificationsIds]);
        return Array.from(allIds);
      });
    });
    
    return () => {
      off(notificationsRef);
    };
  }, [viewedNotifications]);
  
  // Bildirim servisi başlatma ve dinleme
  useEffect(() => {
    let notificationCleanup: (() => void) | undefined;
    let processingCleanup: (() => void) | undefined;
    
    const setupNotifications = async () => {
      if (!currentUser) return;
      
      try {
        // Kullanıcının şirket ID'sini al
        const userCompanyId = await NotificationService.getCurrentUserCompany(currentUser.uid);
        if (!userCompanyId) return;
        
        setCompanyId(userCompanyId);
        
        // Personel bilgilerini yükle
        await loadPersonnel(userCompanyId);
        
        // Bildirimleri yükle
        await loadNotifications();
        
        // Bildirim işleme servisini başlat (1 dakikada bir kontrol et)
        processingCleanup = NotificationService.startNotificationProcessing(userCompanyId, 1);
        
        // Bildirim değişikliklerini dinle
        notificationCleanup = setupNotificationListener(userCompanyId);
        
      } catch (error) {
        console.error('Bildirim servisi başlatma hatası:', error);
      }
    };
    
    setupNotifications();
    
    // Temizleme işlevi
    return () => {
      if (processingCleanup) {
        processingCleanup();
      }
      if (notificationCleanup) {
        notificationCleanup();
      }
    };
  }, [currentUser, loadNotifications, loadPersonnel, setupNotificationListener]);
  
  return (
    <>
      <IconButton 
        color="inherit" 
        onClick={handleMenuOpen}
        sx={{ marginRight: 2 }}
      >
        <StyledBadge badgeContent={unreadCount > 0 ? unreadCount : null} max={99}>
          <NotificationsIcon />
        </StyledBadge>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { width: 400, maxHeight: 600, overflow: 'hidden' }
        }}
      >
        <NotificationHeader>
          <Typography variant="subtitle1" fontWeight="bold">
            Bildirimler
          </Typography>
          {unreadCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              {unreadCount} yeni bildirim
            </Typography>
          )}
        </NotificationHeader>
        
        <NotificationContainer>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={32} />
            </Box>
          ) : notifications.length > 0 ? (
            <List disablePadding>
              {notifications.map((notification) => {
                // Okundu bilgisi kontrolü
                const isReadByAnyone = notification.read && notification.read.length > 0;
                const readByNames = isReadByAnyone && notification.read 
                  ? getPersonNames(notification.read)
                  : "";
                
                // Durum metni
                const statusText = notification.status === 'sent' 
                  ? 'Gönderildi'
                  : notification.status === 'pending' 
                    ? 'Beklemede' 
                    : 'Gönderildi';
                
                // Bu bildirimin okunma durumu yeni mi değişti?
                const hasNewReadStatus = newReadNotifications.includes(notification.id);
                
                return (
                  <React.Fragment key={notification.id}>
                    <NotificationItem
                      onClick={() => handleNotificationClick(notification.id)}
                      sx={{ 
                        borderLeft: '4px solid',
                        borderLeftColor: getStatusColor(notification.status),
                        backgroundColor: hasNewReadStatus 
                          ? 'rgba(25, 118, 210, 0.05)'
                          : isReadByAnyone 
                            ? 'rgba(0, 200, 0, 0.05)' 
                            : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ 
                          bgcolor: hasNewReadStatus
                            ? 'primary.main' // Yeni okunma durumu için mavi avatar
                            : isReadByAnyone 
                              ? 'success.main' 
                              : getStatusColor(notification.status),
                          color: 'white'
                        }}>
                          {hasNewReadStatus ? <MarkEmailReadIcon /> : (isReadByAnyone ? <MarkEmailReadIcon /> : <MarkEmailUnreadIcon />)}
                        </Avatar>
                      </ListItemAvatar>
                      
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {notification.title}
                              {hasNewReadStatus && (
                                <Chip 
                                  label="Yeni Okundu" 
                                  size="small" 
                                  color="primary" 
                                  sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                                />
                              )}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                              <Chip 
                                label={statusText} 
                                size="small" 
                                color={
                                  notification.status === 'sent' 
                                    ? 'success'
                                    : notification.status === 'pending' 
                                      ? 'warning' 
                                      : 'success'
                                }
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                              {isReadByAnyone && (
                                <Chip 
                                  label="Okundu" 
                                  size="small"
                                  color={hasNewReadStatus ? "primary" : "success"}
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(notification.createdAt)}
                              </Typography>
                            </Box>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.primary" sx={{ mt: 1 }}>
                              {notification.body}
                            </Typography>
                            
                            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                <strong>Alıcılar:</strong> {notification.recipients ? getPersonNames(notification.recipients) : "Alıcı belirtilmemiş"}
                              </Typography>
                              
                              {isReadByAnyone && (
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    display: 'block',
                                    color: hasNewReadStatus ? 'primary.main' : 'success.main',
                                    fontWeight: hasNewReadStatus ? 'bold' : 'normal'
                                  }}
                                >
                                  <strong>Okuyanlar:</strong> {readByNames}
                                </Typography>
                              )}
                              
                              {notification.readAt && (
                                <Typography variant="caption" color={hasNewReadStatus ? "primary" : "text.secondary"}>
                                  Okunma: {formatDate(notification.readAt)}
                                </Typography>
                              )}
                              
                              {notification.sentAt && (
                                <Typography variant="caption" color="text.secondary">
                                  İşlenme: {formatDate(notification.sentAt)}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        }
                      />
                    </NotificationItem>
                    <Divider component="li" />
                  </React.Fragment>
                );
              })}
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