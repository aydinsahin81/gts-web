import React from 'react';
import { Box, Typography } from '@mui/material';

const VardiyaListesi: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" component="h2" gutterBottom>
        Vardiya Listesi
      </Typography>
      <Typography variant="body1">
        Bu bileşen, personellerin vardiya listesini gösterecektir.
      </Typography>
    </Box>
  );
};

export default VardiyaListesi; 