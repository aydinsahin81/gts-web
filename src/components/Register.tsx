import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { ref, set, push, serverTimestamp } from 'firebase/database';
import { database, auth } from '../firebase';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Paper,
  InputAdornment,
  Snackbar,
  Alert,
  Container
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';

// Stil tanımlamaları
const RegisterContainer = styled(Box)(({ theme }) => ({
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

const RegisterForm = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3, 2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  borderRadius: 16,
  maxWidth: 450,
  width: '100%',
  margin: '0 auto',
  position: 'relative',
}));

const Logo = styled('img')({
  width: 90,
  height: 90,
  borderRadius: 15,
  marginBottom: 12,
  objectFit: 'cover',
});

const StyledTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(1.5),
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
  },
}));

const RegisterButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
  padding: theme.spacing(1.5),
  borderRadius: 12,
  fontWeight: 'bold',
  fontSize: 16,
  width: '100%',
  backgroundColor: '#0D47A1',
  '&:hover': {
    backgroundColor: '#0A3C87',
  },
}));

const BackButton = styled(Button)(({ theme }) => ({
  position: 'absolute',
  top: 16,
  left: 16,
  borderRadius: 12,
  padding: theme.spacing(1, 2),
  backgroundColor: 'rgba(13, 71, 161, 0.1)',
  color: '#0D47A1',
  '&:hover': {
    backgroundColor: 'rgba(13, 71, 161, 0.2)',
  },
}));

const Register: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Form doğrulama
    if (!companyName) {
      setError('Lütfen firma adını girin');
      return;
    }

    if (!firstName) {
      setError('Lütfen adınızı girin');
      return;
    }

    if (!lastName) {
      setError('Lütfen soyadınızı girin');
      return;
    }
    
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

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Kayıt işlemi başlıyor...');
      
      // E-posta kontrolü
      console.log('E-posta kontrolü yapılıyor...');
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods && methods.length > 0) {
          throw 'Bu e-posta adresi zaten kullanımda. Lütfen farklı bir e-posta adresi kullanın.';
        }
        console.log('E-posta kullanılabilir.');
      } catch (e) {
        if (typeof e === 'string') {
          throw e;
        } else {
          console.log('E-posta kontrolü sırasında hata:', e);
        }
      }

      // Email/şifre ile kullanıcı oluştur
      console.log('Firebase Auth ile kullanıcı oluşturuluyor...');
      let userCredential;
      let userId;
      
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        userId = userCredential.user?.uid;
        console.log('Firebase Auth kullanıcısı oluşturuldu:', userId);
      } catch (authError) {
        console.log('Firebase Auth hatası:', authError);
        throw 'Kullanıcı oluşturulurken bir hata oluştu.';
      }
      
      // Kullanıcı ID'si yoksa hata fırlat
      if (!userId) {
        throw 'Kullanıcı oluşturulamadı';
      }

      // Yeni şirket oluştur
      console.log('Şirket oluşturuluyor...');
      const companyRef = push(ref(database, 'companies'));
      const companyId = companyRef.key;
      
      if (!companyId) {
        throw 'Şirket ID oluşturulamadı';
      }
      
      // Şirket bilgilerini kaydet
      const companyData = {
        info: {
          admin: userId,
          createdAt: serverTimestamp(),
          maxPersonnel: 5, // Default 5 personel
          name: companyName.trim(),
        }
      };
      
      await set(companyRef, companyData);
      console.log('Şirket oluşturuldu:', companyId);

      console.log('Kullanıcı verileri kaydediliyor...');
      // Kullanıcı verilerini kaydet (şirket ID'sini ekleyerek)
      const userData = {
        id: userId,
        email: email.trim(),
        companyId: companyId,
        companyName: companyName.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: 'admin',
        createdAt: serverTimestamp(),
      };

      await set(ref(database, `users/${userId}`), userData);
      console.log('Kayıt başarılı!');
      
      setSuccess('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz.');
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err: any) {
      console.error('Hata oluştu:', err);
      
      let errorMessage = 'Kayıt yapılamadı.';
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err.code) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'Bu e-posta adresi zaten kullanımda.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Geçersiz e-posta adresi.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Şifre çok zayıf. Lütfen daha güçlü bir şifre seçin.';
            break;
          default:
            errorMessage = 'Kayıt yapılamadı: ' + (err.message || err.toString());
            break;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RegisterContainer>
      <RegisterForm elevation={3}>
        <BackButton 
          startIcon={<KeyboardBackspaceIcon />}
          onClick={() => navigate('/login')}
          size="small"
        >
          Geri
        </BackButton>
        
        <Logo src="/assets/gtslogo.jpg" alt="GTS Logo" />
        
        <Typography 
          variant="h5" 
          component="h1" 
          gutterBottom 
          sx={{ fontWeight: 'bold', textAlign: 'center', mb: 0.5 }}
        >
          Firma Kayıt
        </Typography>
        
        <Typography 
          variant="body2" 
          sx={{ textAlign: 'center', mb: 2, color: 'text.secondary', fontSize: '0.8rem' }}
        >
          Görev Takip Sistemine hoşgeldiniz. Lütfen firma bilgilerinizi girin.
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} width="100%">
          {/* Firma Adı */}
          <StyledTextField
            variant="outlined"
            fullWidth
            id="companyName"
            label="Firma Adı"
            name="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <BusinessIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          
          {/* Ad */}
          <StyledTextField
            variant="outlined"
            fullWidth
            id="firstName"
            label="Ad"
            name="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          
          {/* Soyad */}
          <StyledTextField
            variant="outlined"
            fullWidth
            id="lastName"
            label="Soyad"
            name="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          
          {/* E-posta */}
          <StyledTextField
            variant="outlined"
            fullWidth
            id="email"
            label="E-posta"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          
          {/* Şifre */}
          <StyledTextField
            variant="outlined"
            fullWidth
            name="password"
            label="Şifre"
            type="password"
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          
          {/* Şifre Tekrar */}
          <StyledTextField
            variant="outlined"
            fullWidth
            name="confirmPassword"
            label="Şifre Tekrar"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          
          <RegisterButton
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={loading}
            size="medium"
            sx={{ py: 1 }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Kayıt Ol'}
          </RegisterButton>
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
        
        <Snackbar 
          open={!!success} 
          autoHideDuration={6000} 
          onClose={() => setSuccess('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setSuccess('')} severity="success">
            {success}
          </Alert>
        </Snackbar>
      </RegisterForm>
    </RegisterContainer>
  );
};

export default Register; 