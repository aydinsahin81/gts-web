import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import BranchList from './components/BranchList';
import ReservationList from './components/ReservationList';
import ReservationApplications from './components/ReservationApplications';
import EntryExitLog from './components/EntryExitLog';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reservations-tabpanel-${index}`}
      aria-labelledby={`reservations-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `reservations-tab-${index}`,
    'aria-controls': `reservations-tabpanel-${index}`,
  };
};

const Reservations: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: 'calc(100vh - 80px)', // Ana konteyner yüksekliği (üst kısımda navbar için boşluk bırakıldı)
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden' // Dış konteyner taşması engellendi
    }}>
      <Paper sx={{ 
        borderRadius: '8px', 
        boxShadow: 2,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden' // Paper taşması engellendi
      }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="Rezervasyon Sekmeleri"
            variant="scrollable"
            scrollButtons="auto"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="Şubeler" {...a11yProps(0)} />
            <Tab label="Rezervasyon Listesi" {...a11yProps(1)} />
            <Tab label="Rezervasyon Başvuruları" {...a11yProps(2)} />
            <Tab label="Giriş Çıkış Kaydı" {...a11yProps(3)} />
          </Tabs>
        </Box>
        
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'auto', // İçerik taştığında kaydırma çubuğu ekler
          height: 'calc(100% - 48px)' // Tab yüksekliğini çıkararak kalan alanı hesapla
        }}>
          <TabPanel value={tabValue} index={0}>
            <BranchList />
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <ReservationList />
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <ReservationApplications />
          </TabPanel>
          
          <TabPanel value={tabValue} index={3}>
            <EntryExitLog />
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
};

export default Reservations; 