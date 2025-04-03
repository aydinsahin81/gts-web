import React from 'react';
import { Box, Typography } from '@mui/material';

const PersonelListesi: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" component="h2" gutterBottom>
        Personel Listesi
      </Typography>
      <Typography variant="body1">
        Bu bileşen, vardiya sistemindeki personel listesini gösterecektir.
      </Typography>
    </Box>
  );
};

export default PersonelListesi; 