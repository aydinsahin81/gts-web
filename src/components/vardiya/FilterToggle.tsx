import React from 'react';
import { Box, IconButton, Tooltip, Collapse, Paper } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

interface FilterToggleProps {
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const FilterToggle: React.FC<FilterToggleProps> = ({ open, onToggle, children }) => {
  return (
    <Box sx={{ mb: 2 }}>
      {/* Filtre düğmesi ve gösterge */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center',
          mb: 1
        }}
      >
        <Tooltip title={open ? "Filtreleri Gizle" : "Filtreleri Göster"}>
          <IconButton 
            onClick={onToggle}
            color="primary"
            size="small"
            sx={{ 
              bgcolor: open ? 'primary.light' : 'transparent',
              color: open ? 'white' : 'primary.main',
              '&:hover': { 
                bgcolor: open ? 'primary.main' : 'rgba(0, 0, 0, 0.04)' 
              } 
            }}
          >
            <FilterListIcon fontSize="small" sx={{ mr: 0.5 }} />
            {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Filtre içeriği */}
      <Collapse in={open} timeout="auto">
        <Paper 
          elevation={1} 
          sx={{ 
            p: 2, 
            mb: 2, 
            borderRadius: 1,
            borderLeft: '4px solid',
            borderColor: 'primary.main',
            bgcolor: 'background.default'
          }}
        >
          {children}
        </Paper>
      </Collapse>
    </Box>
  );
};

export default FilterToggle; 