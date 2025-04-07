import React from 'react';
import { Box, Typography } from '@mui/material';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = '#102648' }) => {
  return (
    <Box sx={{ 
      p: 2, 
      borderRadius: 2,
      bgcolor: 'background.paper',
      boxShadow: 1,
      border: `1px solid ${color}20`,
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: 2,
        borderColor: color
      }
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ 
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: '50%',
          bgcolor: `${color}10`,
          mr: 1
        }}>
          {icon}
        </Box>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="h6" sx={{ color: color, fontWeight: 'bold' }}>
        {value}
      </Typography>
    </Box>
  );
};

export default StatCard; 