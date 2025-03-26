import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Paper,
  IconButton,
  Divider,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import ShareIcon from '@mui/icons-material/Share';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../../contexts/AuthContext';
import { database } from '../../firebase';
import { ref, get } from 'firebase/database';
import html2canvas from 'html2canvas';

interface CompanyQRModalProps {
  open: boolean;
  onClose: () => void;
}

const CompanyQRModal: React.FC<CompanyQRModalProps> = ({ open, onClose }) => {
  const [companyId, setCompanyId] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    if (open && currentUser) {
      fetchCompanyInfo();
    }
  }, [open, currentUser]);

  const fetchCompanyInfo = async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      // Kullanıcının şirket ID'sini al
      const userRef = ref(database, `users/${currentUser.uid}`);
      const userSnapshot = await get(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        const userCompanyId = userData.companyId;

        if (userCompanyId) {
          setCompanyId(userCompanyId);

          // Şirket adını al
          const companyRef = ref(database, `companies/${userCompanyId}/info`);
          const companySnapshot = await get(companyRef);

          if (companySnapshot.exists()) {
            const companyData = companySnapshot.val();
            setCompanyName(companyData.name || 'Şirket');
          }
        } else {
          setError('Kullanıcının şirket bilgisi bulunamadı');
        }
      } else {
        setError('Kullanıcı bilgileri bulunamadı');
      }
    } catch (error) {
      console.error('Şirket bilgileri alınırken hata:', error);
      setError('Şirket bilgileri alınırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!qrContainerRef.current) return;

    try {
      const canvas = await html2canvas(qrContainerRef.current, {
        backgroundColor: '#FFFFFF',
        scale: 2, // Daha yüksek kalite için
      });

      const image = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = image;
      downloadLink.download = `${companyName}-QR-Kodu.png`;
      downloadLink.click();
    } catch (error) {
      console.error('QR kodu indirme hatası:', error);
    }
  };

  const handlePrint = async () => {
    if (!qrContainerRef.current) return;

    try {
      const canvas = await html2canvas(qrContainerRef.current, {
        backgroundColor: '#FFFFFF',
        scale: 2,
      });

      const image = canvas.toDataURL('image/png');

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Lütfen popup engelleyiciyi devre dışı bırakın ve tekrar deneyin');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Şirket QR Kodu Yazdır</title>
            <style>
              body { 
                margin: 0; 
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
              }
              img { max-width: 100%; }
              @media print {
                @page { margin: 0; }
                body { margin: 1cm; }
              }
            </style>
          </head>
          <body>
            <img src="${image}" />
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
    } catch (error) {
      console.error('QR kodu yazdırma hatası:', error);
    }
  };

  const handleShare = async () => {
    if (!qrContainerRef.current || !navigator.share) {
      alert('Paylaşım özelliği bu tarayıcıda desteklenmiyor');
      return;
    }

    try {
      const canvas = await html2canvas(qrContainerRef.current, {
        backgroundColor: '#FFFFFF',
        scale: 2,
      });

      const image = canvas.toDataURL('image/png');
      const blob = await (await fetch(image)).blob();
      const file = new File([blob], `${companyName}-QR-Kodu.png`, { type: 'image/png' });

      await navigator.share({
        title: `${companyName} Şirket QR Kodu`,
        text: 'Bu QR Kodunu Okutarak Şirketimize Personel Olarak Kayıt Olabilirsiniz',
        files: [file],
      });
    } catch (error: unknown) {
      console.error('QR kodu paylaşma hatası:', error);
      // Paylaşım iptal edildiğinde de hata fırlatır, bu normal bir durum
      if (error && typeof error === 'object' && 'name' in error && error.name !== 'AbortError') {
        alert('Paylaşım sırasında bir hata oluştu');
      }
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          padding: 2
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" component="div" fontWeight="bold">
          Şirket QR Kodu
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ textAlign: 'center', p: 4 }}>
            {error}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Paper 
              ref={qrContainerRef}
              elevation={0} 
              sx={{ 
                width: 320, 
                p: 4, 
                backgroundColor: 'white',
                borderRadius: 2,
                border: '1px solid #eee',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
            >
              <Box sx={{ mb: 3 }}>
                <QRCodeCanvas
                  value={companyId}
                  size={200}
                  level="H" // Yüksek hata düzeltme seviyesi
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  includeMargin={true}
                />
              </Box>
              
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                {companyName}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Bu QR Kodunu Okutarak Şirketimize<br />
                Personel Olarak Kayıt Olabilirsiniz
              </Typography>
            </Paper>
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
              >
                İndir
              </Button>
              
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
              >
                Yazdır
              </Button>
              
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<ShareIcon />}
                  onClick={handleShare}
                >
                  Paylaş
                </Button>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Kapat
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CompanyQRModal; 