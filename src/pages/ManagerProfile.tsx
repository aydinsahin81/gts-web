import React from 'react';
import ManagerProfile from '../components/manager/ManagerProfile';
import { Box } from '@mui/material';

const ManagerProfilePage: React.FC = () => {
  return (
    <Box sx={{ display: 'flex' }}>
      <ManagerProfile />
    </Box>
  );
};

export default ManagerProfilePage; 