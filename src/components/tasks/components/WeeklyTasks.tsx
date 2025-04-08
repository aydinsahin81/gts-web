import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Grid,
  Divider,
  CircularProgress,
  IconButton,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button
} from '@mui/material';
import {
  TaskAlt as TaskIcon,
  Person as PersonIcon,
  CheckCircle as CompletedIcon,
  PendingActions as PendingIcon,
  PlayCircleFilled as StartedIcon,
  Assignment as AssignmentIcon,
  QrCode as QrCodeIcon,
} from '@mui/icons-material';
import { ref, get, onValue, off } from 'firebase/database';
import { database } from '../../../firebase';
import TimeService from '../../../services/TimeService';

// Görev zamanı chip bileşeni (Tasks.tsx'den alındı)
const TaskTimeChip = ({ status, label, size }: { status: string, label: string, size: "small" | "medium" }) => (
  <Chip
    label={label}
    size={size}
    sx={{ 
      backgroundColor: `${status}20`,
      color: status,
      fontSize: '0.7rem',
      height: 20
    }}
  />
);

// Haftanın günlerini temsil eden nesneler
const weekDays = [
  { value: 0, label: 'Pazar', shortLabel: 'Pz' },
  { value: 1, label: 'Pazartesi', shortLabel: 'Pt' },
  { value: 2, label: 'Salı', shortLabel: 'Sa' },
  { value: 3, label: 'Çarşamba', shortLabel: 'Ça' },
  { value: 4, label: 'Perşembe', shortLabel: 'Pe' },
  { value: 5, label: 'Cuma', shortLabel: 'Cu' },
  { value: 6, label: 'Cumartesi', shortLabel: 'Ct' }
];

// Gün adını al
const getDayName = (dayNumber: number) => {
  const day = weekDays.find(d => d.value === dayNumber);
  return day ? day.label : 'Bilinmeyen Gün';
};

// Günleri bul
const getTaskDays = (task: any) => {
  if (!task || !task.days) return [];
  
  return Object.keys(task.days).map(day => ({
    day: parseInt(day),
    dayName: getDayName(parseInt(day)),
    repetitionTimes: task.days[day].repetitionTimes || [],
    dailyRepetitions: task.days[day].dailyRepetitions || 1
  }));
};

interface WeeklyTasksTableProps {
  tasks: any[];
  statusFilter: string;
  onShowTaskDetail: (task: any) => void;
  onOpenQrPrintModal: (task: any, event: React.MouseEvent) => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusLabel: (status: string) => string;
  getTaskTimeColor: (task: any, timeString: string) => string;
}

