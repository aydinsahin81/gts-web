import React, { useState } from 'react';
import { Box, Paper, Typography, Divider, Tabs, Tab } from '@mui/material';
import PersonelListesi from './PersonelListesi';
import VardiyaListesi from './VardiyaListesi';
import GirisCikisRaporlari from './GirisCikisRaporlari';

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
    <Paper sx={{ p: 3, mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">
          Vardiya Yönetimi
        </Typography>
      </Box>
      <Divider sx={{ mb: 3 }} />
      
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={value} onChange={handleChange} aria-label="vardiya yönetim tabları">
            <Tab label="Personel Listesi" {...a11yProps(0)} />
            <Tab label="Vardiya Listesi" {...a11yProps(1)} />
            <Tab label="Giriş Çıkış Raporları" {...a11yProps(2)} />
          </Tabs>
        </Box>
        <TabPanel value={value} index={0}>
          <PersonelListesi />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <VardiyaListesi />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <GirisCikisRaporlari />
        </TabPanel>
      </Box>
    </Paper>
  );
};

export default Shifts; 