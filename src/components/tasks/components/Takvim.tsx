import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface TakvimProps {
  companyId: string | null;
}

const Takvim: React.FC<TakvimProps> = ({ companyId }) => {
  return (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" align="center">
          Takvim İçeriği Burada Olacak
        </Typography>
      </Paper>
    </Box>
  );
};

export default Takvim; 