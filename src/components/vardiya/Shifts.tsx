import React from 'react';
import { Box, Paper, Typography, Divider, CircularProgress } from '@mui/material';

const Shifts: React.FC = () => {
  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">
          Vardiya Yönetimi
        </Typography>
      </Box>
      <Divider sx={{ mb: 3 }} />
      
      <Box sx={{ p: 2 }}>
        <Typography variant="body1">
          Vardiya yönetim sistemi yapım aşamasındadır. Yakında kullanıma açılacaktır.
        </Typography>
      </Box>
    </Paper>
  );
};

export default Shifts; 