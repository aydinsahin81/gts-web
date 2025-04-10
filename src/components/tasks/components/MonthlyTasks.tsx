import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  Avatar,
  Chip,
  Button,
  IconButton,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Delete as DeleteIcon,
  QrCode2 as QrCodeIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  HourglassEmpty as PendingIcon,
  Refresh as RefreshIcon,
  CalendarMonth as MonthIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { database } from '../../../firebase';
import { ref, get, onValue, off } from 'firebase/database';
import dayjs from 'dayjs';
import 'dayjs/locale/tr';

// Özel stil bileşeni - görev zamanları için
interface TaskTimeChipProps {
  label: string;
  size: 'small' | 'medium';
  status: string;
}

const TaskTimeChip: React.FC<TaskTimeChipProps> = ({ label, size, status }) => {
  let bgColor = '';
  let textColor = '';
  
  switch (status) {
    case 'active':
      bgColor = 'primary.50';
      textColor = 'primary.main';
      break;
    case 'upcoming':
      bgColor = 'info.50';
      textColor = 'info.main';
      break;
    case 'completed':
      bgColor = 'success.50';
      textColor = 'success.main';
      break;
    case 'missed':
      bgColor = 'error.50';
      textColor = 'error.main';
      break;
    case 'started':
      bgColor = 'warning.50';
      textColor = 'warning.main';
      break;
    default:
      bgColor = 'grey.100';
      textColor = 'grey.600';
  }
  
  return (
    <Chip
      label={label}
      size={size}
      sx={{
        height: size === 'small' ? 20 : 24,
        fontSize: size === 'small' ? '0.7rem' : '0.75rem',
        bgcolor: bgColor,
        color: textColor
      }}
    />
  );
};

// Ay ismini döndüren yardımcı fonksiyon
const getMonthName = (monthNumber: number): string => {
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  return months[monthNumber];
};

// Görevi ay/gün şeklinde formatlanmış şekilde döndüren yardımcı fonksiyon
const getTaskMonthDays = (task: any) => {
  if (!task) return [];
  
  const result = [];
  
  // task içindeki ay bilgilerini döngüye alıyoruz
  for (const key in task) {
    if (key.startsWith('month')) {
      const monthNumber = parseInt(key.replace('month', ''));
      const monthData = task[key];
      const monthName = getMonthName(monthNumber);
      
      const days = [];
      
      // Ay içindeki günleri döngüye alıyoruz
      for (const dayKey in monthData) {
        if (dayKey.startsWith('day')) {
          const dayNumber = parseInt(dayKey.replace('day', ''));
          const dayData = monthData[dayKey];
          
          days.push({
            day: dayNumber,
            dailyRepetitions: dayData.dailyRepetitions || 1,
            repetitionTimes: dayData.repetitionTimes || []
          });
        }
      }
      
      if (days.length > 0) {
        // Günleri sayısal olarak sırala
        days.sort((a, b) => a.day - b.day);
        
        result.push({
          month: monthNumber,
          monthName,
          days
        });
      }
    }
  }
  
  // Ayları sayısal olarak sırala
  result.sort((a, b) => a.month - b.month);
  
  return result;
};

interface MonthlyTasksTableProps {
  tasks: any[];
  statusFilter: string;
  onShowTaskDetail: (task: any) => void;
  onOpenQrPrintModal: (task: any, event: React.MouseEvent) => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusLabel: (status: string) => string;
  getTaskTimeColor: (task: any, timeString: string) => string;
  companyId: string | null;
  onDeleteTask?: (taskId: string, personnelId: string) => Promise<void>;
}

