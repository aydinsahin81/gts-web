import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const ManagerShiftsTab: React.FC = () => {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Vardiya Yönetimi
      </Typography>
      
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Vardiya yönetim modülü henüz geliştirme aşamasındadır.
        </Typography>
      </Paper>
    </Box>
  );
};

export default ManagerShiftsTab; 