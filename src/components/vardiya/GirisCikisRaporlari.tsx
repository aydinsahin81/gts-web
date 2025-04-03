import React from 'react';
import { Box, Typography } from '@mui/material';

const GirisCikisRaporlari: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" component="h2" gutterBottom>
        Giriş Çıkış Raporları
      </Typography>
      <Typography variant="body1">
        Bu bileşen, personellerin giriş çıkış raporlarını gösterecektir.
      </Typography>
    </Box>
  );
};

export default GirisCikisRaporlari; 