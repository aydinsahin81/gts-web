import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  IconButton, 
  Typography, 
  Box,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  Avatar,
  Paper,
  Collapse
} from '@mui/material';
import { 
  Close as CloseIcon,
  Today as TodayIcon,
  DateRange as WeekIcon,
  CalendarMonth as MonthIcon,
  Check as CheckIcon,
  PlayArrow as PlayArrowIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// Başlık alanı için styled component
const HeaderContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(0, 2),
}));

// Sekme içeriği için container
const TabContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  maxHeight: '400px',
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: '6px',
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

// Görev durumu için renk tanımları
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return '#4CAF50'; // Yeşil
    case 'pending':
      return '#FF9800'; // Turuncu
    case 'missed':
      return '#F44336'; // Kırmızı
    case 'accepted':
      return '#9C27B0'; // Mor
    case 'started':
      return '#2196F3'; // Mavi
    default:
      return '#757575'; // Gri
  }
};

// Görev durumu için simge
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckIcon />;
    case 'pending':
      return <ScheduleIcon />;
    case 'missed':
      return <CancelIcon />;
    case 'accepted':
      return <ArrowForwardIcon />;
    case 'started':
      return <PlayArrowIcon />;
    default:
      return <WarningIcon />;
  }
};

// Durum etiketi
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'Tamamlandı';
    case 'pending':
      return 'Beklemede';
    case 'missed':
      return 'Kaçırıldı';
    case 'accepted':
      return 'Kabul Edildi';
    case 'started':
      return 'Başlandı';
    default:
      return 'Bilinmiyor';
  }
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab panel bileşeni
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
}

interface TakvimDetailModalProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
  dailyTasks: any[];
  weeklyTasks: any[];
  monthlyTasks: any[];
  loading: boolean;
}

