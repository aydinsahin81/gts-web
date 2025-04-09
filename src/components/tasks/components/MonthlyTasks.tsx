import React, { useState, useEffect } from 'react';
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
  Print as PrintIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  HourglassEmpty as PendingIcon,
  Refresh as RefreshIcon,
  CalendarMonth as MonthIcon
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
        result.push({
          month: monthNumber,
          monthName,
          days
        });
      }
    }
  }
  
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
            <TableCell>Sorumlu</TableCell>
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
                    <PrintIcon fontSize="small" />
                  </IconButton>
                  
                  {onDeleteTask && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Bu görevi silmek istediğinize emin misiniz?')) {
                          onDeleteTask(task.id, task.personnelId);
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Tamamlanan Aylık Görevler Tablosu
const CompletedMonthlyTasksTable: React.FC<{
  tasks: any[];
  onShowTaskDetail: (task: any) => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusLabel: (status: string) => string;
}> = ({
  tasks,
  onShowTaskDetail,
  getStatusColor,
  getStatusIcon,
  getStatusLabel
}) => {
  if (tasks.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="textSecondary">
          Tamamlanan görev bulunamadı
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
            <TableCell>Tamamlanan Zaman</TableCell>
            <TableCell>Sorumlu</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => (
            <TableRow 
              key={task.id} 
              hover 
              onClick={() => onShowTaskDetail(task)} 
              sx={{ cursor: 'pointer' }}
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
                <Typography variant="caption" color="text.secondary">
                  {task.description}
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
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckIcon sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
                  <Typography variant="body2">
                    {task.completedAtFormatted}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                {task.personnelName ? (
                  <Typography variant="body2">{task.personnelName}</Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">Personel silinmiş</Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
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
  onDeleteTask
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
        const completedTasksList = Object.entries(completedTasksData).map(([taskId, datesData]: [string, any]) => {
          // En son tamamlanan görevi bul
          let latestCompletedTask = null;
          let latestTimestamp = 0;
          
          Object.entries(datesData).forEach(([dateKey, timesData]: [string, any]) => {
            Object.entries(timesData).forEach(([timeKey, taskData]: [string, any]) => {
              if (taskData.completedAt && taskData.completedAt > latestTimestamp) {
                latestTimestamp = taskData.completedAt;
                latestCompletedTask = {
                  id: taskId,
                  ...taskData,
                  completedAtFormatted: dayjs(taskData.completedAt).format('DD.MM.YYYY HH:mm'),
                  personnelName: personnelMap[taskData.personnelId]?.name || 'Personel Bulunamadı'
                };
              }
            });
          });
          
          return latestCompletedTask;
        }).filter(Boolean) as any[];
        
        setCompletedMonthlyTasks(completedTasksList.sort((a, b) => {
          if (!a || !b) return 0;
          return b.completedAt - a.completedAt;
        }));
      } else {
        setCompletedMonthlyTasks([]);
      }
      
      // Kaçırılmış Aylık Görevleri İşle
      if (missedMonthlyTasksSnapshot.exists()) {
        const missedTasksData = missedMonthlyTasksSnapshot.val();
        const missedTasksList = Object.entries(missedTasksData).map(([taskId, datesData]: [string, any]) => {
          // En son kaçırılan görevi bul
          let latestMissedTask = null;
          let latestTimestamp = 0;
          
          Object.entries(datesData).forEach(([dateKey, timesData]: [string, any]) => {
            Object.entries(timesData).forEach(([timeKey, taskData]: [string, any]) => {
              if (taskData.missedAt && taskData.missedAt > latestTimestamp) {
                latestTimestamp = taskData.missedAt;
                latestMissedTask = {
                  id: taskId,
                  ...taskData,
                  missedAtFormatted: dayjs(taskData.missedAt).format('DD.MM.YYYY HH:mm'),
                  personnelName: personnelMap[taskData.personnelId]?.name || 'Personel Bulunamadı'
                };
              }
            });
          });
          
          return latestMissedTask;
        }).filter(Boolean) as any[];
        
        setMissedMonthlyTasks(missedTasksList.sort((a, b) => {
          if (!a || !b) return 0; 
          return b.missedAt - a.missedAt;
        }));
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
        
        const completedTasksList = Object.entries(completedTasksData).map(([taskId, datesData]: [string, any]) => {
          // En son tamamlanan görevi bul
          let latestCompletedTask = null;
          let latestTimestamp = 0;
          
          Object.entries(datesData).forEach(([dateKey, timesData]: [string, any]) => {
            Object.entries(timesData).forEach(([timeKey, taskData]: [string, any]) => {
              if (taskData.completedAt && taskData.completedAt > latestTimestamp) {
                latestTimestamp = taskData.completedAt;
                latestCompletedTask = {
                  id: taskId,
                  ...taskData,
                  completedAtFormatted: dayjs(taskData.completedAt).format('DD.MM.YYYY HH:mm'),
                  personnelName: personnelMap[taskData.personnelId]?.name || 'Personel Bulunamadı'
                };
              }
            });
          });
          
          return latestCompletedTask;
        }).filter(Boolean) as any[];
        
        setCompletedMonthlyTasks(completedTasksList.sort((a, b) => {
          if (!a || !b) return 0;
          return b.completedAt - a.completedAt;
        }));
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
        
        const missedTasksList = Object.entries(missedTasksData).map(([taskId, datesData]: [string, any]) => {
          // En son kaçırılan görevi bul
          let latestMissedTask = null;
          let latestTimestamp = 0;
          
          Object.entries(datesData).forEach(([dateKey, timesData]: [string, any]) => {
            Object.entries(timesData).forEach(([timeKey, taskData]: [string, any]) => {
              if (taskData.missedAt && taskData.missedAt > latestTimestamp) {
                latestTimestamp = taskData.missedAt;
                latestMissedTask = {
                  id: taskId,
                  ...taskData,
                  missedAtFormatted: dayjs(taskData.missedAt).format('DD.MM.YYYY HH:mm'),
                  personnelName: personnelMap[taskData.personnelId]?.name || 'Personel Bulunamadı'
                };
              }
            });
          });
          
          return latestMissedTask;
        }).filter(Boolean) as any[];
        
        setMissedMonthlyTasks(missedTasksList.sort((a, b) => {
          if (!a || !b) return 0;
          return b.missedAt - a.missedAt;
        }));
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
  
  // Tamamlanmış görevleri filtrele
  const filteredCompletedTasks = React.useMemo(() => {
    let result = [...completedMonthlyTasks];
    
    // Personele göre filtrele
    if (personnelFilter !== 'all') {
      result = result.filter(task => task.personnelId === personnelFilter);
    }
    
    // Arama terimine göre filtrele
    if (taskSearchTerm) {
      const searchLower = taskSearchTerm.toLowerCase();
      result = result.filter(task => 
        task.name.toLowerCase().includes(searchLower) || 
        (task.description && task.description.toLowerCase().includes(searchLower)) ||
        task.personnelName.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [completedMonthlyTasks, personnelFilter, taskSearchTerm]);
  
  // Kaçırılan görevleri filtrele
  const filteredMissedTasks = React.useMemo(() => {
    let result = [...missedMonthlyTasks];
    
    // Personele göre filtrele
    if (personnelFilter !== 'all') {
      result = result.filter(task => task.personnelId === personnelFilter);
    }
    
    // Arama terimine göre filtrele
    if (taskSearchTerm) {
      const searchLower = taskSearchTerm.toLowerCase();
      result = result.filter(task => 
        task.name.toLowerCase().includes(searchLower) || 
        (task.description && task.description.toLowerCase().includes(searchLower)) ||
        task.personnelName.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [missedMonthlyTasks, personnelFilter, taskSearchTerm]);
  
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
          {filteredTasks.map((task) => (
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
                      <b>Sorumlu:</b> {task.personnelName}
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
                            <PrintIcon fontSize="small" />
                          </IconButton>
                          
                          {onDeleteTask && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Bu görevi silmek istediğinize emin misiniz?')) {
                                  onDeleteTask(task.id, task.personnelId);
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          {statusFilter === 'completed' ? (
            <CompletedMonthlyTasksTable
              tasks={filteredCompletedTasks}
              onShowTaskDetail={onShowTaskDetail}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              getStatusLabel={getStatusLabel}
            />
          ) : statusFilter === 'missed' ? (
            <CompletedMonthlyTasksTable
              tasks={filteredMissedTasks}
              onShowTaskDetail={onShowTaskDetail}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              getStatusLabel={getStatusLabel}
            />
          ) : (
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