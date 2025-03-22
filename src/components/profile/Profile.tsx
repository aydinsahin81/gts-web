import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Avatar,
  Divider,
  Card,
  CardContent,
  styled,
  Chip,
  CircularProgress,
  Grid
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';

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

// Profil üst bölümü için styled component
const ProfileHeader = styled(Box)(({ theme }) => ({
  width: '100%',
  backgroundColor: theme.palette.primary.main,
  padding: theme.spacing(4, 0),
  borderRadius: '0 0 30px 30px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  color: 'white',
  marginBottom: theme.spacing(4),
}));

// Profil info card için styled component
const InfoCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderRadius: 15,
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  overflow: 'visible',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
  }
}));

// Icon container styled component
const IconContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(1.5),
  backgroundColor: `${theme.palette.primary.main}10`,
  borderRadius: 10,
  marginRight: theme.spacing(2),
}));

const Profile: React.FC = () => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (currentUser) {
          const userRef = ref(database, `users/${currentUser.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            setUserData(snapshot.val());
          }
        }
      } catch (error) {
        console.error('Kullanıcı verileri yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!userData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Typography variant="h6" color="text.secondary">
          Kullanıcı bilgileri yüklenemedi.
        </Typography>
      </Box>
    );
  }

  const userInitials = `${userData.firstName?.charAt(0) || ''}${userData.lastName?.charAt(0) || ''}`;
  const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`;

  return (
    <ScrollableContent>
      <Container maxWidth="md">
        <Typography variant="h4" component="h1" fontWeight="bold" color="primary" gutterBottom sx={{ mb: 4 }}>
          Profil Bilgileri
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <InfoCard>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconContainer>
                    <PersonIcon fontSize="medium" color="primary" />
                  </IconContainer>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Ad Soyad
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
                      {fullName}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </InfoCard>
          </Grid>

          {userData.email && (
            <Grid item xs={12}>
              <InfoCard>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconContainer>
                      <EmailIcon fontSize="medium" color="primary" />
                    </IconContainer>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        E-posta
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
                        {userData.email}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </InfoCard>
            </Grid>
          )}

          {userData.companyName && (
            <Grid item xs={12}>
              <InfoCard>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconContainer>
                      <BusinessIcon fontSize="medium" color="primary" />
                    </IconContainer>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Şirket Adı
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
                        {userData.companyName}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </InfoCard>
            </Grid>
          )}

          {userData.employeeId && (
            <Grid item xs={12}>
              <InfoCard>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconContainer>
                      <BadgeIcon fontSize="medium" color="primary" />
                    </IconContainer>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Personel ID
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
                        {userData.employeeId}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </InfoCard>
            </Grid>
          )}
          
          {/* Ekstra kartlar - kaydırma efektini göstermek için */}
          <Grid item xs={12}>
            <InfoCard>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconContainer>
                    <PersonIcon fontSize="medium" color="primary" />
                  </IconContainer>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Kullanıcı ID
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
                      {userData.id || currentUser?.uid || ''}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </InfoCard>
          </Grid>
          
          {userData.createdAt && (
            <Grid item xs={12}>
              <InfoCard>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconContainer>
                      <PersonIcon fontSize="medium" color="primary" />
                    </IconContainer>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Kayıt Tarihi
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
                        {new Date(userData.createdAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </InfoCard>
            </Grid>
          )}
        </Grid>
      </Container>
    </ScrollableContent>
  );
};

export default Profile; 