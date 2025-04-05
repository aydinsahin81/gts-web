import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database, auth } from '../firebase';
import { styled } from '@mui/material/styles';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Container,
  Paper,
  InputAdornment,
  Snackbar,
  Alert,
  Divider
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import AndroidIcon from '@mui/icons-material/Android';
import AppleIcon from '@mui/icons-material/Apple';
import EmployeeModal from './EmployeeModal';

// Stil tanımlamaları
const LoginContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(to bottom, #0D47A1, #1976D2)',
  position: 'relative',
  padding: theme.spacing(4, 2),
  overflow: 'auto',
}));

const LoginForm = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3, 2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  borderRadius: 16,
  maxWidth: 400,
  width: '100%',
  margin: '0 auto',
}));

const Logo = styled('img')({
  width: 100,
  height: 100,
  borderRadius: 15,
  marginBottom: 16,
  objectFit: 'cover',
});

const StyledTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(1.5),
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
  },
}));

const LoginButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(1.5),
  marginBottom: theme.spacing(1.5),
  padding: theme.spacing(1.2),
  borderRadius: 12,
  fontWeight: 'bold',
  fontSize: 16,
  width: '100%',
  backgroundColor: '#0D47A1',
  '&:hover': {
    backgroundColor: '#0A3C87',
  },
}));

const StoreButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(0.5),
  padding: theme.spacing(0.8),
  borderRadius: 12,
  fontSize: 13,
  width: '45%',
  textTransform: 'none',
}));

const StoreButtonsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
  marginTop: theme.spacing(1),
}));

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGooglePlayClick = () => {
    window.open('https://play.google.com/store/apps/details?id=com.mt_teknoloji.gts', '_blank');
  };

  const handleCloseEmployeeModal = () => {
    setShowEmployeeModal(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Form doğrulama
    if (!email) {
      setError('Lütfen e-posta adresinizi girin');
      return;
    }
    
    if (!email.includes('@')) {
      setError('Geçerli bir e-posta adresi girin');
      return;
    }
    
    if (!password) {
      setError('Lütfen şifrenizi girin');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Firebase Authentication ile giriş yap
      const userCredential = await login(email, password);
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Giriş başarılı oldu ancak kullanıcı bilgileri alınamadı.');
      }
      
      // Kullanıcı verilerini veritabanından al
      const userSnapshot = await get(ref(database, `users/${user.uid}`));
      
      if (!userSnapshot.exists()) {
        // Kullanıcı veritabanında yoksa çıkış yap
        await auth.signOut();
        throw new Error('Kullanıcı profili bulunamadı. Lütfen yönetici ile iletişime geçin.');
      }
      
      const userData = userSnapshot.val();
      const role = userData.role || 'employee';
      
      // Kullanıcı rolü kontrolü ve yönlendirme
      if (role === 'admin') {
        // Admin kullanıcısını dashboard'a yönlendir
        navigate('/dashboard');
      } else if (role === 'manager') {
        // Manager kullanıcısını manager sayfasına yönlendir
        navigate('/manager');
      } else {
        // Diğer roller (employee vb) için modalı göster ve çıkış yap
        console.log('Personel girişi tespit edildi. Sadece yöneticiler ve şube yöneticileri web uygulamasına erişebilir.');
        
        // Personel girişi ise oturumu kapat
        await auth.signOut();
        
        // Personel modalını göster
        setShowEmployeeModal(true);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Giriş hatası:', err);
      
      let errorMessage = 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.';
      
      if (err.code) {
        switch (err.code) {
          case 'auth/user-not-found':
            errorMessage = 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Hatalı şifre girdiniz.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Geçersiz e-posta adresi.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'Bu kullanıcı hesabı devre dışı bırakılmış.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.';
            break;
          default:
            errorMessage = 'Giriş yapılamadı: ' + (err.message || err.toString());
            break;
        }
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginForm elevation={3}>
        <Logo src="/assets/gtslogo.jpg" alt="GTS Logo" />
        
        <Typography 
          variant="h5" 
          component="h1" 
          gutterBottom 
          sx={{ fontWeight: 'bold', textAlign: 'center', mb: 2 }}
        >
          Görev Takip Sistemi
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} width="100%">
          <StyledTextField
            variant="outlined"
            fullWidth
            id="email"
            label="E-posta"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          
          <StyledTextField
            variant="outlined"
            fullWidth
            name="password"
            label="Şifre"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          
          <LoginButton
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={loading}
            size="medium"
            sx={{ py: 1 }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Giriş Yap'}
          </LoginButton>

          <Button
            fullWidth
            variant="outlined"
            color="primary"
            sx={{ 
              mt: 1.5, 
              borderRadius: 3, 
              py: 1,
              fontWeight: 'bold',
              fontSize: 15,
              borderColor: '#0D47A1',
              color: '#0D47A1',
              '&:hover': {
                borderColor: '#0A3C87',
                backgroundColor: 'rgba(13, 71, 161, 0.04)',
              }
            }}
            onClick={() => navigate('/register')}
            size="medium"
          >
            Firma Kaydı Yapın
          </Button>

          <Typography 
            variant="body2" 
            align="center" 
            sx={{ mt: 1.5, mb: 1.5, fontSize: '0.8rem' }}
          >
            Personel kaydı için uygulamamızı indirmeniz gerekiyor
          </Typography>

          <StoreButtonsContainer>
            <StoreButton
              variant="contained"
              color="success"
              startIcon={<AndroidIcon fontSize="small" />}
              onClick={handleGooglePlayClick}
              size="small"
            >
              Google Play
            </StoreButton>
            
            <StoreButton
              variant="contained"
              startIcon={<AppleIcon fontSize="small" />}
              disabled
              size="small"
              sx={{
                backgroundColor: '#A0A0A0',
                '&:hover': {
                  backgroundColor: '#808080',
                },
              }}
            >
              App Store
            </StoreButton>
          </StoreButtonsContainer>
        </Box>
        
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setError('')} severity="error">
            {error}
          </Alert>
        </Snackbar>
      </LoginForm>

      {/* Personel Modalı */}
      <EmployeeModal 
        open={showEmployeeModal} 
        onClose={handleCloseEmployeeModal} 
      />
    </LoginContainer>
  );
};

export default Login;