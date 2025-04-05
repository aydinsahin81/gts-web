import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const ManagerMessagesTab: React.FC = () => {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Mesajlar
      </Typography>
      
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Mesajlar modülü henüz geliştirme aşamasındadır.
        </Typography>
      </Paper>
    </Box>
  );
};

export default ManagerMessagesTab; 