// Haftalık görevler için tablo görünümü
const WeeklyTasksTable: React.FC<WeeklyTasksTableProps> = ({
  tasks,
  statusFilter,
  onShowTaskDetail,
  onOpenQrPrintModal,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  getTaskTimeColor
}) => {
  return (
    <TableContainer component={Paper} sx={{ 
      mt: 2, 
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
      borderRadius: 2,
      maxHeight: 'calc(100vh - 240px)',  // Tablonun maksimum yüksekliği
      overflowY: 'auto'
    }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell width="5%">Durum</TableCell>
            <TableCell width="15%">Görev Adı</TableCell>
            <TableCell width="20%">Görev Günleri</TableCell>
            <TableCell width="20%">Görev Saatleri</TableCell>
            <TableCell width="10%">Tolerans</TableCell>
            <TableCell width="10%">Personel</TableCell>
            <TableCell width="10%">Durum</TableCell>
            <TableCell width="10%" align="right">İşlemler</TableCell>
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
                  {getTaskDays(task).map((day) => (
                    <Chip
                      key={day.day}
                      label={day.dayName}
                      size="small"
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
                {getTaskDays(task).length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {getTaskDays(task).map((day) => (
                      <Box key={day.day} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', minWidth: 24 }}>
                          {day.dayName.substring(0, 2)}:
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
                <Typography variant="body2" color={task.personnelName ? 'text.secondary' : 'error'} sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  fontSize: '0.8rem'
                }}>
                  <PersonIcon fontSize="small" sx={{ mr: 0.5, fontSize: 16 }} />
                  {task.personnelName || 'Atanmamış'}
                </Typography>
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {task.completionType === 'qr' && !task.fromDatabase && statusFilter !== 'completed' && statusFilter !== 'missed' && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenQrPrintModal(task, e);
                      }}
                      sx={{ color: 'primary.main', p: 0.5 }}
                    >
                      <QrCodeIcon fontSize="small" />
                    </IconButton>
                  )}
                  {statusFilter !== 'completed' && statusFilter !== 'missed' && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowTaskDetail(task);
                      }}
                      sx={{ color: 'info.main', p: 0.5, ml: 0.5 }}
                    >
                      <AssignmentIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
          {tasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                <Typography color="text.secondary">
                  Görev bulunamadı
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

interface WeeklyTasksProps {
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

const WeeklyTasks: React.FC<WeeklyTasksProps> = ({
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
  const [loading, setLoading] = useState(true);
  const [weeklyTasks, setWeeklyTasks] = useState<any[]>([]);
  const [completedWeeklyTasks, setCompletedWeeklyTasks] = useState<any[]>([]);
  const [missedWeeklyTasks, setMissedWeeklyTasks] = useState<any[]>([]);

  // Veritabanından haftalık görevleri çekme
  useEffect(() => {
    if (!companyId) return;

    setLoading(true);

    // Haftalık görevleri, tamamlanan ve kaçırılan görevleri almak için referanslar oluştur
    const weeklyTasksRef = ref(database, `companies/${companyId}/weeklyTasks`);
    const completedWeeklyTasksRef = ref(database, `companies/${companyId}/completedWeeklyTasks`);
    const missedWeeklyTasksRef = ref(database, `companies/${companyId}/missedWeeklyTasks`);

    // Personel verilerini almak için referans
    const personnelRef = ref(database, `companies/${companyId}/personnel`);

    // Verinin bir kez alınması
    Promise.all([
      get(weeklyTasksRef),
      get(completedWeeklyTasksRef),
      get(missedWeeklyTasksRef),
      get(personnelRef)
    ]).then(([weeklyTasksSnapshot, completedWeeklyTasksSnapshot, missedWeeklyTasksSnapshot, personnelSnapshot]) => {
      // Personel verilerini çek
      const personnelData = personnelSnapshot.exists() ? personnelSnapshot.val() : {};

      // Haftalık görevleri işle
      if (weeklyTasksSnapshot.exists()) {
        const tasksData = weeklyTasksSnapshot.val();
        const tasksList = Object.entries(tasksData).map(([id, data]: [string, any]) => {
          // Personel bilgisini bul
          const personnelId = data.personnelId || '';
          const personnelInfo = personnelData[personnelId] || {};
          
          return {
            id,
            name: data.name || 'İsimsiz Görev',
            description: data.description || '',
            status: data.status || 'pending',
            createdAt: data.createdAt || Date.now(),
            personnelId: personnelId,
            personnelName: personnelInfo.name || 'Atanmamış',
            completionType: data.completionType || 'button',
            startTolerance: data.startTolerance || 15,
            days: data.days || {},
            groupId: data.groupId || undefined,
          };
        });

        // Görevleri oluşturulma tarihine göre sırala (yeniden eskiye)
        setWeeklyTasks(tasksList.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setWeeklyTasks([]);
      }

      // TODO: Tamamlanan haftalık görevleri işle
      if (completedWeeklyTasksSnapshot.exists()) {
        // Tamamlanan görevleri işleme
        setCompletedWeeklyTasks([]);
      } else {
        setCompletedWeeklyTasks([]);
      }

      // TODO: Kaçırılan haftalık görevleri işle
      if (missedWeeklyTasksSnapshot.exists()) {
        // Kaçırılan görevleri işleme
        setMissedWeeklyTasks([]);
      } else {
        setMissedWeeklyTasks([]);
      }

      setLoading(false);
    }).catch(error => {
      console.error("Haftalık görevleri yüklerken hata:", error);
      setLoading(false);
    });

    // Realtime veritabanı dinleyicileri
    onValue(weeklyTasksRef, (snapshot) => {
      // Personel bilgilerini al
      get(personnelRef).then((personnelSnapshot) => {
        const personnelData = personnelSnapshot.exists() ? personnelSnapshot.val() : {};
        
        if (snapshot.exists()) {
          const tasksData = snapshot.val();
          const tasksList = Object.entries(tasksData).map(([id, data]: [string, any]) => {
            // Personel bilgisini bul
            const personnelId = data.personnelId || '';
            const personnelInfo = personnelData[personnelId] || {};
            
            return {
              id,
              name: data.name || 'İsimsiz Görev',
              description: data.description || '',
              status: data.status || 'pending',
              createdAt: data.createdAt || Date.now(),
              personnelId: personnelId,
              personnelName: personnelInfo.name || 'Atanmamış',
              completionType: data.completionType || 'button',
              startTolerance: data.startTolerance || 15,
              days: data.days || {},
              groupId: data.groupId || undefined,
            };
          });

          // Görevleri oluşturulma tarihine göre sırala (yeniden eskiye)
          setWeeklyTasks(tasksList.sort((a, b) => b.createdAt - a.createdAt));
        } else {
          setWeeklyTasks([]);
        }
      });
    });

    // TODO: Tamamlanan ve kaçırılan görevler için dinleyiciler eklenecek

    // Cleanup
    return () => {
      off(weeklyTasksRef);
      off(completedWeeklyTasksRef);
      off(missedWeeklyTasksRef);
    };
  }, [companyId]);

  // Görevleri filtrele
  const filteredTasks = useMemo(() => {
    let result = [...weeklyTasks];
    
    // Durum filtresi uygulanıyor
    if (statusFilter !== 'all') {
      if (statusFilter === 'completed') {
        // Ana görev listesindeki tamamlanan görevler + veritabanındaki tamamlanan görevler
        result = [
          ...result.filter(task => task.status === 'completed'),
          ...completedWeeklyTasks
        ];
      } else if (statusFilter === 'missed') {
        // Ana görev listesindeki kaçırılan görevler + veritabanındaki kaçırılan görevler
        result = [
          ...result.filter(task => task.status === 'missed'),
          ...missedWeeklyTasks
        ];
      } else {
        // Diğer durumlar için normal filtreleme
        result = result.filter(task => task.status === statusFilter);
      }
    }
    
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
  }, [weeklyTasks, completedWeeklyTasks, missedWeeklyTasks, statusFilter, personnelFilter, taskSearchTerm]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (weeklyTasks.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', my: 8 }}>
        <AssignmentIcon sx={{ fontSize: 60, color: 'primary.light', mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          {
            statusFilter === 'all' && personnelFilter === 'all'
              ? 'Henüz hiç haftalık görev eklenmemiş'
              : 'Filtrelere uygun haftalık görev bulunamadı'
          }
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
                <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
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

                  <Box sx={{ mb: 2, flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight="medium" color="primary" gutterBottom>
                      Haftanın Günleri:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {getTaskDays(task).map((day) => (
                        <Chip
                          key={day.day}
                          label={day.dayName}
                          size="small"
                          sx={{ 
                            height: 24, 
                            fontSize: '0.75rem', 
                            bgcolor: 'info.50', 
                            color: 'info.main'
                          }}
                        />
                      ))}
                    </Box>
                  </Box>

                  {getTaskDays(task).length > 0 && (
                    <Box sx={{ mb: 1.5 }}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" fontWeight="medium" color="primary" gutterBottom>
                        Görev Saatleri:
                      </Typography>
                      {getTaskDays(task).map((day) => (
                        <Box key={day.day} sx={{ mb: 1 }}>
                          <Typography variant="caption" fontWeight="bold">
                            {day.dayName}:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
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

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                    {task.personnelName ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon fontSize="small" sx={{ color: 'text.secondary', mr: 0.5 }} />
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {task.personnelName}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="error" fontStyle="italic">
                        Personel atanmamış
                      </Typography>
                    )}
                    
                    {task.completionType === 'qr' && !task.fromDatabase && statusFilter !== 'completed' && statusFilter !== 'missed' && (
                      <Button
                        size="small"
                        startIcon={<QrCodeIcon />}
                        variant="outlined"
                        color="primary"
                        onClick={(e) => onOpenQrPrintModal(task, e)}
                        sx={{ ml: 'auto', minWidth: 'auto', fontSize: '0.75rem', py: 0.5 }}
                      >
                        QR Yazdır
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <WeeklyTasksTable 
          tasks={filteredTasks}
          statusFilter={statusFilter}
          onShowTaskDetail={onShowTaskDetail}
          onOpenQrPrintModal={onOpenQrPrintModal}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
          getStatusLabel={getStatusLabel}
          getTaskTimeColor={getTaskTimeColor}
        />
      )}
    </>
  );
};

export default WeeklyTasks; 