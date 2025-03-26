import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Button,
  Fab,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
  styled,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Alert,
  AlertTitle,
  Collapse,
  TextField,
  FormControlLabel,
  RadioGroup,
  Radio,
  Switch,
  List,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  Menu,
  ButtonGroup,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import {
  Add as AddIcon,
  TaskAlt as TaskIcon,
  Person as PersonIcon,
  CheckCircle as CompletedIcon,
  PendingActions as PendingIcon,
  PlayCircleFilled as StartedIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  QrCode as QrCodeIcon,
  Print as PrintIcon,
  Image as ImageIcon,
  TextFields as TextFieldsIcon,
  Save as SaveIcon,
  FolderOpen as FolderOpenIcon,
  Download as DownloadIcon,
  FormatAlignLeftOutlined,
  FormatAlignCenterOutlined,
  FormatAlignRightOutlined,
  FormatBoldOutlined,
  FormatItalicOutlined,
  Category as CategoryIcon
} from '@mui/icons-material';
import { ref, get, onValue, off, remove, update, push, set } from 'firebase/database';
import { database, auth } from '../../firebase';
import TimeService from '../../services/TimeService';
import TaskTimeService, { TaskTimeStatus } from '../../services/TaskTimeService';
import MissedTaskService from '../../services/MissedTaskService';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import domtoimage from 'dom-to-image';
import AddTaskModal from './modals/AddTaskModal';
import QrPrintModal from './modals/QrPrintModal';
import TaskDetailModal from './modals/TaskDetailModal';
import TaskGroupsModal from './modals/TaskGroupsModal';
// Import uuid tipini ve v4 fonksiyonunu ayrı ayrı tanımlama
import * as uuidModule from 'uuid';
const uuidv4 = uuidModule.v4;

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

// Görev kartı için styled component
const TaskCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  display: 'flex',
  flexDirection: 'column',
}));

// Görev zamanı chip bileşeni
const TaskTimeChip = styled(Chip)<{ status: string }>(({ theme, status }) => ({
  backgroundColor: `${status}20`, // Renkli arkaplan
  color: status,
  fontSize: '0.7rem',
  height: 20
}));

// Filtre alanı için styled component
const FilterContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
}));

// Başlık alanı için styled component
const HeaderContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
}));

// İnce görev kartı için styled component
const SlimTaskCard = styled(Card)(({ theme }) => ({
  borderRadius: 8,
  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
  margin: '4px 0',
  transition: 'background-color 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: theme.palette.grey[50],
    cursor: 'pointer'
  }
}));

// Durum filtresi için seçenekler
const statusOptions = [
  { value: 'all', label: 'Tüm Görevler' },
  { value: 'completed', label: 'Tamamlanan', color: '#4CAF50' },
  { value: 'accepted', label: 'Kabul Edilmiş', color: '#9C27B0' },
  { value: 'pending', label: 'Beklemede', color: '#FF9800' },
  { value: 'missed', label: 'Tamamlanmamış', color: '#F44336' },
];