const TakvimDetailModal: React.FC<TakvimDetailModalProps> = ({
  open,
  onClose,
  selectedDate,
  dailyTasks = [],
  weeklyTasks = [],
  monthlyTasks = [],
  loading = false
}) => {
  const [tabValue, setTabValue] = useState(0);

  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Tarih formatını Türkçe olarak göster
  const formattedDate = format(selectedDate, 'dd MMMM yyyy, EEEE', { locale: tr });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ p: 0 }}>
        <HeaderContainer>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TodayIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" component="div">
              {formattedDate}
            </Typography>
          </Box>
          <IconButton aria-label="close" onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </HeaderContainer>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 2 }}>
        <Box>
          <Tabs
            value={tabValue}
            onChange={handleChangeTab}
            aria-label="görev türü sekmeler"
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab 
              icon={<TodayIcon />} 
              iconPosition="start" 
              label={`Günlük Görevler (${dailyTasks.length})`} 
            />
            <Tab 
              icon={<WeekIcon />} 
              iconPosition="start" 
              label={`Haftalık Görevler (${weeklyTasks.length})`} 
            />
            <Tab 
              icon={<MonthIcon />} 
              iconPosition="start" 
              label={`Aylık Görevler (${monthlyTasks.length})`} 
            />
          </Tabs>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TabPanel value={tabValue} index={0}>
                <TabContainer>
                  {dailyTasks.length > 0 ? (
                    <List>
                      {dailyTasks.map((task) => (
                        <React.Fragment key={task.id}>
                          <ListItem 
                            sx={{ 
                              borderRadius: 1,
                              mb: 1, 
                              bgcolor: 'background.paper',
                              '&:hover': {
                                bgcolor: 'action.hover',
                              } 
                            }}
                          >
                            <ListItemIcon>
                              <Avatar 
                                sx={{ 
                                  bgcolor: `${getStatusColor(task.status)}20`,
                                  color: getStatusColor(task.status)
                                }}
                              >
                                {getStatusIcon(task.status)}
                              </Avatar>
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                                  {task.name}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ mt: 0.5 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {task.description}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                                    <Chip 
                                      size="small" 
                                      label={getStatusLabel(task.status)}
                                      sx={{ 
                                        bgcolor: `${getStatusColor(task.status)}20`,
                                        color: getStatusColor(task.status),
                                        height: 20,
                                        fontSize: '0.7rem'
                                      }} 
                                    />
                                    {task.repeatType && (
                                      <Chip 
                                        size="small" 
                                        label="Tekrarlı"
                                        sx={{ 
                                          bgcolor: '#3f51b520',
                                          color: '#3f51b5',
                                          height: 20,
                                          fontSize: '0.7rem'
                                        }} 
                                      />
                                    )}
                                    {task.completionType && (
                                      <Chip 
                                        size="small" 
                                        label={task.completionType === 'qr' ? 'QR Kod' : 'Manuel'}
                                        sx={{ 
                                          bgcolor: '#9c27b020',
                                          color: '#9c27b0',
                                          height: 20,
                                          fontSize: '0.7rem'
                                        }} 
                                      />
                                    )}
                                  </Box>
                                </Box>
                              }
                            />
                            
                            {task.repetitionTimes && task.repetitionTimes.length > 0 && (
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px' }}>
                                <Typography variant="caption" color="text.secondary">
                                  {task.repetitionTimes.length > 1 ? 'Görev Saatleri' : 'Görev Saati'}
                                </Typography>
                                {task.repetitionTimes.length === 1 ? (
                                  <Chip 
                                    size="small" 
                                    label={task.repetitionTimes[0]}
                                    sx={{ 
                                      bgcolor: '#2196f320',
                                      color: '#2196f3',
                                      fontSize: '0.75rem',
                                      mt: 0.5
                                    }} 
                                  />
                                ) : (
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
                                    {task.repetitionTimes.map((time: string, index: number) => (
                                      <Chip 
                                        key={index}
                                        size="small" 
                                        label={time}
                                        sx={{ 
                                          bgcolor: '#2196f320',
                                          color: '#2196f3',
                                          fontSize: '0.75rem',
                                          height: 20,
                                          my: 0.2
                                        }} 
                                      />
                                    ))}
                                  </Box>
                                )}
                              </Box>
                            )}
                          </ListItem>
                          <Divider variant="inset" component="li" />
                        </React.Fragment>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography color="text.secondary">
                        Bu tarih için günlük görev bulunmamaktadır.
                      </Typography>
                    </Box>
                  )}
                </TabContainer>
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                <TabContainer>
                  {weeklyTasks.length > 0 ? (
                    <List>
                      {weeklyTasks.map((task) => (
                        <React.Fragment key={task.id}>
                          <ListItem 
                            sx={{ 
                              borderRadius: 1,
                              mb: 1, 
                              bgcolor: 'background.paper',
                              '&:hover': {
                                bgcolor: 'action.hover',
                              } 
                            }}
                          >
                            <ListItemIcon>
                              <Avatar 
                                sx={{ 
                                  bgcolor: `${getStatusColor(task.status)}20`,
                                  color: getStatusColor(task.status)
                                }}
                              >
                                {getStatusIcon(task.status)}
                              </Avatar>
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                                  {task.name}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ mt: 0.5 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {task.description}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                                    <Chip 
                                      size="small" 
                                      label={getStatusLabel(task.status)}
                                      sx={{ 
                                        bgcolor: `${getStatusColor(task.status)}20`,
                                        color: getStatusColor(task.status),
                                        height: 20,
                                        fontSize: '0.7rem'
                                      }} 
                                    />
                                    {task.completionType && (
                                      <Chip 
                                        size="small" 
                                        label={task.completionType === 'qr' ? 'QR Kod' : 'Manuel'}
                                        sx={{ 
                                          bgcolor: '#9c27b020',
                                          color: '#9c27b0',
                                          height: 20,
                                          fontSize: '0.7rem'
                                        }} 
                                      />
                                    )}
                                    <Chip 
                                      size="small" 
                                      label={`${task.startTolerance || 15} dk tolerans`}
                                      sx={{ 
                                        bgcolor: '#3f51b520',
                                        color: '#3f51b5',
                                        height: 20,
                                        fontSize: '0.7rem'
                                      }} 
                                    />
                                  </Box>
                                </Box>
                              }
                            />
                            
                            {task.repetitionTimes && task.repetitionTimes.length > 0 && (
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px' }}>
                                <Typography variant="caption" color="text.secondary">
                                  {task.repetitionTimes.length > 1 ? 'Görev Saatleri' : 'Görev Saati'}
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
                                  {task.repetitionTimes.map((time: string, index: number) => (
                                    <Chip 
                                      key={index}
                                      size="small" 
                                      label={time}
                                      sx={{ 
                                        bgcolor: '#2196f320',
                                        color: '#2196f3',
                                        fontSize: '0.75rem',
                                        height: 20,
                                        my: 0.2
                                      }} 
                                    />
                                  ))}
                                </Box>
                              </Box>
                            )}
                          </ListItem>
                          <Divider variant="inset" component="li" />
                        </React.Fragment>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography color="text.secondary">
                        Bu tarih için haftalık görev bulunmamaktadır.
                      </Typography>
                    </Box>
                  )}
                </TabContainer>
              </TabPanel>
              
              <TabPanel value={tabValue} index={2}>
                <TabContainer>
                  {monthlyTasks.length > 0 ? (
                    <List>
                      {monthlyTasks.map((task) => (
                        <React.Fragment key={task.id}>
                          <ListItem 
                            sx={{ 
                              borderRadius: 1,
                              mb: 1, 
                              bgcolor: 'background.paper',
                              '&:hover': {
                                bgcolor: 'action.hover',
                              } 
                            }}
                          >
                            <ListItemIcon>
                              <Avatar 
                                sx={{ 
                                  bgcolor: `${getStatusColor(task.status)}20`,
                                  color: getStatusColor(task.status)
                                }}
                              >
                                {getStatusIcon(task.status)}
                              </Avatar>
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                                  {task.name}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ mt: 0.5 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {task.description}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                                    <Chip 
                                      size="small" 
                                      label={getStatusLabel(task.status)}
                                      sx={{ 
                                        bgcolor: `${getStatusColor(task.status)}20`,
                                        color: getStatusColor(task.status),
                                        height: 20,
                                        fontSize: '0.7rem'
                                      }} 
                                    />
                                    {task.completionType && (
                                      <Chip 
                                        size="small" 
                                        label={task.completionType === 'qr' ? 'QR Kod' : 'Manuel'}
                                        sx={{ 
                                          bgcolor: '#9c27b020',
                                          color: '#9c27b0',
                                          height: 20,
                                          fontSize: '0.7rem'
                                        }} 
                                      />
                                    )}
                                    <Chip 
                                      size="small" 
                                      label={`${task.startTolerance || 15} dk tolerans`}
                                      sx={{ 
                                        bgcolor: '#FF572220',
                                        color: '#FF5722',
                                        height: 20,
                                        fontSize: '0.7rem'
                                      }} 
                                    />
                                  </Box>
                                </Box>
                              }
                            />
                            
                            {task.repetitionTimes && task.repetitionTimes.length > 0 && (
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px' }}>
                                <Typography variant="caption" color="text.secondary">
                                  {task.repetitionTimes.length > 1 ? 'Görev Saatleri' : 'Görev Saati'}
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
                                  {task.repetitionTimes.map((time: string, index: number) => (
                                    <Chip 
                                      key={index}
                                      size="small" 
                                      label={time}
                                      sx={{ 
                                        bgcolor: '#FF572220',
                                        color: '#FF5722',
                                        fontSize: '0.75rem',
                                        height: 20,
                                        my: 0.2
                                      }} 
                                    />
                                  ))}
                                </Box>
                              </Box>
                            )}
                          </ListItem>
                          <Divider variant="inset" component="li" />
                        </React.Fragment>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography color="text.secondary">
                        Bu tarih için aylık görev bulunmamaktadır.
                      </Typography>
                    </Box>
                  )}
                </TabContainer>
              </TabPanel>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default TakvimDetailModal; 