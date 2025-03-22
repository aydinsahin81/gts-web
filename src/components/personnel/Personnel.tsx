import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Button,
  CircularProgress,
  styled,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  TaskAlt as TaskIcon,
  EmailOutlined as EmailIcon,
  PhoneAndroid as PhoneIcon
} from '@mui/icons-material';
import { ref, get, onValue, off } from 'firebase/database';
import { database, auth } from '../../firebase';

// Kaydırılabilir ana içerik için styled component
const ScrollableContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  overflowY: 'auto',
  height: 'calc(100vh - 64px)', // Header yüksekliğini çıkarıyoruz
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#888',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#555',
  },
}));

// Başlık alanı için styled component
const HeaderContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
}));

// Personel kartı için styled component
const PersonnelCard = styled(Card)(({ theme }) => ({
  borderRadius: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  marginBottom: theme.spacing(2),
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
    cursor: 'pointer'
  }
}));

const Personnel: React.FC = () => {
  // State tanımlamaları
  const [loading, setLoading] = useState(true);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Veri işleme fonksiyonu
  const processData = (personnelData: any) => {
    if (!personnelData) {
      setPersonnel([]);
      return;
    }

    // Personel listesini hazırla
    const personnelList = Object.entries(personnelData).map(([id, data]: [string, any]) => ({
      id,
      name: data.name || 'İsimsiz Personel',
      hasTask: data.hasTask || false,
      email: data.email || '',
      phone: data.phone || '',
      addedAt: data.addedAt || Date.now(),
    }));
    
    // Ekleme tarihine göre sırala (yeniden eskiye)
    const sortedPersonnel = [...personnelList].sort((a, b) => b.addedAt - a.addedAt);
    setPersonnel(sortedPersonnel);
  };

  // Component mount olduğunda veri yükleme
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Giriş yapmış kullanıcıyı kontrol et
        const user = auth.currentUser;
        if (!user) return;
        
        // Kullanıcı verilerini al ve şirket ID'sini bul
        const userSnapshot = await get(ref(database, `users/${user.uid}`));
        if (!userSnapshot.exists()) return;
        
        const userData = userSnapshot.val();
        const companyId = userData.companyId || null;
        setCompanyId(companyId);
        
        if (!companyId) {
          setLoading(false);
          return;
        }
        
        // Personel referansı oluştur
        const personnelRef = ref(database, `companies/${companyId}/personnel`);
        
        // Başlangıç verilerini al
        const personnelSnapshot = await get(personnelRef);
        const personnelData = personnelSnapshot.exists() ? personnelSnapshot.val() : {};
        
        // Verileri işle
        processData(personnelData);
        
        // Realtime güncellemeleri dinle
        onValue(personnelRef, (snapshot) => {
          const personnelData = snapshot.exists() ? snapshot.val() : {};
          processData(personnelData);
        });
      } catch (error) {
        console.error('Personel verilerini yüklerken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    // Cleanup fonksiyonu
    return () => {
      // Realtime listener'ları kaldır
      if (companyId) {
        off(ref(database, `companies/${companyId}/personnel`));
      }
    };
  }, []);

  return (
    <ScrollableContent>
      {/* Başlık ve Ekleme Butonu */}
      <HeaderContainer>
        <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
          Personeller
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          sx={{ borderRadius: 2 }}
          onClick={() => {
            // Bu butona henüz işlev eklemiyoruz
            console.log('Yeni Personel Ekle butonu tıklandı');
          }}
        >
          Yeni Personel Ekle
        </Button>
      </HeaderContainer>
      
      {/* Personel Listesi */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : personnel.length === 0 ? (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            mt: 4,
            p: 4,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1
          }}
        >
          <PersonIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Henüz personel bulunmuyor
          </Typography>
        </Box>
      ) : (
        <List>
          {personnel.map((person) => (
            <PersonnelCard key={person.id}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <ListItemAvatar>
                    <Avatar 
                      sx={{ 
                        width: 56, 
                        height: 56, 
                        bgcolor: 'primary.main',
                        fontSize: 24
                      }}
                    >
                      {person.name.substring(0, 1).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <Box sx={{ ml: 2, flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" fontWeight="bold">
                        {person.name}
                      </Typography>
                      <Chip
                        label={person.hasTask ? 'Görev Atanmış' : 'Müsait'}
                        size="small"
                        color={person.hasTask ? 'primary' : 'success'}
                        sx={{ fontWeight: 'medium' }}
                      />
                    </Box>
                    
                    {person.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {person.email}
                        </Typography>
                      </Box>
                    )}
                    
                    {person.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {person.phone}
                        </Typography>
                      </Box>
                    )}
                    
                    {person.hasTask && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <TaskIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="body2" color="primary">
                          Aktif görevleri var
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </PersonnelCard>
          ))}
        </List>
      )}
    </ScrollableContent>
  );
};

export default Personnel; 