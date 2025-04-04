import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  styled,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Grid,
  IconButton,
  Divider,
  Card,
  CardContent,
  Chip,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  InputAdornment
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Repeat as RepeatIcon,
  BarChart as BarChartIcon,
  TouchApp as TouchAppIcon,
  CalendarToday as CalendarTodayIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  PersonOutline as PersonOutlineIcon,
  AccessTime as AccessTimeIcon,
  Download as DownloadIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';
import { utils, writeFile } from 'xlsx';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';

// Kaydırılabilir ana içerik için styled component
const ScrollableContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  overflowY: 'auto',
  height: 'calc(100vh - 64px)', // Header yüksekliğini çıkarıyoruz
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

// Görev seçici için styled component
const TaskSelector = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  marginBottom: theme.spacing(3),
}));

// Rapor içeriği için styled component
const ReportContent = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  height: '100%',
  overflow: 'auto',
}));

// Görev detay kartı için styled component
const TaskDetailCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderRadius: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
}));

// Durum kartı için styled component
const StatusCard = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 12,
  backgroundColor: theme.palette.primary.main + '10',
  marginBottom: theme.spacing(3),
}));

// Durum çubuğu için styled component
const StatusBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(1),
}));

// Durum adımı için styled component
const StatusStep = styled(Box)<{ active: boolean }>(({ theme, active }) => ({
  height: 6,
  flex: 1,
  backgroundColor: active ? theme.palette.primary.main : theme.palette.grey[300],
}));

// Status adım etiketleri için styled component
const StatusStepLabel = styled(Box)<{ active: boolean }>(({ theme, active }) => ({
  fontSize: 12,
  color: active ? theme.palette.primary.main : theme.palette.text.secondary,
  fontWeight: active ? 'bold' : 'normal',
}));

// Bilgi satırı için styled component
const InfoRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: theme.spacing(2),
}));

// İkon kutucuğu için styled component
const IconBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: 40,
  height: 40,
  backgroundColor: theme.palette.primary.main + '10',
  borderRadius: 8,
  marginRight: theme.spacing(2),
}));

// Haftalık görev tablosu için hücre styled component
const TableStatusCell = styled(TableCell)<{ status: string }>(({ theme, status }) => ({
  width: 70,
  height: 70,
  textAlign: 'center',
  padding: 8,
  backgroundColor: 
    status === 'completed' ? theme.palette.success.light + '20' :
    status === 'missed' ? theme.palette.error.light + '20' :
    status === 'started_missed' ? theme.palette.warning.light + '20' :
    'transparent',
}));

interface TaskData {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: number;
  personnelId?: string;
  isRecurring?: boolean;
  acceptedAt?: number;
  startedAt?: number;
  completedAt?: number;
}

interface RecurringTaskData {
  taskHours: string[];
  completedTasks: {
    id: string;
    date: number;
    time: string;
    taskDate: string;
    status: string;
    taskName: string;
  }[];
  missedTasks: {
    id: string;
    date: number;
    time: string;
    taskDate: string;
    status: string;
    started?: boolean;
    taskName: string;
  }[];
}