const MonthlyTasksTable: React.FC<MonthlyTasksTableProps> = ({
  tasks,
  statusFilter,
  onShowTaskDetail,
  onOpenQrPrintModal,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  getTaskTimeColor,
  companyId,
  onDeleteTask
}) => {
  if (tasks.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="textSecondary">
          Gösterilecek görev bulunamadı
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'background.paper' }}>
            <TableCell width={50}>#</TableCell>
            <TableCell>Görev</TableCell>
            <TableCell>Aylar</TableCell>
            <TableCell>Günler / Saatler</TableCell>
            <TableCell width={70}>Tolerans</TableCell>
            <TableCell>Personel</TableCell>
            {statusFilter !== 'completed' && statusFilter !== 'missed' && (
              <TableCell align="right" width={100}>İşlemler</TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => (
            <TableRow 
              key={task.id} 
              hover 
              onClick={() => onShowTaskDetail(task)} 
              sx={{
                cursor: statusFilter === 'completed' || statusFilter === 'missed' ? 'default' : 'pointer'
              }}
            >
              <TableCell>
                <Avatar
                  sx={{
                    width: 32, 
                    height: 32, 
                    bgcolor: `${getStatusColor(task.status)}20`,
                    color: getStatusColor(task.status)
                  }}
                >
                  {getStatusIcon(task.status)}
                </Avatar>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {task.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {getTaskMonthDays(task).map((month) => (
                    <Chip
                      key={month.month}
                      label={month.monthName}
                      size="small"
                      icon={<MonthIcon style={{ fontSize: 16 }} />}
                      sx={{ 
                        height: 20, 
                        fontSize: '0.7rem', 
                        bgcolor: 'info.50', 
                        color: 'info.main'
                      }}
                    />
                  ))}
                </Box>
              </TableCell>
              <TableCell>
                {getTaskMonthDays(task).length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {getTaskMonthDays(task).map((month) => (
                      <Box key={month.month} sx={{ display: 'flex', flexDirection: 'column', mb: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          {month.monthName}:
                        </Typography>
                        {month.days.map((day) => (
                          <Box key={day.day} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', minWidth: 24 }}>
                              {day.day}:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {day.repetitionTimes.map((time: string, index: number) => (
                                <TaskTimeChip
                                  key={index}
                                  label={time}
                                  size="small"
                                  status={getTaskTimeColor(task, time)}
                                />
                              ))}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">-</Typography>
                )}
              </TableCell>
              <TableCell>
                <Chip 
                  label={`${task.startTolerance || 15} dk`}
                  size="small"
                  sx={{ 
                    height: 20, 
                    fontSize: '0.7rem', 
                    bgcolor: 'primary.50', 
                    color: 'primary.main'
                  }}
                />
              </TableCell>
              <TableCell>
                {task.personnelName ? (
                  <Typography variant="body2">{task.personnelName}</Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">Personel silinmiş</Typography>
                )}
              </TableCell>
              
              {statusFilter !== 'completed' && statusFilter !== 'missed' && (
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    size="small"
                    onClick={(e) => onOpenQrPrintModal(task, e)}
                    sx={{ mr: 1, color: 'primary.main' }}
                  >
                    <QrCodeIcon fontSize="small" />
                  </IconButton>
                  
                  <IconButton
                    size="small"
                    color="info"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowTaskDetail(task);
                    }}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Tamamlanan aylık görevler için tablo bileşeni
const CompletedMonthlyTasksTable: React.FC<{
  tasks: any[];
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusLabel: (status: string) => string;
  tableTitle?: string;
}> = ({
  tasks,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  tableTitle = "Tamamlanan Görevler"
}) => {
  // Tarihi formatlama fonksiyonu
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <TableContainer component={Paper} sx={{ 
      mt: 2, 
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
      borderRadius: 2,
      maxHeight: 'calc(100vh - 240px)',
      overflowY: 'auto'
    }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell width="5%">Durum</TableCell>
            <TableCell width="15%">Görev Adı</TableCell>
            <TableCell width="10%">Görev Günü</TableCell>
            <TableCell width="10%">Görev Saati</TableCell>
            <TableCell width="10%">Tolerans</TableCell>
            <TableCell width="15%">Personel</TableCell>
            {tableTitle === "Tamamlanan Görevler" ? (
              <>
                <TableCell width="15%">Başlama Zamanı</TableCell>
                <TableCell width="15%">Bitiş Zamanı</TableCell>
              </>
            ) : (
              <TableCell width="30%">Kaçırılma Zamanı</TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => (
            <TableRow 
              key={task.id} 
              hover
              sx={{ cursor: 'default' }}
            >
              <TableCell>
                <Avatar
                  sx={{
                    width: 32, 
                    height: 32, 
                    bgcolor: `${getStatusColor(task.status)}20`,
                    color: getStatusColor(task.status)
                  }}
                >
                  {getStatusIcon(task.status)}
                </Avatar>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {task.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {task.taskDate || '-'}
                </Typography>
              </TableCell>
              <TableCell>
                <TaskTimeChip
                  label={task.taskTime || '-'}
                  size="small"
                  status={task.status === 'completed' ? "completed" : "missed"}
                />
              </TableCell>
              <TableCell>
                <Chip 
                  label={`${task.startTolerance || 15} dk`}
                  size="small"
                  sx={{ 
                    height: 20, 
                    fontSize: '0.7rem', 
                    bgcolor: 'primary.50', 
                    color: 'primary.main'
                  }}
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" color={task.personnelName ? 'text.secondary' : 'error'} sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  fontSize: '0.8rem'
                }}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem', mr: 1 }}>
                    {task.personnelName ? task.personnelName.charAt(0) : '-'}
                  </Avatar>
                  {task.personnelName || 'Atanmamış'}
                </Typography>
              </TableCell>
              {tableTitle === "Tamamlanan Görevler" ? (
                <>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                      {formatTimestamp(task.startedAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="success.main" fontSize="0.8rem" fontWeight="medium">
                      {formatTimestamp(task.completedAt)}
                    </Typography>
                  </TableCell>
                </>
              ) : (
                <TableCell>
                  <Typography variant="body2" color="error.main" fontSize="0.8rem" fontWeight="medium">
                    {formatTimestamp(task.missedAt)}
                  </Typography>
                </TableCell>
              )}
            </TableRow>
          ))}
          {tasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={tableTitle === "Tamamlanan Görevler" ? 8 : 7} align="center" sx={{ py: 3 }}>
                <Typography color="text.secondary">
                  {tableTitle === "Tamamlanan Görevler" 
                    ? "Tamamlanan görev bulunamadı" 
                    : "Kaçırılan görev bulunamadı"}
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Ana MonthlyTasks bileşeni
interface MonthlyTasksProps {
  companyId: string | null;
  statusFilter: string;
  personnelFilter: string;
  taskSearchTerm: string;
  viewMode: 'card' | 'list';
  personnel: any[];
  onShowTaskDetail: (task: any) => void;
  onOpenQrPrintModal: (task: any, event: React.MouseEvent) => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusLabel: (status: string) => string;
  getTaskTimeColor: (task: any, timeString: string) => string;
  onDeleteTask?: (taskId: string, personnelId: string) => Promise<void>;
  onMonthlyTasksDataChange?: (tasks: any[]) => void;
}

const MonthlyTasks: React.FC<MonthlyTasksProps> = ({
  companyId,
  statusFilter,
  personnelFilter,
  taskSearchTerm,
  viewMode,
  personnel,
  onShowTaskDetail,
  onOpenQrPrintModal,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  getTaskTimeColor,
  onDeleteTask,
  onMonthlyTasksDataChange
}) => {
  const [monthlyTasks, setMonthlyTasks] = useState<any[]>([]);
  const [completedMonthlyTasks, setCompletedMonthlyTasks] = useState<any[]>([]);
  const [missedMonthlyTasks, setMissedMonthlyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Firebase referansları
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    
    const monthlyTasksRef = ref(database, `companies/${companyId}/monthlyTasks`);
    const completedMonthlyTasksRef = ref(database, `companies/${companyId}/completedMonthlyTasks`);
    const missedMonthlyTasksRef = ref(database, `companies/${companyId}/missedMonthlyTasks`);
    const personnelRef = ref(database, `companies/${companyId}/personnel`);
    
    // Verileri tek seferde yükle
    setLoading(true);
    Promise.all([
      get(monthlyTasksRef),
      get(completedMonthlyTasksRef),
      get(missedMonthlyTasksRef),
      get(personnelRef)
    ]).then(([monthlyTasksSnapshot, completedMonthlyTasksSnapshot, missedMonthlyTasksSnapshot, personnelSnapshot]) => {
      const personnelFromDb = personnelSnapshot.exists() ? personnelSnapshot.val() : {};
      
      // Personel verilerini map'e çevir
      const personnelMap = personnel.reduce((acc: Record<string, any>, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});
      
      // Aylık Görevleri İşle
      if (monthlyTasksSnapshot.exists()) {
        const tasksData = monthlyTasksSnapshot.val();
        const tasksList = Object.entries(tasksData).map(([id, data]: [string, any]) => {
          return {
            id,
            ...data,
            personnelName: personnelMap[data.personnelId]?.name || personnelFromDb[data.personnelId]?.name || 'Personel Bulunamadı'
          };
        });
        
        setMonthlyTasks(tasksList.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setMonthlyTasks([]);
      }
      
      // Tamamlanmış Aylık Görevleri İşle
      if (completedMonthlyTasksSnapshot.exists()) {
        const completedTasksData = completedMonthlyTasksSnapshot.val();
        const completedTasksList: any[] = [];
        
        // Tamamlanan görevleri düz bir diziye çevir
        Object.entries(completedTasksData).forEach(([taskId, datesData]: [string, any]) => {
          Object.entries(datesData).forEach(([date, timesData]: [string, any]) => {
            Object.entries(timesData).forEach(([time, taskData]: [string, any]) => {
              completedTasksList.push({
                id: `${taskId}_${date}_${time}`, // Benzersiz ID oluştur
                taskId: taskId, // Ana görevin ID'si
                name: taskData.taskName || 'İsimsiz Görev',
                description: taskData.taskDescription || '',
                status: 'completed',
                taskDate: date,
                taskTime: time,
                startedAt: taskData.startedAt,
                completedAt: taskData.completedAt,
                personnelId: taskData.personnelId || '',
                personnelName: taskData.personnelFirstName ? 
                  `${taskData.personnelFirstName} ${taskData.personnelLastName || ''}` : 
                  personnelMap[taskData.personnelId]?.name || personnelFromDb[taskData.personnelId]?.name || 'Atanmamış',
                startTolerance: taskData.startTolerance || 15,
                fromDatabase: true // Veritabanından gelen bir görev olduğunu işaretle
              });
            });
          });
        });
        
        // Görevleri tamamlanma zamanına göre sırala (yeniden eskiye)
        setCompletedMonthlyTasks(completedTasksList.sort((a, b) => b.completedAt - a.completedAt));
      } else {
        setCompletedMonthlyTasks([]);
      }
      
      // Kaçırılmış Aylık Görevleri İşle
      if (missedMonthlyTasksSnapshot.exists()) {
        const missedTasksData = missedMonthlyTasksSnapshot.val();
        const missedTasksList: any[] = [];
        
        // Kaçırılan görevleri düz bir diziye çevir
        Object.entries(missedTasksData).forEach(([taskId, datesData]: [string, any]) => {
          Object.entries(datesData).forEach(([date, timesData]: [string, any]) => {
            Object.entries(timesData).forEach(([time, taskData]: [string, any]) => {
              missedTasksList.push({
                id: `${taskId}_${date}_${time}`, // Benzersiz ID oluştur
                taskId: taskId, // Ana görevin ID'si
                name: taskData.taskName || 'İsimsiz Görev',
                description: taskData.taskDescription || '',
                status: 'missed',
                taskDate: date,
                taskTime: time,
                missedAt: taskData.missedAt,
                personnelId: taskData.personnelId || '',
                personnelName: taskData.personnelFullName || 
                  personnelMap[taskData.personnelId]?.name || 
                  personnelFromDb[taskData.personnelId]?.name || 'Atanmamış',
                startTolerance: taskData.startTolerance || 15,
                fromDatabase: true // Veritabanından gelen bir görev olduğunu işaretle
              });
            });
          });
        });
        
        // Görevleri kaçırılma zamanına göre sırala (yeniden eskiye)
        setMissedMonthlyTasks(missedTasksList.sort((a, b) => b.missedAt - a.missedAt));
      } else {
        setMissedMonthlyTasks([]);
      }
      
      setLoading(false);
    }).catch(error => {
      console.error('Aylık görevler yüklenirken hata:', error);
      setLoading(false);
    });
    
    // Realtime güncelleme dinleyicileri
    onValue(monthlyTasksRef, (snapshot) => {
      if (snapshot.exists()) {
        const tasksData = snapshot.val();
        const personnelMap = personnel.reduce((acc: Record<string, any>, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
        
        const tasksList = Object.entries(tasksData).map(([id, data]: [string, any]) => {
          return {
            id,
            ...data,
            personnelName: personnelMap[data.personnelId]?.name || 'Personel Bulunamadı'
          };
        });
        
        setMonthlyTasks(tasksList.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setMonthlyTasks([]);
      }
    });
    
    onValue(completedMonthlyTasksRef, (snapshot) => {
      if (snapshot.exists()) {
        const completedTasksData = snapshot.val();
        const personnelMap = personnel.reduce((acc: Record<string, any>, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
        
        const realTimeCompletedTasksList: any[] = [];
        
        // Tamamlanan görevleri düz bir diziye çevir
        Object.entries(completedTasksData).forEach(([taskId, datesData]: [string, any]) => {
          Object.entries(datesData).forEach(([date, timesData]: [string, any]) => {
            Object.entries(timesData).forEach(([time, taskData]: [string, any]) => {
              realTimeCompletedTasksList.push({
                id: `${taskId}_${date}_${time}`, // Benzersiz ID oluştur
                taskId: taskId, // Ana görevin ID'si
                name: taskData.taskName || 'İsimsiz Görev',
                description: taskData.taskDescription || '',
                status: 'completed',
                taskDate: date,
                taskTime: time,
                startedAt: taskData.startedAt,
                completedAt: taskData.completedAt,
                personnelId: taskData.personnelId || '',
                personnelName: taskData.personnelFirstName ? 
                  `${taskData.personnelFirstName} ${taskData.personnelLastName || ''}` : 
                  personnelMap[taskData.personnelId]?.name || 'Atanmamış',
                startTolerance: taskData.startTolerance || 15,
                fromDatabase: true
              });
            });
          });
        });
        
        // Görevleri tamamlanma zamanına göre sırala (yeniden eskiye)
        setCompletedMonthlyTasks(realTimeCompletedTasksList.sort((a, b) => b.completedAt - a.completedAt));
      } else {
        setCompletedMonthlyTasks([]);
      }
    });
    
    onValue(missedMonthlyTasksRef, (snapshot) => {
      if (snapshot.exists()) {
        const missedTasksData = snapshot.val();
        const personnelMap = personnel.reduce((acc: Record<string, any>, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
        
        const realTimeMissedTasksList: any[] = [];
        
        // Kaçırılan görevleri düz bir diziye çevir
        Object.entries(missedTasksData).forEach(([taskId, datesData]: [string, any]) => {
          Object.entries(datesData).forEach(([date, timesData]: [string, any]) => {
            Object.entries(timesData).forEach(([time, taskData]: [string, any]) => {
              realTimeMissedTasksList.push({
                id: `${taskId}_${date}_${time}`, // Benzersiz ID oluştur
                taskId: taskId, // Ana görevin ID'si
                name: taskData.taskName || 'İsimsiz Görev',
                description: taskData.taskDescription || '',
                status: 'missed',
                taskDate: date,
                taskTime: time,
                missedAt: taskData.missedAt,
                personnelId: taskData.personnelId || '',
                personnelName: taskData.personnelFullName || 
                  personnelMap[taskData.personnelId]?.name || 'Atanmamış',
                startTolerance: taskData.startTolerance || 15,
                fromDatabase: true
              });
            });
          });
        });
        
        // Görevleri kaçırılma zamanına göre sırala (yeniden eskiye)
        setMissedMonthlyTasks(realTimeMissedTasksList.sort((a, b) => b.missedAt - a.missedAt));
      } else {
        setMissedMonthlyTasks([]);
      }
    });
    
    // Temizlik
    return () => {
      off(monthlyTasksRef);
      off(completedMonthlyTasksRef);
      off(missedMonthlyTasksRef);
    };
  }, [companyId, personnel]);
  
  // Görevleri filtrele - durum, personel ve arama terimine göre
  const filteredTasks = React.useMemo(() => {
    let result = [...monthlyTasks];
    
    // Duruma göre filtrele
    if (statusFilter !== 'all') {
      if (statusFilter === 'completed') {
        // Tamamlanan görevler CompletedMonthlyTasksTable'da gösterildiğinden boş dizi döndürüyoruz
        return [];
      }
      
      if (statusFilter === 'missed') {
        // Kaçırılan görevler için
        return [];
      }
      
      result = result.filter(task => task.status === statusFilter);
    }
    
    // Personele göre filtrele
    if (personnelFilter !== 'all') {
      result = result.filter(task => task.personnelId === personnelFilter);
    }
    
    // Arama terimine göre filtrele
    if (taskSearchTerm) {
      const searchLower = taskSearchTerm.toLowerCase();
      result = result.filter(task => 
        task.name.toLowerCase().includes(searchLower) || 
        task.description.toLowerCase().includes(searchLower) ||
        task.personnelName.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [monthlyTasks, statusFilter, personnelFilter, taskSearchTerm]);
  
  // Tamamlanan görevleri filtrele
  const filteredCompletedTasks = useMemo(() => {
    let result = [...completedMonthlyTasks];
    
    // Personel filtresi uygulanıyor
    if (personnelFilter !== 'all') {
      result = result.filter(task => task.personnelId === personnelFilter);
    }

    // Görev arama filtresi uygulanıyor
    if (taskSearchTerm !== '') {
      result = result.filter(task => 
        task.name.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(taskSearchTerm.toLowerCase())
      );
    }
    
    return result;
  }, [completedMonthlyTasks, personnelFilter, taskSearchTerm]);
  
  // Filtrelenmiş kaçırılan görevler
  const filteredMissedTasks = useMemo(() => {
    let result = [...missedMonthlyTasks];
    
    // Personel filtresi uygulanıyor
    if (personnelFilter !== 'all') {
      result = result.filter(task => task.personnelId === personnelFilter);
    }

    // Görev arama filtresi uygulanıyor
    if (taskSearchTerm !== '') {
      result = result.filter(task => 
        task.name.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(taskSearchTerm.toLowerCase())
      );
    }
    
    return result;
  }, [missedMonthlyTasks, personnelFilter, taskSearchTerm]);
  
  // Filtrelenmiş verileri üst bileşene gönder
  useEffect(() => {
    if (onMonthlyTasksDataChange) {
      const tasksToExport = statusFilter === 'completed' ? filteredCompletedTasks : 
                            statusFilter === 'missed' ? filteredMissedTasks : 
                            filteredTasks;
      onMonthlyTasksDataChange(tasksToExport);
    }
  }, [filteredTasks, filteredCompletedTasks, filteredMissedTasks, statusFilter, onMonthlyTasksDataChange]);
  
  // Yükleniyor
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 4 }}>
        <CircularProgress size={40} />
      </Box>
    );
  }
  
  // Görev yoksa
  if (monthlyTasks.length === 0 && statusFilter !== 'completed') {
    return (
      <Box sx={{ textAlign: 'center', my: 8 }}>
        <AssignmentIcon sx={{ fontSize: 60, color: 'primary.light', mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          {
            statusFilter === 'all' && personnelFilter === 'all'
              ? 'Henüz hiç aylık görev eklenmemiş'
              : 'Filtrelere uygun aylık görev bulunamadı'
          }
        </Typography>
      </Box>
    );
  }

  if (statusFilter === 'completed' && completedMonthlyTasks.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', my: 8 }}>
        <AssignmentIcon sx={{ fontSize: 60, color: 'primary.light', mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          Tamamlanan aylık görev bulunamadı
        </Typography>
      </Box>
    );
  }

  if (statusFilter === 'missed' && missedMonthlyTasks.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', my: 8 }}>
        <AssignmentIcon sx={{ fontSize: 60, color: 'primary.light', mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          Kaçırılmış aylık görev bulunamadı
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {viewMode === 'card' ? (
        <Grid container spacing={3}>
          {statusFilter === 'completed' && filteredCompletedTasks.length > 0 ? (
            // Tamamlanan görevler için kart görünümü
            filteredCompletedTasks.map((task) => (
              <Grid item xs={12} sm={6} md={4} key={task.id}>
                <Card 
                  onClick={() => onShowTaskDetail(task)}
                  sx={{
                    height: '100%',
                    borderRadius: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <CardContent>
                    {/* Kart başlığı */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: `${getStatusColor('completed')}20`,
                          color: getStatusColor('completed'),
                          mr: 1,
                        }}
                      >
                        {getStatusIcon('completed')}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold" noWrap>
                          {task.name}
                        </Typography>
                        <Chip
                          label={getStatusLabel('completed')}
                          size="small"
                          sx={{
                            bgcolor: `${getStatusColor('completed')}20`,
                            color: getStatusColor('completed'),
                            fontWeight: 'medium',
                            height: 20,
                            fontSize: 11,
                          }}
                        />
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 1.5 }} />

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        flexGrow: 0,
                      }}
                    >
                      {task.description || 'Açıklama yok'}
                    </Typography>

                    {/* Aylar */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="body2" fontWeight="medium" color="primary" gutterBottom>
                        Aylar:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {getTaskMonthDays(task).map((month) => (
                          <Chip
                            key={month.month}
                            label={month.monthName}
                            size="small"
                            icon={<MonthIcon style={{ fontSize: 16 }} />}
                            sx={{ 
                              height: 20, 
                              fontSize: '0.7rem', 
                              bgcolor: 'info.50', 
                              color: 'info.main'
                            }}
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Görev Saatleri */}
                    {getTaskMonthDays(task).length > 0 && (
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="body2" fontWeight="medium" color="primary" gutterBottom>
                          Görev Saatleri:
                        </Typography>
                        {getTaskMonthDays(task).map((month) => (
                          <Box key={month.month} sx={{ mb: 1 }}>
                            <Typography variant="caption" fontWeight="bold">
                              {month.monthName}:
                            </Typography>
                            {month.days.map((dayData) => (
                              <Box key={dayData.day} sx={{ mt: 0.5 }}>
                                <Typography variant="caption" sx={{ fontWeight: 'bold', minWidth: 24, display: 'inline-block' }}>
                                  {dayData.day}.
                                </Typography>
                                <Box sx={{ display: 'inline-flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                                  {dayData.repetitionTimes.map((time: string, index: number) => (
                                    <TaskTimeChip
                                      key={index}
                                      label={time}
                                      size="small"
                                      status={getTaskTimeColor(task, time)}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* Tamamlanma zamanı */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="body2" fontWeight="medium" color="success.main" gutterBottom>
                        Tamamlanma Zamanı:
                      </Typography>
                      <Typography variant="body2">
                        {task.completedAtFormatted}
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">
                        <b>Personel:</b> {task.personnelName}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : statusFilter === 'missed' && filteredMissedTasks.length > 0 ? (
            // Kaçırılan görevler için kart görünümü
            filteredMissedTasks.map((task) => (
              <Grid item xs={12} sm={6} md={4} key={task.id}>
                <Card 
                  onClick={() => onShowTaskDetail(task)}
                  sx={{
                    height: '100%',
                    borderRadius: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <CardContent>
                    {/* Kart başlığı */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: `${getStatusColor('missed')}20`,
                          color: getStatusColor('missed'),
                          mr: 1,
                        }}
                      >
                        {getStatusIcon('missed')}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold" noWrap>
                          {task.name}
                        </Typography>
                        <Chip
                          label={getStatusLabel('missed')}
                          size="small"
                          sx={{
                            bgcolor: `${getStatusColor('missed')}20`,
                            color: getStatusColor('missed'),
                            fontWeight: 'medium',
                            height: 20,
                            fontSize: 11,
                          }}
                        />
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 1.5 }} />

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        flexGrow: 0,
                      }}
                    >
                      {task.description || 'Açıklama yok'}
                    </Typography>

                    {/* Aylar */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="body2" fontWeight="medium" color="primary" gutterBottom>
                        Aylar:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {getTaskMonthDays(task).map((month) => (
                          <Chip
                            key={month.month}
                            label={month.monthName}
                            size="small"
                            icon={<MonthIcon style={{ fontSize: 16 }} />}
                            sx={{ 
                              height: 20, 
                              fontSize: '0.7rem', 
                              bgcolor: 'info.50', 
                              color: 'info.main'
                            }}
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Görev Saatleri */}
                    {getTaskMonthDays(task).length > 0 && (
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="body2" fontWeight="medium" color="primary" gutterBottom>
                          Görev Saatleri:
                        </Typography>
                        {getTaskMonthDays(task).map((month) => (
                          <Box key={month.month} sx={{ mb: 1 }}>
                            <Typography variant="caption" fontWeight="bold">
                              {month.monthName}:
                            </Typography>
                            {month.days.map((dayData) => (
                              <Box key={dayData.day} sx={{ mt: 0.5 }}>
                                <Typography variant="caption" sx={{ display: 'inline-block', minWidth: 24 }}>
                                  {dayData.day}.
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                  {dayData.repetitionTimes.map((time: string, index: number) => (
                                    <TaskTimeChip
                                      key={index}
                                      label={time}
                                      size="small"
                                      status={getTaskTimeColor(task, time)}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* Kaçırılma zamanı */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="body2" fontWeight="medium" color="error.main" gutterBottom>
                        Kaçırılma Zamanı:
                      </Typography>
                      <Typography variant="body2">
                        {task.missedAtFormatted}
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">
                        <b>Personel:</b> {task.personnelName}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            // Normal görevler için kart görünümü
            filteredTasks.map((task) => (
              <Grid item xs={12} sm={6} md={4} key={task.id}>
                <Card 
                  onClick={() => onShowTaskDetail(task)}
                  sx={{
                    height: '100%',
                    borderRadius: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    cursor: statusFilter === 'completed' || statusFilter === 'missed' ? 'default' : 'pointer',
                    '&:hover': {
                      boxShadow: statusFilter === 'completed' || statusFilter === 'missed' 
                        ? '0 4px 12px rgba(0,0,0,0.05)' 
                        : '0 6px 16px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: `${getStatusColor(task.status)}20`,
                          color: getStatusColor(task.status),
                          mr: 1,
                        }}
                      >
                        {getStatusIcon(task.status)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold" noWrap>
                          {task.name}
                        </Typography>
                        <Chip
                          label={getStatusLabel(task.status)}
                          size="small"
                          sx={{
                            bgcolor: `${getStatusColor(task.status)}20`,
                            color: getStatusColor(task.status),
                            fontWeight: 'medium',
                            height: 20,
                            fontSize: 11,
                          }}
                        />
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 1.5 }} />

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        flexGrow: 0,
                      }}
                    >
                      {task.description || 'Açıklama yok'}
                    </Typography>

                    {/* Ay çipleri */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="body2" fontWeight="medium" color="primary" gutterBottom>
                        Aylar:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {getTaskMonthDays(task).map((month) => (
                          <Chip
                            key={month.month}
                            label={month.monthName}
                            size="small"
                            icon={<MonthIcon style={{ fontSize: 16 }} />}
                            sx={{ 
                              height: 20, 
                              fontSize: '0.7rem', 
                              bgcolor: 'info.50', 
                              color: 'info.main'
                            }}
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Ay/Gün/Saat bilgileri */}
                    {getTaskMonthDays(task).length > 0 && (
                      <Box sx={{ mb: 1.5 }}>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body2" fontWeight="medium" color="primary" gutterBottom>
                          Görev Saatleri:
                        </Typography>
                        {getTaskMonthDays(task).map((month) => (
                          <Box key={month.month} sx={{ mb: 1.5 }}>
                            <Typography variant="caption" fontWeight="bold">
                              {month.monthName}:
                            </Typography>
                            {month.days.map((dayData) => (
                              <Box key={dayData.day} sx={{ mt: 0.5 }}>
                                <Typography variant="caption" sx={{ display: 'inline-block', minWidth: 24 }}>
                                  {dayData.day}.
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                  {dayData.repetitionTimes.map((time: string, index: number) => (
                                    <TaskTimeChip
                                      key={index}
                                      label={time}
                                      size="small"
                                      status={getTaskTimeColor(task, time)}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        ))}
                        <Chip 
                          label={`${task.startTolerance || 15} dk tolerans`}
                          size="small"
                          sx={{ 
                            mt: 1,
                            height: 20, 
                            fontSize: '0.7rem', 
                            bgcolor: 'primary.50', 
                            color: 'primary.main'
                          }}
                        />
                      </Box>
                    )}

                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">
                        <b>Personel:</b> {task.personnelName}
                      </Typography>
                      
                      <Box>
                        {statusFilter !== 'completed' && statusFilter !== 'missed' && (
                          <>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenQrPrintModal(task, e);
                              }}
                              sx={{ mr: 1, color: 'primary.main' }}
                            >
                              <QrCodeIcon fontSize="small" />
                            </IconButton>
                            
                            <IconButton
                              size="small"
                              color="info"
                              onClick={(e) => {
                                e.stopPropagation();
                                onShowTaskDetail(task);
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      ) : (
        <>
          {statusFilter === 'completed' ? (
            // Tamamlanan görevler için özel tablo gösterimi
            <CompletedMonthlyTasksTable 
              tasks={filteredCompletedTasks}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              getStatusLabel={getStatusLabel}
              tableTitle="Tamamlanan Görevler"
            />
          ) : statusFilter === 'missed' ? (
            // Kaçırılan görevler için özel tablo gösterimi
            <CompletedMonthlyTasksTable 
              tasks={filteredMissedTasks}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              getStatusLabel={getStatusLabel}
              tableTitle="Kaçırılan Görevler"
            />
          ) : (
            // Normal görevler için standart tablo gösterimi
            <MonthlyTasksTable 
              tasks={filteredTasks}
              statusFilter={statusFilter}
              onShowTaskDetail={onShowTaskDetail}
              onOpenQrPrintModal={onOpenQrPrintModal}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              getStatusLabel={getStatusLabel}
              getTaskTimeColor={getTaskTimeColor}
              companyId={companyId}
              onDeleteTask={onDeleteTask}
            />
          )}
        </>
      )}
    </>
  );
};

export default MonthlyTasks; 