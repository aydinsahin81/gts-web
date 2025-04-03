import React, { useState } from 'react';
import { Box, Paper, Typography, Divider, Tabs, Tab, styled } from '@mui/material';
import PersonelListesi from './PersonelListesi';
import VardiyaListesi from './VardiyaListesi';
import GirisCikisRaporlari from './GirisCikisRaporlari';

// Kaydırılabilir ana içerik için styled component
const ScrollableContent = styled(Box)(({ theme }) => ({
  height: 'calc(100vh - 180px)', // Header ve diğer öğeler için alan bırakıyoruz
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#888',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#555',
  },
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vardiya-tabpanel-${index}`}
      aria-labelledby={`vardiya-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `vardiya-tab-${index}`,
    'aria-controls': `vardiya-tabpanel-${index}`,
  };
}

const Shifts: React.FC = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Paper sx={{ p: 3, mt: 2, height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">
          Vardiya Yönetimi
        </Typography>
      </Box>
      <Divider sx={{ mb: 3 }} />
      
      <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={value} onChange={handleChange} aria-label="vardiya yönetim tabları">
            <Tab label="Personel Listesi" {...a11yProps(0)} />
            <Tab label="Vardiya Listesi" {...a11yProps(1)} />
            <Tab label="Giriş Çıkış Raporları" {...a11yProps(2)} />
          </Tabs>
        </Box>
        <ScrollableContent>
          <TabPanel value={value} index={0}>
            <PersonelListesi />
          </TabPanel>
          <TabPanel value={value} index={1}>
            <VardiyaListesi />
          </TabPanel>
          <TabPanel value={value} index={2}>
            <GirisCikisRaporlari />
          </TabPanel>
        </ScrollableContent>
      </Box>
    </Paper>
  );
};

export default Shifts; 