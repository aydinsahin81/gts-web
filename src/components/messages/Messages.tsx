import React, { useState, useEffect } from 'react';
import { 
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider,
  styled
} from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PersonIcon from '@mui/icons-material/Person';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import BulkMessage from './BulkMessage';
import SinglePersonMessage from './SinglePersonMessage';
import PerformanceMessage from './PerformanceMessage';
import UnacceptedTasksMessage from './UnacceptedTasksMessage';
import { useLocation } from 'react-router-dom';

// Sayfa başlığı için styled component
const PageTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 600,
  color: theme.palette.primary.main,
  marginBottom: theme.spacing(3),
}));

// Kaydırılabilir içerik için styled component
const ScrollableContent = styled(Box)(({ theme }) => ({
  height: 'calc(100vh - 140px)', // Üst kısımdaki başlıkları hesaba katarak yükseklik ayarı
  overflowY: 'auto',
  padding: theme.spacing(2),
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '8px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#bbb',
    borderRadius: '8px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#888',
  },
}));

// Tab içeriği için container
const TabPanel = (props: {
  children?: React.ReactNode;
  index: number;
  value: number;
}) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`message-tabpanel-${index}`}
      aria-labelledby={`message-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Tab özellikleri
function a11yProps(index: number) {
  return {
    id: `message-tab-${index}`,
    'aria-controls': `message-tabpanel-${index}`,
  };
}

const Messages: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const location = useLocation();
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null);

  // URL'den personnelId parametresini kontrol et
  useEffect(() => {
    // URL'den parametreleri al
    const searchParams = new URLSearchParams(location.search);
    const personnelId = searchParams.get('personnelId');
    
    // Eğer personnelId parametresi varsa ve değeri boş değilse
    if (personnelId) {
      // Tek Personel sekmesini seç (index 1)
      setTabValue(1);
      // Personel ID'sini belirle
      setSelectedPersonnelId(personnelId);
    }
  }, [location.search]);

  // Tab değişimi
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Eğer başka sekmeye geçilirse, seçili personeli sıfırla
    if (newValue !== 1) {
      setSelectedPersonnelId(null);
    }
  };

  return (
    <ScrollableContent>
      <PageTitle variant="h1">
        Mesajlar
      </PageTitle>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Personellerinize bildirim göndermek için aşağıdaki seçeneklerden birini kullanabilirsiniz.
      </Typography>
      
      <Paper elevation={0} sx={{ borderRadius: 2, mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="message types"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': { 
              py: 2,
              minHeight: '64px'
            } 
          }}
        >
          <Tab 
            icon={<PeopleAltIcon />} 
            label="Toplu Mesaj" 
            iconPosition="start"
            {...a11yProps(0)} 
          />
          <Tab 
            icon={<PersonIcon />} 
            label="Tek Personel" 
            iconPosition="start"
            {...a11yProps(1)} 
          />
          <Tab 
            icon={<SentimentVeryDissatisfiedIcon />} 
            label="Kötü Performans" 
            iconPosition="start"
            {...a11yProps(2)} 
          />
          <Tab 
            icon={<EmojiEventsIcon />} 
            label="İyi Performans" 
            iconPosition="start"
            {...a11yProps(3)} 
          />
          <Tab 
            icon={<AssignmentLateIcon />} 
            label="Görev Kabul Etmeyen" 
            iconPosition="start"
            {...a11yProps(4)} 
          />
        </Tabs>
        
        {/* Tab İçerikleri */}
        <TabPanel value={tabValue} index={0}>
          <BulkMessage />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <SinglePersonMessage personnelId={selectedPersonnelId} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <PerformanceMessage isGoodPerformance={false} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <PerformanceMessage isGoodPerformance={true} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={4}>
          <UnacceptedTasksMessage />
        </TabPanel>
      </Paper>
    </ScrollableContent>
  );
};

export default Messages; 