// Liste görünümü için tablo bileşeni
const TasksTable: React.FC<{ 
  tasks: any[],
  onShowTaskDetail: (task: any) => void,
  onOpenQrPrintModal: (task: any, event: React.MouseEvent) => void,
  getStatusColor: (status: string) => string,
  getStatusIcon: (status: string) => React.ReactNode,
  getStatusLabel: (status: string) => string,
  getTaskTimeColor: (task: any, timeString: string) => string,
}> = ({ 
  tasks, 
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
            <TableCell width="20%">Görev Adı</TableCell>
            <TableCell width="35%">Görev Saatleri</TableCell>
            <TableCell width="10%">Tolerans</TableCell>
            <TableCell width="10%">Personel</TableCell>
            <TableCell width="10%">Durum</TableCell>
            <TableCell width="10%" align="right">İşlemler</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} hover onClick={() => onShowTaskDetail(task)}>
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
                {task.isRecurring && task.repetitionTimes && task.repetitionTimes.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {task.repetitionTimes.map((time: string, index: number) => (
                      <TaskTimeChip
                        key={index}
                        label={time}
                        size="small"
                        status={getTaskTimeColor(task, time)}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">-</Typography>
                )}
              </TableCell>
              <TableCell>
                {task.isRecurring ? (
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
                ) : (
                  <Typography variant="body2" color="text.secondary">-</Typography>
                )}
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
                  {task.isRecurring && task.completionType === 'qr' && (
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
                </Box>
              </TableCell>
            </TableRow>
          ))}
          {tasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
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

const Tasks: React.FC = () => {
  // State tanımlamaları
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [taskGroups, setTaskGroups] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [personnelFilter, setPersonnelFilter] = useState<string>('all');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [taskGroupsModalOpen, setTaskGroupsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  // Görev zamanı durumları
  const [taskTimeStatuses, setTaskTimeStatuses] = useState<Record<string, any>>({});
  const [isCheckingTasks, setIsCheckingTasks] = useState(false);
  const [qrPrintModalOpen, setQrPrintModalOpen] = useState(false);
  const [selectedTaskForQr, setSelectedTaskForQr] = useState<any | null>(null);

  // Görünüm modunu localStorage'dan yükle
  useEffect(() => {
    const savedViewMode = localStorage.getItem('tasksViewMode');
    if (savedViewMode === 'list' || savedViewMode === 'card') {
      setViewMode(savedViewMode);
    }
  }, []);
  
  // Görünüm modu değiştiğinde localStorage'a kaydet
  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: 'card' | 'list' | null
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
      localStorage.setItem('tasksViewMode', newViewMode);
    }
  };

  // Duruma göre renk döndüren yardımcı fonksiyon
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return '#4CAF50'; // Yeşil
      case 'accepted':
      case 'assigned':
        return '#1976D2'; // Mavi
      case 'waiting':
        return '#2196F3'; // Açık Mavi
      case 'pending':
        return '#FF9800'; // Turuncu
      case 'missed':
        return '#F44336'; // Kırmızı
      default:
        return '#9E9E9E'; // Gri
    }
  };

  // Duruma göre ikon döndüren yardımcı fonksiyon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CompletedIcon sx={{ color: getStatusColor(status) }} />;
      case 'accepted':
      case 'assigned':
        return <TaskIcon sx={{ color: getStatusColor(status) }} />;
      case 'started':
        return <StartedIcon sx={{ color: getStatusColor(status) }} />;
      case 'waiting':
      case 'pending':
        return <PendingIcon sx={{ color: getStatusColor(status) }} />;
      case 'missed':
        return <AssignmentIcon sx={{ color: getStatusColor(status) }} />;
      default:
        return <TaskIcon sx={{ color: getStatusColor(status) }} />;
    }
  };

  // Duruma göre etiket döndüren yardımcı fonksiyon
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'accepted':
        return 'Kabul Edildi';
      case 'assigned':
        return 'Atandı';
      case 'started':
        return 'Başlatıldı';
      case 'waiting':
        return 'Bekleyen';
      case 'pending':
        return 'Beklemede';
      case 'missed':
        return 'Tamamlanmamış';
      default:
        return 'Bilinmiyor';
    }
  };

  // Filtreleme handler'ları
  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
  };

  const handlePersonnelFilterChange = (event: SelectChangeEvent) => {
    setPersonnelFilter(event.target.value);
  };

  // Filtrelenmiş görev listesini hesapla
  const filteredTasks = tasks.filter(task => {
    // Durum filtresini uygula
    if (statusFilter !== 'all' && task.status !== statusFilter) {
      return false;
    }
    
    // Personel filtresini uygula
    if (personnelFilter !== 'all' && task.personnelId !== personnelFilter) {
      return false;
    }
    
    return true;
  });

  // Veri işleme fonksiyonu
  const processData = (tasksData: any, personnelData: any) => {
    // Görev listesini hazırla
    const tasksList = tasksData ? Object.entries(tasksData)
      .filter(([key]) => key !== 'missedTasks') // missedTasks anahtarını filtrele
      .map(([id, data]: [string, any]) => {
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
          isRecurring: data.isRecurring || false,
          completionType: data.completionType || 'button',
          dailyRepetitions: data.dailyRepetitions || 1,
          startTolerance: data.startTolerance || 15,
          repetitionTimes: data.repetitionTimes || [],
        };
      }) : [];
    
    // Görevleri oluşturulma tarihine göre sırala (yeniden eskiye)
    const sortedTasks = [...tasksList].sort((a, b) => b.createdAt - a.createdAt);
    setTasks(sortedTasks);
    
    // Personel listesini hazırla
    const personnelList = personnelData ? Object.entries(personnelData).map(([id, data]: [string, any]) => ({
      id,
      name: data.name || 'İsimsiz Personel',
      hasTask: data.hasTask || false,
    })) : [];
    
    setPersonnel(personnelList);
  };

  // Component mount olduğunda veri yükleme
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Giriş yapmış kullanıcıyı kontrol et
        const user = auth.currentUser;
        if (!user) return;
        
        // Kullanıcı verilerini al ve şirket ID'sini bul
        const userSnapshot = await get(ref(database, `users/${user.uid}`));
        if (!userSnapshot.exists()) return;
        
        const userData = userSnapshot.val();
        const companyId = userData.companyId || null;
        setCompanyId(companyId);
        
        if (!companyId) {
          setLoading(false);
          return;
        }
        
        // Personel ve görevleri almak için referanslar oluştur
        const personnelRef = ref(database, `companies/${companyId}/personnel`);
        const tasksRef = ref(database, `companies/${companyId}/tasks`);
        const taskGroupsRef = ref(database, `companies/${companyId}/taskGroups`);
        
        // Başlangıç verilerini al
        const personnelSnapshot = await get(personnelRef);
        const tasksSnapshot = await get(tasksRef);
        const taskGroupsSnapshot = await get(taskGroupsRef);
        
        const personnelData = personnelSnapshot.exists() ? personnelSnapshot.val() : {};
        const tasksData = tasksSnapshot.exists() ? tasksSnapshot.val() : {};
        
        // Görev gruplarını işle
        if (taskGroupsSnapshot.exists()) {
          const groupsData = taskGroupsSnapshot.val();
          const groupsList = Object.entries(groupsData).map(([id, data]: [string, any]) => ({
            id,
            name: data.name || 'İsimsiz Grup',
            createdAt: data.createdAt || '',
          }));
          setTaskGroups(groupsList);
        } else {
          setTaskGroups([]);
        }
        
        // Verileri işle
        processData(tasksData, personnelData);
        
        // Realtime güncellemeleri dinle
        // Personel değişiklikleri
        onValue(personnelRef, (snapshot) => {
          const personnelData = snapshot.exists() ? snapshot.val() : {};
          
          // Görev verilerini de al ve birlikte işle
          get(tasksRef).then((tasksSnapshot) => {
            const tasksData = tasksSnapshot.exists() ? tasksSnapshot.val() : {};
            processData(tasksData, personnelData);
          });
        });
        
        // Görev değişiklikleri
        onValue(tasksRef, (snapshot) => {
          const tasksData = snapshot.exists() ? snapshot.val() : {};
          
          // Personel verilerini de al ve birlikte işle
          get(personnelRef).then((personnelSnapshot) => {
            const personnelData = personnelSnapshot.exists() ? personnelSnapshot.val() : {};
            processData(tasksData, personnelData);
          });
        });
        
        // Görev grupları değişiklikleri
        onValue(taskGroupsRef, (snapshot) => {
          if (snapshot.exists()) {
            const groupsData = snapshot.val();
            const groupsList = Object.entries(groupsData).map(([id, data]: [string, any]) => ({
              id,
              name: data.name || 'İsimsiz Grup',
              createdAt: data.createdAt || '',
            }));
            setTaskGroups(groupsList);
          } else {
            setTaskGroups([]);
          }
        });
      } catch (error) {
        console.error('Görev verilerini yüklerken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    // Cleanup fonksiyonu
    return () => {
      // Realtime listener'ları kaldır
      if (companyId) {
        off(ref(database, `companies/${companyId}/personnel`));
        off(ref(database, `companies/${companyId}/tasks`));
        off(ref(database, `companies/${companyId}/taskGroups`));
      }
    };
  }, []);

  // Görev silme fonksiyonu
  const handleDeleteTask = async (taskId: string, personnelId: string) => {
    if (!companyId) {
      throw new Error('Şirket bilgisi bulunamadı');
    }

    try {
      console.log('Görev silme işlemi başladı. TaskId:', taskId, 'PersonnelId:', personnelId);
      
      // Önce görevi sil
      await remove(ref(database, `companies/${companyId}/tasks/${taskId}`));
      console.log('Görev silindi');
      
      // Personelin diğer görevlerini kontrol et
      const otherTasksSnapshot = await get(
        ref(database, `companies/${companyId}/tasks`)
      );
      
      let hasOtherTasks = false;
      
      if (otherTasksSnapshot.exists()) {
        const tasksData = otherTasksSnapshot.val();
        
        // Personelin başka görevi var mı kontrol et
        hasOtherTasks = Object.values(tasksData).some(
          (task: any) => task.personnelId === personnelId
        );
      }
      
      // Eğer başka görev yoksa personelin görev durumunu false yap
      if (!hasOtherTasks) {
        console.log('Personelin başka görevi yok, hasTask false yapılıyor');
        await update(ref(database, `companies/${companyId}/personnel/${personnelId}`), {
          hasTask: false
        });
      }
      
      console.log('Görev silme işlemi tamamlandı');
    } catch (error) {
      console.error('Görev silinirken hata:', error);
      throw error; // Hata yönetimi için hatayı yeniden fırlat
    }
  };

  // Görev detaylarını gösterme fonksiyonu
  const handleShowTaskDetail = (task: any) => {
    setSelectedTask(task);
    setTaskDetailOpen(true);
  };

  // Görev ekleme fonksiyonu
  const handleAddTask = async (taskData: {
    name: string;
    description: string;
    personnelId: string;
    completionType: string;
    isRecurring: boolean;
    dailyRepetitions: number;
    startTolerance: number;
    repetitionTimes: string[];
    groupId?: string;
  }) => {
    if (!companyId) {
      throw new Error('Şirket bilgisi bulunamadı');
    }

    try {
      console.log('Görev ekleme işlemi başladı:', taskData);
      
      // Firebase'de yeni görev referansı oluştur
      const newTaskRef = ref(database, `companies/${companyId}/tasks`);
      const newTaskKey = push(newTaskRef).key;
      
      if (!newTaskKey) {
        throw new Error('Görev ID oluşturulamadı');
      }
      
      // Görev verilerini hazırla
      interface TaskData {
        name: string;
        description: string;
        personnelId: string;
        status: string;
        completionType: string;
        createdAt: number;
        startedAt: null;
        completedAt: null;
        isRecurring: boolean;
        dailyRepetitions: number;
        startTolerance: number;
        repetitionTimes: string[];
        groupId?: string;
      }
      
      const taskToSave: TaskData = {
        name: taskData.name,
        description: taskData.description,
        personnelId: taskData.personnelId,
        status: 'pending', // Başlangıç durumu
        completionType: taskData.completionType,
        createdAt: Date.now(),
        startedAt: null,
        completedAt: null,
        isRecurring: taskData.isRecurring,
        dailyRepetitions: taskData.dailyRepetitions,
        startTolerance: taskData.startTolerance,
        repetitionTimes: taskData.repetitionTimes,
      };
      
      // Eğer görev grubu seçildiyse bunu da ekle
      if (taskData.groupId) {
        taskToSave.groupId = taskData.groupId;
      }
      
      // Görevi kaydet
      await set(ref(database, `companies/${companyId}/tasks/${newTaskKey}`), taskToSave);
      console.log('Görev başarıyla eklendi');
      
      // Personelin görev durumunu güncelle
      await update(ref(database, `companies/${companyId}/personnel/${taskData.personnelId}`), {
        hasTask: true
      });
      
      console.log('Personel görev durumu güncellendi');
    } catch (error) {
      console.error('Görev eklenirken hata:', error);
      throw error;
    }
  };

  // Görevdeki personeli değiştirme fonksiyonu
  const handleUpdatePersonnel = async (taskId: string, newPersonnelId: string): Promise<void> => {
    if (!companyId) {
      throw new Error('Şirket bilgisi bulunamadı');
    }

    try {
      console.log('Görevdeki personel değiştiriliyor. TaskId:', taskId, 'Yeni PersonnelId:', newPersonnelId);
      
      // Görevin mevcut verilerini al
      const taskSnapshot = await get(ref(database, `companies/${companyId}/tasks/${taskId}`));
      
      if (!taskSnapshot.exists()) {
        throw new Error('Görev bulunamadı');
      }
      
      const taskData = taskSnapshot.val();
      const oldPersonnelId = taskData.personnelId;
      
      if (oldPersonnelId === newPersonnelId) {
        console.log('Personel değişmedi, işlem iptal edildi');
        return;
      }
      
      // Görevi güncelle
      await update(ref(database, `companies/${companyId}/tasks/${taskId}`), {
        personnelId: newPersonnelId
      });
      console.log('Görev güncellendi');
      
      // Yeni personelin görev durumunu güncelle
      await update(ref(database, `companies/${companyId}/personnel/${newPersonnelId}`), {
        hasTask: true
      });
      console.log('Yeni personelin görev durumu güncellendi');
      
      // Eski personelin diğer görevlerini kontrol et
      const otherTasksSnapshot = await get(
        ref(database, `companies/${companyId}/tasks`)
      );
      
      let hasOtherTasks = false;
      
      if (otherTasksSnapshot.exists()) {
        const tasksData = otherTasksSnapshot.val();
        
        // Personelin başka görevi var mı kontrol et (mevcut güncellenen görev hariç)
        hasOtherTasks = Object.entries(tasksData).some(
          ([id, data]: [string, any]) => id !== taskId && data.personnelId === oldPersonnelId
        );
      }
      
      // Eğer başka görev yoksa personelin görev durumunu false yap
      if (!hasOtherTasks) {
        console.log('Eski personelin başka görevi yok, hasTask false yapılıyor');
        await update(ref(database, `companies/${companyId}/personnel/${oldPersonnelId}`), {
          hasTask: false
        });
      }
      
      console.log('Personel değiştirme işlemi tamamlandı');
    } catch (error) {
      console.error('Personel güncellenirken hata:', error);
      throw error;
    }
  };

  // Tekrarlı görevlerin durumlarını kontrol et ve güncelle
  const checkRecurringTaskTimes = async () => {
    if (isCheckingTasks) return;
    
    try {
      setIsCheckingTasks(true);
      console.log('Tekrarlı görevler kontrol ediliyor...');
      
      const statusMap: Record<string, any> = {};
      
      // Her görev için tekrarlanan zamanları kontrol et
      for (const task of tasks) {
        if (task.isRecurring && task.repetitionTimes && task.repetitionTimes.length > 0) {
          console.log(`Görev kontrol ediliyor: ${task.name}, ID: ${task.id}`);
          
          // Kaçırılan ve tamamlanan görev zamanlarını al
          const missedTimes = await MissedTaskService.getMissedTaskTimes(task.id, companyId as string);
          const completedTimes = await MissedTaskService.getCompletedTaskTimes(task.id, companyId as string);
          
          console.log(`Görev: ${task.name} - Kaçırılan zamanlar:`, missedTimes);
          console.log(`Görev: ${task.name} - Tamamlanan zamanlar:`, completedTimes);
          
          // Başlatılmış ama tamamlanmamış görevlerin durumlarını al
          const timeStatuses = await MissedTaskService.getCompletedTaskTimeStatuses(task.id, companyId as string);
          console.log(`Görev: ${task.name} - Zaman durumları:`, timeStatuses);
          
          // Her görev için task.repetitionTimes'ı kullanarak bir defa checkRecurringTaskTime çağır
          const result = await TaskTimeService.checkRecurringTaskTime(
            task.repetitionTimes,
            task.startTolerance || 15,
            task.status
          );
          console.log(`Görev: ${task.name} - Genel durum kontrolü sonucu:`, result);
          
          // Tekrarlanan her zaman için durumu kontrol et
          for (const timeString of task.repetitionTimes) {
            console.log(`Zaman kontrolü: ${timeString} için`);
            
            // Zaman tamamlanmış veya kaçırılmış ise özel durum ata
            if (completedTimes.includes(timeString)) {
              statusMap[`${task.id}_${timeString}`] = {
                status: 'completed',
                color: '#4CAF50', // Yeşil
                activeTime: timeString
              };
              console.log(`${timeString}: Tamamlanmış (YEŞİL)`);
              continue;
            }
            
            if (missedTimes.includes(timeString)) {
              statusMap[`${task.id}_${timeString}`] = {
                status: 'missed',
                color: '#F44336', // Kırmızı
                activeTime: timeString
              };
              console.log(`${timeString}: Kaçırılmış (KIRMIZI)`);
              continue;
            }
            
            // Zaman başlatılmış ama tamamlanmamış ise
            if (timeStatuses[timeString] === 'started') {
              statusMap[`${task.id}_${timeString}`] = {
                status: 'started',
                color: '#795548', // Kahverengi
                activeTime: timeString
              };
              console.log(`${timeString}: Başlatılmış (KAHVERENGİ)`);
              continue;
            }
            
            // Özel durum olmayan zamanlar için, her zaman için ayrı bir kontrol yap
            const singleTimeResult = await TaskTimeService.checkRecurringTaskTime(
              [timeString], // Sadece bu zamanı kontrol et
              task.startTolerance || 15,
              task.status
            );
            
            // Renk belirle
            const color = TaskTimeService.getTaskTimeColor(singleTimeResult.status, task.status);
            
            statusMap[`${task.id}_${timeString}`] = {
              status: singleTimeResult.status,
              color,
              activeTime: timeString
            };
            console.log(`${timeString}: ${singleTimeResult.status} (${color})`);
          }
        }
      }
      
      setTaskTimeStatuses(statusMap);
      console.log('Görev zamanları güncellendi:', statusMap);
      
      // Kaçırılan görevleri güncelle
      if (companyId && tasks.length > 0) {
        await MissedTaskService.checkAndRecordMissedTasks(tasks, companyId);
      }
      
    } catch (error) {
      console.error('Görev zamanları kontrol edilirken hata:', error);
    } finally {
      setIsCheckingTasks(false);
    }
  };

  // Component mount olduğunda ve görev/şirket ID'si değiştiğinde kontrol yap
  useEffect(() => {
    if (companyId && tasks.length > 0 && !loading) {
      checkRecurringTaskTimes();
      
      // Her dakika kontrol yap
      const interval = setInterval(() => {
        checkRecurringTaskTimes();
      }, 60000); // 60 saniye
      
      return () => clearInterval(interval);
    }
  }, [companyId, tasks, loading]);

  // Görev zamanı rengi belirle
  const getTaskTimeColor = (task: any, timeString: string): string => {
    const key = `${task.id}_${timeString}`;
    if (taskTimeStatuses[key]) {
      return taskTimeStatuses[key].color;
    }
    return '#9E9E9E'; // Varsayılan gri
  };

  // Görev zamanı durumu belirle
  const getTaskTimeStatus = (task: any, timeString: string): string => {
    const key = `${task.id}_${timeString}`;
    if (taskTimeStatuses[key]) {
      return taskTimeStatuses[key].status;
    }
    return TaskTimeStatus.notYetDue;
  };

  // QR Kod yazdırma modalını açma işlevi
  const handleOpenQrPrintModal = (task: any, event: React.MouseEvent) => {
    event.stopPropagation(); // Kart tıklama olayının tetiklenmesini engelle
    setSelectedTaskForQr(task);
    setQrPrintModalOpen(true);
  };

  return (
    <ScrollableContent>
      <HeaderContainer>
        <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
          Görevler
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="görünüm modu"
            size="small"
          >
            <ToggleButton value="card" aria-label="kart görünümü">
              <ViewModuleIcon />
            </ToggleButton>
            <ToggleButton value="list" aria-label="liste görünümü">
              <ViewListIcon />
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            color="success"
            startIcon={<CategoryIcon />}
            onClick={() => setTaskGroupsModalOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Grup Ekle
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAddTaskModalOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Yeni Görev Ekle
          </Button>
        </Box>
      </HeaderContainer>

      <FilterContainer>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <FormControl sx={{ minWidth: 200, flex: 1 }}>
            <InputLabel>Durum</InputLabel>
            <Select
              value={statusFilter}
              label="Durum"
              onChange={handleStatusFilterChange}
              size="small"
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200, flex: 1 }}>
            <InputLabel>Personel</InputLabel>
            <Select
              value={personnelFilter}
              label="Personel"
              onChange={handlePersonnelFilterChange}
              size="small"
            >
              <MenuItem value="all">Tüm Personel</MenuItem>
              {personnel.map((person) => (
                <MenuItem key={person.id} value={person.id}>
                  {person.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </FilterContainer>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : tasks.length === 0 ? (
        <Box sx={{ textAlign: 'center', my: 8 }}>
          <AssignmentIcon sx={{ fontSize: 60, color: 'primary.light', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            {
              statusFilter === 'all' && personnelFilter === 'all'
                ? 'Henüz hiç görev eklenmemiş'
                : 'Filtrelere uygun görev bulunamadı'
            }
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAddTaskModalOpen(true)}
            sx={{ mt: 2 }}
          >
            Yeni Görev Ekle
          </Button>
        </Box>
      ) : viewMode === 'card' ? (
        <Grid container spacing={3}>
          {filteredTasks.map((task) => (
            <Grid item xs={12} sm={6} md={3} key={task.id}>
              <TaskCard onClick={() => handleShowTaskDetail(task)}>
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
                      flexGrow: 1,
                    }}
                  >
                    {task.description || 'Açıklama yok'}
                  </Typography>

                  {task.isRecurring && task.repetitionTimes && task.repetitionTimes.length > 0 && (
                    <Box sx={{ mb: 1.5 }}>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                          <Chip 
                            label={`${task.startTolerance || 15} dk tolerans`}
                            size="small"
                            sx={{ 
                              mr: 1,
                              height: 18, 
                              fontSize: '0.65rem', 
                              bgcolor: 'primary.50', 
                              color: 'primary.main',
                              '& .MuiChip-label': { px: 1 }
                            }}
                          />
                          Tekrar saatleri:
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {task.repetitionTimes.map((time: string, index: number) => (
                          <TaskTimeChip
                            key={index}
                            label={time}
                            size="small"
                            status={getTaskTimeColor(task, time)}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                    
                    {task.isRecurring && task.completionType === 'qr' && (
                      <Button
                        size="small"
                        startIcon={<QrCodeIcon />}
                        variant="outlined"
                        color="primary"
                        onClick={(e) => handleOpenQrPrintModal(task, e)}
                        sx={{ ml: 'auto', minWidth: 'auto', fontSize: '0.75rem', py: 0.5 }}
                      >
                        QR Yazdır
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </TaskCard>
            </Grid>
          ))}
        </Grid>
      ) : (
        <TasksTable 
          tasks={filteredTasks}
          onShowTaskDetail={handleShowTaskDetail}
          onOpenQrPrintModal={handleOpenQrPrintModal}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
          getStatusLabel={getStatusLabel}
          getTaskTimeColor={getTaskTimeColor}
        />
      )}

      {/* Görev Detay Modalı */}
      <TaskDetailModal
        open={taskDetailOpen}
        onClose={() => setTaskDetailOpen(false)}
        task={selectedTask}
        onDelete={handleDeleteTask}
        onUpdatePersonnel={handleUpdatePersonnel}
        personnel={personnel}
        getStatusColor={getStatusColor}
        getStatusIcon={getStatusIcon}
        getStatusLabel={getStatusLabel}
      />

      {/* Görev Ekleme Modalı */}
      <AddTaskModal
        open={addTaskModalOpen}
        onClose={() => setAddTaskModalOpen(false)}
        onAddTask={handleAddTask}
        personnel={personnel}
        taskGroups={taskGroups}
        companyId={companyId || ''}
      />

      {/* QR Kod Yazdırma Modalı */}
      <QrPrintModal
        open={qrPrintModalOpen}
        onClose={() => setQrPrintModalOpen(false)}
        task={selectedTaskForQr}
      />

      {/* Görev Grupları Modalı */}
      <TaskGroupsModal
        open={taskGroupsModalOpen}
        onClose={() => setTaskGroupsModalOpen(false)}
        companyId={companyId || ''}
        taskGroups={taskGroups}
      />
    </ScrollableContent>
  );
};

export default Tasks; 