const Reports: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>('');
  const [taskList, setTaskList] = useState<TaskData[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [recurringData, setRecurringData] = useState<RecurringTaskData | null>(null);
  const [recurringDataLoading, setRecurringDataLoading] = useState(false);
  const [personnelData, setPersonnelData] = useState<any>(null);
  const [personnelLoading, setPersonnelLoading] = useState(false);
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Şirket görevlerini yükle
  useEffect(() => {
    const loadCompanyTasks = async () => {
      setLoading(true);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Kullanıcının şirket ID'sini al
        const userSnapshot = await get(ref(database, `users/${currentUser.uid}`));
        
        if (!userSnapshot.exists()) {
          setLoading(false);
          return;
        }
        
        const userData = userSnapshot.val();
        const companyId = userData.companyId || '';
        
        if (!companyId) {
          setLoading(false);
          return;
        }
        
        setCompanyId(companyId);
        
        // Görevleri çek
        const tasksSnapshot = await get(ref(database, `companies/${companyId}/tasks`));
        
        if (!tasksSnapshot.exists()) {
          setTaskList([]);
          setLoading(false);
          return;
        }
        
        const tasksData = tasksSnapshot.val();
        const tasks: TaskData[] = [];
        
        Object.entries(tasksData).forEach(([id, data]: [string, any]) => {
          tasks.push({
            id,
            name: data.name || 'İsimsiz Görev',
            description: data.description || '',
            status: data.status || 'pending',
            createdAt: data.createdAt || 0,
            personnelId: data.personnelId || '',
            isRecurring: data.isRecurring || false,
            acceptedAt: data.acceptedAt,
            startedAt: data.startedAt,
            completedAt: data.completedAt,
          });
        });
        
        // En son oluşturulan görev en üstte gösterilecek
        tasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        setTaskList(tasks);
      } catch (error) {
        console.error('Görevler yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCompanyTasks();
  }, [currentUser]);

  // Görev seçildiğinde çağrılacak fonksiyon
  const handleTaskChange = (event: SelectChangeEvent<string>) => {
    const taskId = event.target.value;
    const task = taskList.find(t => t.id === taskId) || null;
    setSelectedTask(task);
    
    if (task && task.isRecurring) {
      fetchRecurringTaskData(task.id);
    }
    
    if (task && task.personnelId) {
      fetchPersonnelData(task.personnelId);
    }
  };

  // Tekrarlı görev verilerini çeken fonksiyon
  const fetchRecurringTaskData = async (taskId: string) => {
    if (!companyId || !taskId) return;
    
    setRecurringDataLoading(true);
    
    try {
      const taskSnapshot = await get(ref(database, `companies/${companyId}/tasks/${taskId}`));
      
      if (!taskSnapshot.exists()) {
        setRecurringData(null);
        setRecurringDataLoading(false);
        return;
      }
      
      const taskData = taskSnapshot.val();
      const taskName = taskData.name;
      
      const result: RecurringTaskData = {
        taskHours: [],
        completedTasks: [],
        missedTasks: [],
      };
      
      // 1. Görevin saatlerini al
      if (taskData.repetitionTimes) {
        const times = taskData.repetitionTimes;
        
        if (Array.isArray(times)) {
          result.taskHours = times.filter(t => t).map(t => t.toString());
        } else if (typeof times === 'object') {
          result.taskHours = Object.values(times)
            .filter(t => t)
            .map(t => (t as any).toString());
        }
        
        // Saatleri sırala
        result.taskHours.sort();
      }
      
      // 2. Tamamlanan görevleri kontrol et
      const completedTasksSnapshot = await get(ref(database, `companies/${companyId}/completedTasks/${taskId}`));
      
      if (completedTasksSnapshot.exists()) {
        const allCompletedDates = completedTasksSnapshot.val();
        
        Object.entries(allCompletedDates).forEach(([dateKey, dateData]: [string, any]) => {
          if (typeof dateData === 'object') {
            Object.entries(dateData).forEach(([hourKey, hourData]: [string, any]) => {
              if (typeof hourData === 'object' && hourData.taskName === taskName) {
                const timestamp = hourData.completedAt || hourData.timestamp || 0;
                
                result.completedTasks.push({
                  id: taskId,
                  date: timestamp,
                  time: hourKey.toString(),
                  taskDate: dateKey.toString(),
                  status: 'completed',
                  taskName: hourData.taskName,
                });
              }
            });
          }
        });
      }
      
      // 3. Tamamlanmayan görevleri kontrol et
      const missedTasksSnapshot = await get(ref(database, `companies/${companyId}/missedTasks/${taskId}`));
      
      if (missedTasksSnapshot.exists()) {
        const allMissedDates = missedTasksSnapshot.val();
        
        Object.entries(allMissedDates).forEach(([dateKey, dateData]: [string, any]) => {
          if (typeof dateData === 'object') {
            Object.entries(dateData).forEach(([hourKey, hourData]: [string, any]) => {
              if (typeof hourData === 'object' && hourData.taskName === taskName) {
                const timestamp = hourData.missedAt || hourData.timestamp || 0;
                const started = hourData.started || false;
                
                result.missedTasks.push({
                  id: taskId,
                  date: timestamp,
                  time: hourKey.toString(),
                  taskDate: dateKey.toString(),
                  status: 'missed',
                  started,
                  taskName: hourData.taskName,
                });
              }
            });
          }
        });
      }
      
      setRecurringData(result);
    } catch (error) {
      console.error('Tekrarlı görev verileri çekilirken hata:', error);
      setRecurringData(null);
    } finally {
      setRecurringDataLoading(false);
    }
  };

  // Personel bilgilerini çeken fonksiyon
  const fetchPersonnelData = async (personnelId: string) => {
    if (!personnelId) return;
    
    setPersonnelLoading(true);
    
    try {
      const personnelSnapshot = await get(ref(database, `users/${personnelId}`));
      
      if (personnelSnapshot.exists()) {
        setPersonnelData(personnelSnapshot.val());
      } else {
        setPersonnelData(null);
      }
    } catch (error) {
      console.error('Personel bilgileri çekilirken hata:', error);
      setPersonnelData(null);
    } finally {
      setPersonnelLoading(false);
    }
  };

  // Görev durumuna göre renk döndüren fonksiyon
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success.main';
      case 'started':
        return 'info.main';
      case 'accepted':
        return 'secondary.main';
      case 'pending':
      default:
        return 'warning.main';
    }
  };

  // Görev durumuna göre metin döndüren fonksiyon
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'started':
        return 'Görev Başladı';
      case 'accepted':
        return 'Kabul Edildi';
      case 'pending':
      default:
        return 'Beklemede';
    }
  };

  // Görev durumuna göre seviye döndüren fonksiyon (1-3 arası)
  const getStatusLevel = (status: string) => {
    switch (status) {
      case 'completed':
        return 3;
      case 'started':
        return 2;
      case 'accepted':
        return 1;
      case 'pending':
      default:
        return 1;
    }
  };

  // Timestamp'i DateTime'a çeviren fonksiyon
  const convertTimestampToDateTime = (timestamp: number | null | undefined) => {
    if (!timestamp) return null;
    
    return new Date(timestamp);
  };

  // Görev süresini hesaplayan fonksiyon
  const calculateTaskDuration = () => {
    if (!selectedTask) return 'Hesaplanamadı';
    
    const startedAt = selectedTask.startedAt;
    const completedAt = selectedTask.completedAt;
    
    if (!startedAt) {
      return 'Henüz başlamamış';
    }
    
    try {
      const startTime = new Date(startedAt);
      const endTime = completedAt ? new Date(completedAt) : new Date();
      
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));
      const durationHours = Math.floor(durationMinutes / 60);
      const durationDays = Math.floor(durationHours / 24);
      
      if (durationDays > 0) {
        return `${durationDays} gün ${durationHours % 24} saat`;
      } else if (durationHours > 0) {
        return `${durationHours} saat ${durationMinutes % 60} dakika`;
      } else {
        return `${durationMinutes} dakika`;
      }
    } catch (e) {
      return 'Hesaplanamadı';
    }
  };

  // Hücre durumunu belirleyen fonksiyon (tablo için)
  const getCellStatus = (date: Date, hour: string) => {
    if (!recurringData) return '';
    
    // Günü milisaniye cinsinden başlangıç ve bitiş olarak al
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).getTime();
    
    // Tamamlanan görev var mı kontrol et
    const completedTask = recurringData.completedTasks.find(task => {
      return task.date >= dayStart && task.date <= dayEnd && task.time === hour;
    });
    
    if (completedTask) return 'completed';
    
    // Tamamlanmayan görev var mı kontrol et
    const missedTask = recurringData.missedTasks.find(task => {
      return task.date >= dayStart && task.date <= dayEnd && task.time === hour;
    });
    
    if (missedTask) {
      return missedTask.started ? 'started_missed' : 'missed';
    }
    
    return '';
  };

  // Bugün mü kontrolü
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // 7 günlük tabloyu oluşturacak JSX'i döndüren fonksiyon
  const buildWeeklyTaskTable = () => {
    if (!recurringData || !recurringData.taskHours.length) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Bu görev için ayarlanmış saat bulunamadı
          </Typography>
        </Box>
      );
    }
    
    // Bugünden başlayarak 7 günlük tarihleri oluştur
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index)); // 6 gün öncesinden başla, bugün en sona
      return date;
    });
    
    // Gün kısaltmaları
    const dayShorts = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    
    return (
      <Box>
        {/* Kaydırma ipucu */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            mb: 1,
            color: 'primary.main'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', mx: 0.5 }}>←</Box>
            <Box sx={{ display: 'flex', mx: 0.5 }}>→</Box>
          </Box>
        </Box>
        
        {/* Tablo */}
        <Box sx={{ overflowX: 'auto' }}>
          <TableContainer component={Paper} sx={{ minWidth: 500, borderRadius: 2 }}>
            <Table sx={{ minWidth: 500 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.main' + '10' }}>
                  <TableCell sx={{ fontWeight: 'bold', width: 100 }}>Gün</TableCell>
                  {recurringData.taskHours.map((hour) => (
                    <TableCell key={hour} align="center" sx={{ fontWeight: 'bold' }}>
                      {hour}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {dates.map((date, index) => {
                  const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1; // 0 = Pazartesi, 6 = Pazar
                  const formattedDate = `${date.getDate()}.${date.getMonth() + 1}`;
                  
                  return (
                    <TableRow 
                      key={date.toISOString()} 
                      sx={{
                        backgroundColor: index % 2 === 0 ? 'white' : 'primary.main' + '05',
                        ...(isToday(date) && {
                          border: 2,
                          borderColor: 'primary.main',
                        }),
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Typography 
                            variant="body2"
                            fontWeight={isToday(date) ? 'bold' : 'normal'}
                            color={isToday(date) ? 'primary.main' : 'text.primary'}
                          >
                            {dayShorts[dayOfWeek]}
                          </Typography>
                          <Typography 
                            variant="caption"
                            fontWeight={isToday(date) ? 'bold' : 'normal'}
                            color={isToday(date) ? 'primary.main' : 'text.secondary'}
                          >
                            {formattedDate}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      {recurringData.taskHours.map((hour) => {
                        const cellStatus = getCellStatus(date, hour);
                        
                        return (
                          <TableStatusCell key={`${date.toISOString()}-${hour}`} status={cellStatus}>
                            {cellStatus === 'completed' && (
                              <Box
                                sx={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  bgcolor: 'success.main',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto',
                                }}
                              >
                                <CheckCircleOutlineIcon sx={{ color: 'white', fontSize: 16 }} />
                              </Box>
                            )}
                            
                            {cellStatus === 'missed' && (
                              <Box
                                sx={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  bgcolor: 'error.main',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto',
                                }}
                              >
                                <Typography sx={{ color: 'white', fontSize: 16 }}>X</Typography>
                              </Box>
                            )}
                            
                            {cellStatus === 'started_missed' && (
                              <Box
                                sx={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  bgcolor: 'warning.main',
                                  border: '3px solid',
                                  borderColor: 'error.main',
                                  margin: '0 auto',
                                }}
                              />
                            )}
                          </TableStatusCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    );
  };

  // Excel indirme fonksiyonu
  const handleDownloadExcel = async () => {
    if (!selectedTask) return;

    try {
      // Excel workbook oluştur
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(selectedTask.isRecurring ? 'Haftalık Görev Raporu' : 'Görev Raporu');

      if (selectedTask.isRecurring && recurringData) {
        // Tekrarlı görev için veri hazırla
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dates = Array.from({ length: 7 }, (_, index) => {
          const date = new Date(today);
          date.setDate(today.getDate() - (6 - index));
          return date;
        });

        // Gün kısaltmaları
        const dayShorts = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

        // Başlık satırını oluştur
        worksheet.columns = [
          { header: 'Gün', key: 'day', width: 15 },
          ...recurringData.taskHours.map(hour => ({
            header: hour,
            key: hour,
            width: 15
          }))
        ];

        // Başlık stilini ayarla
        const headerStyle: Partial<ExcelJS.Style> = {
          font: { bold: true, color: { argb: 'FFFFFFFF' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } },
          border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          },
          alignment: {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true
          }
        };

        // Başlık satırına stil uygula
        worksheet.getRow(1).eachCell(cell => {
          cell.style = headerStyle;
        });

        // Her gün için satır oluştur
        dates.forEach((date, index) => {
          const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1;
          const formattedDate = `${date.getDate()}.${date.getMonth() + 1}`;
          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
          const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).getTime();

          const row = worksheet.addRow({
            day: `${dayShorts[dayOfWeek]}\n${formattedDate}`
          });

          // Gün sütununa stil uygula
          const dayColumnStyle: Partial<ExcelJS.Style> = {
            font: { bold: true, color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } },
            border: {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            },
            alignment: {
              vertical: 'middle',
              horizontal: 'center',
              wrapText: true
            }
          };
          row.getCell('day').style = dayColumnStyle;

          // Her saat için durum kontrolü
          recurringData.taskHours.forEach(hour => {
            const completedTask = recurringData.completedTasks.find(task => 
              task.date >= dayStart && task.date <= dayEnd && task.time === hour
            );
            const missedTask = recurringData.missedTasks.find(task => 
              task.date >= dayStart && task.date <= dayEnd && task.time === hour
            );

            let status = '';
            let cellStyle: Partial<ExcelJS.Style> = {
              border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              },
              alignment: {
                vertical: 'middle',
                horizontal: 'center'
              }
            };

            if (completedTask) {
              status = '✓';
              cellStyle = {
                ...cellStyle,
                font: { color: { argb: 'FFFFFFFF' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } }
              };
            } else if (missedTask) {
              status = missedTask.started ? '⚠' : '✗';
              cellStyle = {
                ...cellStyle,
                font: { color: { argb: missedTask.started ? 'FF000000' : 'FFFFFFFF' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: missedTask.started ? 'FFFFC107' : 'FFF44336' } }
              };
            }

            const cell = row.getCell(hour);
            cell.value = status;
            cell.style = cellStyle;
          });
        });

        // Satır yüksekliklerini ayarla
        worksheet.eachRow((row, rowNumber) => {
          row.height = 40;
        });

        // Boş satır ekle
        worksheet.addRow({});
        worksheet.addRow({});

        // Görev Detayları Başlığı
        const detailsHeaderRow = worksheet.addRow({ day: 'Görev Detayları' });
        detailsHeaderRow.getCell('day').style = {
          font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } }
        };

        // Görev Adı
        worksheet.addRow({ day: 'Görev Adı', [recurringData.taskHours[0]]: selectedTask.name });
        
        // Açıklama
        worksheet.addRow({ day: 'Açıklama', [recurringData.taskHours[0]]: selectedTask.description || '-' });
        
        // Oluşturulma Tarihi
        worksheet.addRow({ 
          day: 'Oluşturulma Tarihi', 
          [recurringData.taskHours[0]]: selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleString('tr-TR') : '-'
        });
        
        // Kabul Edilme Tarihi
        worksheet.addRow({ 
          day: 'Kabul Edilme Tarihi', 
          [recurringData.taskHours[0]]: selectedTask.acceptedAt ? new Date(selectedTask.acceptedAt).toLocaleString('tr-TR') : '-'
        });

        // Personel Bilgileri Başlığı
        worksheet.addRow({});
        const personnelHeaderRow = worksheet.addRow({ day: 'Görev Atanan Personel' });
        personnelHeaderRow.getCell('day').style = {
          font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } }
        };

        // Personel Bilgileri
        if (personnelData) {
          worksheet.addRow({ 
            day: 'Ad Soyad', 
            [recurringData.taskHours[0]]: `${personnelData.firstName || ''} ${personnelData.lastName || ''}`
          });
          worksheet.addRow({ 
            day: 'E-posta', 
            [recurringData.taskHours[0]]: personnelData.email || '-'
          });
        } else {
          worksheet.addRow({ 
            day: 'Personel Bilgisi', 
            [recurringData.taskHours[0]]: 'Personel bilgisi bulunamadı'
          });
        }

        // Detay satırlarına stil uygula
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > dates.length + 2) { // Tablo satırlarından sonraki satırlar
            row.eachCell(cell => {
              cell.style = {
                border: {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' }
                }
              };
            });
          }
        });
      } else {
        // Normal görev için veri hazırla
        worksheet.columns = [
          { header: 'Alan', key: 'field', width: 20 },
          { header: 'Değer', key: 'value', width: 40 }
        ];

        // Başlık stilini ayarla
        const headerStyle: Partial<ExcelJS.Style> = {
          font: { bold: true, color: { argb: 'FFFFFFFF' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } },
          border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
        };

        // Başlık satırına stil uygula
        worksheet.getRow(1).eachCell(cell => {
          cell.style = headerStyle;
        });

        // Veri satırlarını ekle
        const data = [
          { field: 'Görev Adı', value: selectedTask.name },
          { field: 'Açıklama', value: selectedTask.description || '-' },
          { field: 'Durum', value: getStatusText(selectedTask.status) },
          { field: 'Oluşturulma Tarihi', value: selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleString('tr-TR') : '-' },
          { field: 'Kabul Edilme Tarihi', value: selectedTask.acceptedAt ? new Date(selectedTask.acceptedAt).toLocaleString('tr-TR') : '-' },
          { field: 'Başlama Tarihi', value: selectedTask.startedAt ? new Date(selectedTask.startedAt).toLocaleString('tr-TR') : '-' },
          { field: 'Tamamlanma Tarihi', value: selectedTask.completedAt ? new Date(selectedTask.completedAt).toLocaleString('tr-TR') : '-' },
          { field: 'Toplam Süre', value: calculateTaskDuration() }
        ];

        data.forEach((item, index) => {
          const row = worksheet.addRow(item);
          row.eachCell(cell => {
            cell.style = {
              border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              }
            };
          });
        });
      }

      // Excel dosyasını oluştur ve indir
      const buffer = await workbook.xlsx.writeBuffer();
      const downloadDate = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
      saveAs(new Blob([buffer]), `${selectedTask.name}_${downloadDate}.xlsx`);

    } catch (error) {
      console.error('Excel dosyası oluşturulurken hata:', error);
      alert('Excel dosyası oluşturulurken bir hata oluştu.');
    }
  };

  // Aylık Excel indirme fonksiyonu
  const handleDownloadMonthlyExcel = async () => {
    if (!selectedTask || !recurringData) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Aylık Görev Raporu');

      // Son 1 aylık tarihleri oluştur
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(today.getMonth() - 1);

      const dates = [];
      let monthlyCurrentDate = new Date(oneMonthAgo);
      while (monthlyCurrentDate <= today) {
        dates.push(new Date(monthlyCurrentDate));
        monthlyCurrentDate.setDate(monthlyCurrentDate.getDate() + 1);
      }

      // Başlık satırını oluştur
      worksheet.columns = [
        { header: 'Tarih', key: 'date', width: 15 },
        ...recurringData.taskHours.map(hour => ({
          header: hour,
          key: hour,
          width: 15
        }))
      ];

      // Başlık stilini ayarla
      const headerStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        },
        alignment: {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        }
      };

      // Başlık satırına stil uygula
      worksheet.getRow(1).eachCell(cell => {
        cell.style = headerStyle;
      });

      // Her gün için satır oluştur
      dates.forEach((date) => {
        const formattedDate = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).getTime();

        const row = worksheet.addRow({
          date: formattedDate
        });

        // Tarih sütununa stil uygula
        const dateColumnStyle: Partial<ExcelJS.Style> = {
          font: { bold: true, color: { argb: 'FFFFFFFF' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } },
          border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          },
          alignment: {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true
          }
        };
        row.getCell('date').style = dateColumnStyle;

        // Her saat için durum kontrolü
        recurringData.taskHours.forEach(hour => {
          const completedTask = recurringData.completedTasks.find(task => 
            task.date >= dayStart && task.date <= dayEnd && task.time === hour
          );
          const missedTask = recurringData.missedTasks.find(task => 
            task.date >= dayStart && task.date <= dayEnd && task.time === hour
          );

          let status = '';
          let cellStyle: Partial<ExcelJS.Style> = {
            border: {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            },
            alignment: {
              vertical: 'middle',
              horizontal: 'center'
            }
          };

          if (completedTask) {
            status = '✓';
            cellStyle = {
              ...cellStyle,
              font: { color: { argb: 'FFFFFFFF' } },
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } }
            };
          } else if (missedTask) {
            status = missedTask.started ? '⚠' : '✗';
            cellStyle = {
              ...cellStyle,
              font: { color: { argb: missedTask.started ? 'FF000000' : 'FFFFFFFF' } },
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: missedTask.started ? 'FFFFC107' : 'FFF44336' } }
            };
          }

          const cell = row.getCell(hour);
          cell.value = status;
          cell.style = cellStyle;
        });
      });

      // Satır yüksekliklerini ayarla
      worksheet.eachRow((row, rowNumber) => {
        row.height = 40;
      });

      // Boş satır ekle
      worksheet.addRow({});
      worksheet.addRow({});

      // Görev Detayları Başlığı
      const detailsHeaderRow = worksheet.addRow({ date: 'Görev Detayları' });
      detailsHeaderRow.getCell('date').style = {
        font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } }
      };

      // Görev Adı
      worksheet.addRow({ date: 'Görev Adı', [recurringData.taskHours[0]]: selectedTask.name });
      
      // Açıklama
      worksheet.addRow({ date: 'Açıklama', [recurringData.taskHours[0]]: selectedTask.description || '-' });
      
      // Oluşturulma Tarihi
      worksheet.addRow({ 
        date: 'Oluşturulma Tarihi', 
        [recurringData.taskHours[0]]: selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleString('tr-TR') : '-'
      });
      
      // Kabul Edilme Tarihi
      worksheet.addRow({ 
        date: 'Kabul Edilme Tarihi', 
        [recurringData.taskHours[0]]: selectedTask.acceptedAt ? new Date(selectedTask.acceptedAt).toLocaleString('tr-TR') : '-'
      });

      // Personel Bilgileri Başlığı
      worksheet.addRow({});
      const personnelHeaderRow = worksheet.addRow({ date: 'Görev Atanan Personel' });
      personnelHeaderRow.getCell('date').style = {
        font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } }
      };

      // Personel Bilgileri
      if (personnelData) {
        worksheet.addRow({ 
          date: 'Ad Soyad', 
          [recurringData.taskHours[0]]: `${personnelData.firstName || ''} ${personnelData.lastName || ''}`
        });
        worksheet.addRow({ 
          date: 'E-posta', 
          [recurringData.taskHours[0]]: personnelData.email || '-'
        });
      } else {
        worksheet.addRow({ 
          date: 'Personel Bilgisi', 
          [recurringData.taskHours[0]]: 'Personel bilgisi bulunamadı'
        });
      }

      // Detay satırlarına stil uygula
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > dates.length + 2) {
          row.eachCell(cell => {
            cell.style = {
              border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              }
            };
          });
        }
      });

      // Excel dosyasını oluştur ve indir
      const buffer = await workbook.xlsx.writeBuffer();
      const downloadDate = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
      saveAs(new Blob([buffer]), `${selectedTask.name}_Aylik_${downloadDate}.xlsx`);

    } catch (error) {
      console.error('Excel dosyası oluşturulurken hata:', error);
      alert('Excel dosyası oluşturulurken bir hata oluştu.');
    }
  };

  // İki tarih arası Excel indirme fonksiyonu
  const handleDownloadDateRangeExcel = async () => {
    if (!selectedTask || !recurringData || !startDate || !endDate) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Tarih Aralığı Görev Raporu');

      // Seçilen tarih aralığındaki tarihleri oluştur
      const dates = [];
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Başlık satırını oluştur
      worksheet.columns = [
        { header: 'Tarih', key: 'date', width: 15 },
        ...recurringData.taskHours.map(hour => ({
          header: hour,
          key: hour,
          width: 15
        }))
      ];

      // Başlık stilini ayarla
      const headerStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        },
        alignment: {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        }
      };

      // Başlık satırına stil uygula
      worksheet.getRow(1).eachCell(cell => {
        cell.style = headerStyle;
      });

      // Her gün için satır oluştur
      dates.forEach((date) => {
        const formattedDate = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).getTime();

        const row = worksheet.addRow({
          date: formattedDate
        });

        // Tarih sütununa stil uygula
        const dateColumnStyle: Partial<ExcelJS.Style> = {
          font: { bold: true, color: { argb: 'FFFFFFFF' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } },
          border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          },
          alignment: {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true
          }
        };
        row.getCell('date').style = dateColumnStyle;

        // Her saat için durum kontrolü
        recurringData.taskHours.forEach(hour => {
          const completedTask = recurringData.completedTasks.find(task => 
            task.date >= dayStart && task.date <= dayEnd && task.time === hour
          );
          const missedTask = recurringData.missedTasks.find(task => 
            task.date >= dayStart && task.date <= dayEnd && task.time === hour
          );

          let status = '';
          let cellStyle: Partial<ExcelJS.Style> = {
            border: {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            },
            alignment: {
              vertical: 'middle',
              horizontal: 'center'
            }
          };

          if (completedTask) {
            status = '✓';
            cellStyle = {
              ...cellStyle,
              font: { color: { argb: 'FFFFFFFF' } },
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } }
            };
          } else if (missedTask) {
            status = missedTask.started ? '⚠' : '✗';
            cellStyle = {
              ...cellStyle,
              font: { color: { argb: missedTask.started ? 'FF000000' : 'FFFFFFFF' } },
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: missedTask.started ? 'FFFFC107' : 'FFF44336' } }
            };
          }

          const cell = row.getCell(hour);
          cell.value = status;
          cell.style = cellStyle;
        });
      });

      // Satır yüksekliklerini ayarla
      worksheet.eachRow((row, rowNumber) => {
        row.height = 40;
      });

      // Boş satır ekle
      worksheet.addRow({});
      worksheet.addRow({});

      // Görev Detayları Başlığı
      const detailsHeaderRow = worksheet.addRow({ date: 'Görev Detayları' });
      detailsHeaderRow.getCell('date').style = {
        font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } }
      };

      // Görev Adı
      worksheet.addRow({ date: 'Görev Adı', [recurringData.taskHours[0]]: selectedTask.name });
      
      // Açıklama
      worksheet.addRow({ date: 'Açıklama', [recurringData.taskHours[0]]: selectedTask.description || '-' });
      
      // Oluşturulma Tarihi
      worksheet.addRow({ 
        date: 'Oluşturulma Tarihi', 
        [recurringData.taskHours[0]]: selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleString('tr-TR') : '-'
      });
      
      // Kabul Edilme Tarihi
      worksheet.addRow({ 
        date: 'Kabul Edilme Tarihi', 
        [recurringData.taskHours[0]]: selectedTask.acceptedAt ? new Date(selectedTask.acceptedAt).toLocaleString('tr-TR') : '-'
      });

      // Personel Bilgileri Başlığı
      worksheet.addRow({});
      const personnelHeaderRow = worksheet.addRow({ date: 'Görev Atanan Personel' });
      personnelHeaderRow.getCell('date').style = {
        font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } }
      };

      // Personel Bilgileri
      if (personnelData) {
        worksheet.addRow({ 
          date: 'Ad Soyad', 
          [recurringData.taskHours[0]]: `${personnelData.firstName || ''} ${personnelData.lastName || ''}`
        });
        worksheet.addRow({ 
          date: 'E-posta', 
          [recurringData.taskHours[0]]: personnelData.email || '-'
        });
      } else {
        worksheet.addRow({ 
          date: 'Personel Bilgisi', 
          [recurringData.taskHours[0]]: 'Personel bilgisi bulunamadı'
        });
      }

      // Detay satırlarına stil uygula
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > dates.length + 2) {
          row.eachCell(cell => {
            cell.style = {
              border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              }
            };
          });
        }
      });

      // Excel dosyasını oluştur ve indir
      const buffer = await workbook.xlsx.writeBuffer();
      const downloadDate = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
      saveAs(new Blob([buffer]), `${selectedTask.name}_TarihAraligi_${downloadDate}.xlsx`);

      // Modalı kapat
      setDateRangeDialogOpen(false);
      setStartDate(null);
      setEndDate(null);

    } catch (error) {
      console.error('Excel dosyası oluşturulurken hata:', error);
      alert('Excel dosyası oluşturulurken bir hata oluştu.');
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
      <ScrollableContent>
        <Container maxWidth="lg">
          {/* Üst Kısım - Görev Seçici */}
          <TaskSelector>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                Görev Seçiniz
              </Typography>
              {selectedTask && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    color="info"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadExcel}
                    size="small"
                  >
                    Excel İndir
                  </Button>
                  {selectedTask.isRecurring && (
                    <>
                      <Button
                        variant="contained"
                        color="info"
                        startIcon={<DownloadIcon />}
                        onClick={handleDownloadMonthlyExcel}
                        size="small"
                      >
                        1 Aylık Rapor İndir
                      </Button>
                      <Button
                        variant="contained"
                        color="info"
                        startIcon={<DownloadIcon />}
                        onClick={() => setDateRangeDialogOpen(true)}
                        size="small"
                      >
                        İki Tarih Arası Rapor İndir
                      </Button>
                    </>
                  )}
                </Box>
              )}
            </Box>
            
            <Autocomplete
              size="small"
              options={taskList}
              getOptionLabel={(option) => option.name || ''}
              value={selectedTask}
              onChange={(event, newValue) => {
                setSelectedTask(newValue);
                if (newValue && newValue.isRecurring) {
                  fetchRecurringTaskData(newValue.id);
                }
                if (newValue && newValue.personnelId) {
                  fetchPersonnelData(newValue.personnelId);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Görev Ara..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <MenuItem {...props}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <IconButton size="small" sx={{ mr: 1, color: 'primary.main' }}>
                      {option.isRecurring ? <RepeatIcon /> : <AssignmentIcon />}
                    </IconButton>
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {option.name}
                    </Typography>
                    <Chip
                      label={getStatusText(option.status)}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(option.status) + '20',
                        color: getStatusColor(option.status),
                        fontWeight: 'medium',
                        height: 20,
                        fontSize: 11,
                      }}
                    />
                  </Box>
                </MenuItem>
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="Görev bulunamadı"
              clearText="Tümünü Temizle"
              openText="Aç"
              closeText="Kapat"
            />
          </TaskSelector>

          {/* Tarih Aralığı Seçim Modalı */}
          <Dialog open={dateRangeDialogOpen} onClose={() => setDateRangeDialogOpen(false)}>
            <DialogTitle>Tarih Aralığı Seçin</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <DatePicker
                  label="Başlangıç Tarihi"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
                <DatePicker
                  label="Bitiş Tarihi"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDateRangeDialogOpen(false)}>İptal</Button>
              <Button 
                onClick={handleDownloadDateRangeExcel}
                variant="contained"
                disabled={!startDate || !endDate}
              >
                İndir
              </Button>
            </DialogActions>
          </Dialog>

          {/* Alt Kısım - Rapor İçeriği */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : taskList.length === 0 ? (
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                my: 8,
                textAlign: 'center'
              }}
            >
              <BarChartIcon sx={{ fontSize: 80, color: 'primary.light', mb: 2 }} />
              <Typography variant="h5" fontWeight="bold" color="primary.main" gutterBottom>
                Henüz rapor oluşturmak için görev yok
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Görev eklediğinizde burada raporlarını görebileceksiniz
              </Typography>
            </Box>
          ) : (
            <>
              {selectedTask ? (
                <ReportContent>
                  {/* Görev Başlık ve Açıklama */}
                  <Box sx={{ display: 'flex', mb: 3 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: 'primary.main' + '10',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                      }}
                    >
                      {selectedTask.isRecurring ? (
                        <RepeatIcon fontSize="large" color="primary" />
                      ) : (
                        <AssignmentIcon fontSize="large" color="primary" />
                      )}
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight="bold" color="primary.main">
                        {selectedTask.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedTask.description || 'Açıklama yok'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ mb: 3 }} />
                  
                  <Typography variant="h6" fontWeight="bold" color="primary.main" gutterBottom>
                    Rapor Detayları
                  </Typography>
                  
                  {/* Görev Türüne Göre İçerik */}
                  {selectedTask.isRecurring ? (
                    /* Tekrarlı Görev Raporu */
                    <Box>
                      {/* Görev Tarihleri */}
                      <StatusCard>
                        <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
                          Görev Tarihleri
                        </Typography>
                        
                        <InfoRow>
                          <IconBox>
                            <CalendarTodayIcon color="primary" />
                          </IconBox>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Oluşturulma Tarihi
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {selectedTask.createdAt 
                                ? new Date(selectedTask.createdAt).toLocaleString('tr-TR')
                                : 'Belirtilmemiş'
                              }
                            </Typography>
                          </Box>
                        </InfoRow>
                        
                        <InfoRow>
                          <IconBox>
                            <CheckCircleOutlineIcon color="primary" />
                          </IconBox>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Kabul Edilme Tarihi
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {selectedTask.acceptedAt 
                                ? new Date(selectedTask.acceptedAt).toLocaleString('tr-TR')
                                : 'Belirtilmemiş'
                              }
                            </Typography>
                          </Box>
                        </InfoRow>
                      </StatusCard>
                      
                      {/* Haftalık Görev Raporu */}
                      <StatusCard>
                        <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
                          Haftalık Görev Raporu
                        </Typography>
                        
                        {recurringDataLoading ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                            <CircularProgress size={30} />
                          </Box>
                        ) : (
                          buildWeeklyTaskTable()
                        )}
                      </StatusCard>
                      
                      {/* Görevli Personel */}
                      <StatusCard>
                        <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
                          Görev Atanan Personel
                        </Typography>
                        
                        {personnelLoading ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                            <CircularProgress size={20} sx={{ mr: 2 }} />
                            <Typography variant="body2">Personel bilgileri yükleniyor...</Typography>
                          </Box>
                        ) : !personnelData ? (
                          <Typography variant="body2" color="text.secondary">
                            Personel bilgisi bulunamadı
                          </Typography>
                        ) : (
                          <Box>
                            <Typography variant="body1" fontWeight="bold">
                              {`${personnelData.firstName || ''} ${personnelData.lastName || ''}`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {personnelData.email || ''}
                            </Typography>
                          </Box>
                        )}
                      </StatusCard>
                    </Box>
                  ) : (
                    /* Normal Görev Raporu */
                    <Box>
                      {/* Görev Tarihleri */}
                      <StatusCard>
                        <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
                          Görev Tarihleri
                        </Typography>
                        
                        <InfoRow>
                          <IconBox>
                            <CalendarTodayIcon color="primary" />
                          </IconBox>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Oluşturulma Tarihi
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {selectedTask.createdAt 
                                ? new Date(selectedTask.createdAt).toLocaleString('tr-TR')
                                : 'Belirtilmemiş'
                              }
                            </Typography>
                          </Box>
                        </InfoRow>
                        
                        <InfoRow>
                          <IconBox>
                            <CheckCircleOutlineIcon color="primary" />
                          </IconBox>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Kabul Edilme Tarihi
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {selectedTask.acceptedAt 
                                ? new Date(selectedTask.acceptedAt).toLocaleString('tr-TR')
                                : 'Belirtilmemiş'
                              }
                            </Typography>
                          </Box>
                        </InfoRow>
                      </StatusCard>
                      
                      {/* Görev Durumu */}
                      <StatusCard>
                        <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
                          Görev Durumu
                        </Typography>
                        
                        {/* Durum çubuğu */}
                        <StatusBar>
                          <StatusStep 
                            active={getStatusLevel(selectedTask.status) >= 1} 
                            sx={{ borderTopLeftRadius: 3, borderBottomLeftRadius: 3 }}
                          />
                          <Box sx={{ width: 4 }} />
                          <StatusStep active={getStatusLevel(selectedTask.status) >= 2} />
                          <Box sx={{ width: 4 }} />
                          <StatusStep 
                            active={getStatusLevel(selectedTask.status) >= 3} 
                            sx={{ borderTopRightRadius: 3, borderBottomRightRadius: 3 }}
                          />
                        </StatusBar>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, mt: 1 }}>
                          <StatusStepLabel active={getStatusLevel(selectedTask.status) === 1}>
                            Beklemede
                          </StatusStepLabel>
                          <StatusStepLabel active={getStatusLevel(selectedTask.status) === 2}>
                            Başladı
                          </StatusStepLabel>
                          <StatusStepLabel active={getStatusLevel(selectedTask.status) === 3}>
                            Tamamlandı
                          </StatusStepLabel>
                        </Box>
                        
                        {/* Görev süresi */}
                        <InfoRow sx={{ mt: 3 }}>
                          <IconBox>
                            <AccessTimeIcon color="primary" />
                          </IconBox>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Toplam Görev Süresi
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {calculateTaskDuration()}
                            </Typography>
                          </Box>
                        </InfoRow>
                      </StatusCard>
                      
                      {/* Görevli Personel */}
                      <StatusCard>
                        <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
                          Görev Atanan Personel
                        </Typography>
                        
                        {personnelLoading ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                            <CircularProgress size={20} sx={{ mr: 2 }} />
                            <Typography variant="body2">Personel bilgileri yükleniyor...</Typography>
                          </Box>
                        ) : !personnelData ? (
                          <Typography variant="body2" color="text.secondary">
                            Personel bilgisi bulunamadı
                          </Typography>
                        ) : (
                          <Box>
                            <Typography variant="body1" fontWeight="bold">
                              {`${personnelData.firstName || ''} ${personnelData.lastName || ''}`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {personnelData.email || ''}
                            </Typography>
                          </Box>
                        )}
                      </StatusCard>
                    </Box>
                  )}
                </ReportContent>
              ) : (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    my: 8,
                    textAlign: 'center'
                  }}
                >
                  <TouchAppIcon sx={{ fontSize: 60, color: 'primary.light', mb: 2 }} />
                  <Typography variant="h6" fontWeight="bold" color="primary.main" gutterBottom>
                    Lütfen yukarıdan bir görev seçin
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Görev seçtiğinizde detaylı raporu burada görüntülenecek
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Container>
      </ScrollableContent>
    </LocalizationProvider>
  );
};

export default Reports; 