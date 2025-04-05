import React from 'react';
import ManagerProfile from '../components/manager/ManagerProfile';
import { Box } from '@mui/material';

const ManagerProfilePage: React.FC = () => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100vh'
    }}>
      <ManagerProfile />
    </Box>
  );
};

export default ManagerProfilePage; 