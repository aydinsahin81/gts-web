import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  styled
} from '@mui/material';
import AndroidIcon from '@mui/icons-material/Android';
import AppleIcon from '@mui/icons-material/Apple';

const StoreButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: 12,
  fontSize: 14,
  width: '45%',
  textTransform: 'none',
}));

const StoreButtonsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

interface EmployeeModalProps {
  open: boolean;
  onClose: () => void;
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({ open, onClose }) => {
  const handleGooglePlayClick = () => {
    window.open('https://play.google.com/store/apps/details?id=com.mt_teknoloji.gts', '_blank');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          padding: 2,
        },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>
        Erişim Kısıtlaması
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1" paragraph align="center">
          Bu Sistem Sadece Yöneticiler İçindir.
        </Typography>
        <Typography variant="body1" paragraph align="center">
          Lütfen Mobil Uygulamayı Kullanınız.
        </Typography>
        
        <StoreButtonsContainer>
          <StoreButton
            variant="contained"
            color="success"
            startIcon={<AndroidIcon />}
            onClick={handleGooglePlayClick}
          >
            Google Play
          </StoreButton>
          
          <StoreButton
            variant="contained"
            startIcon={<AppleIcon />}
            disabled
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
      </DialogContent>
      
      <DialogActions sx={{ justifyContent: 'center' }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            borderRadius: 2,
            padding: '8px 24px',
            fontWeight: 'bold',
          }}
        >
          Tamam
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmployeeModal; 