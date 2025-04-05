import React from 'react';
import ManagerDashboard from '../components/manager/ManagerDashboard';
import { Box } from '@mui/material';

const ManagerPage: React.FC = () => {
  return (
    <Box sx={{ display: 'flex' }}>
      <ManagerDashboard />
    </Box>
  );
};

export default ManagerPage; 