import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  TableCell,
  InputAdornment,
  Autocomplete,
  Tabs,
  Tab,
  TablePagination
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
  Category as CategoryIcon,
  Info as InfoIcon,
  FileDownload as FileDownloadIcon,
  Search as SearchIcon,
  Today as TodayIcon,
  DateRange as WeekIcon,
  CalendarViewDay as TakvimIcon,
  CalendarMonth as MonthIcon,
  CalendarToday as YearIcon,
  Business as BusinessIcon,
  FilterList as FilterListIcon,
  LocationOn as LocationOnIcon
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
import TaskInfoModal from './modals/TaskInfoModal';
// Import uuid tipini ve v4 fonksiyonunu ayrı ayrı tanımlama
import * as uuidModule from 'uuid';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import WeeklyTasks from './components/WeeklyTasks';
import { MonthlyTasks } from './components';
import { YearlyTasks } from './components';
import { Takvim } from './components';
import { ExcelExportButton } from './utils/exportUtils';
const uuidv4 = uuidModule.v4;

// Kaydırılabilir ana içerik için styled component
const ScrollableContent = styled(Box)(({ theme }) => ({
  padding: 0, // Tüm padding'i kaldırıyoruz
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
  margin: 0,
  padding: theme.spacing(0, 3),
  backgroundColor: theme.palette.background.paper,
  borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  height: '60px', // Sabit yükseklik 
}));

// Tüm sayfa içerik alanı için container
const ContentContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0, 3, 3, 3), // Sadece yanlarda ve altta padding
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
  statusFilter: string,
  onShowTaskDetail: (task: any) => void,
  onOpenQrPrintModal: (task: any, event: React.MouseEvent) => void,
  getStatusColor: (status: string) => string,
  getStatusIcon: (status: string) => React.ReactNode,
  getStatusLabel: (status: string) => string,
  getTaskTimeColor: (task: any, timeString: string) => string,
  companyId: string | null,
}> = ({ 
  tasks, 
  statusFilter,
  onShowTaskDetail, 
  onOpenQrPrintModal,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  getTaskTimeColor,
  companyId
}) => {
  // Şube adlarını almak için state
  const [branches, setBranches] = useState<{[key: string]: string}>({});
  
  // Sayfalama için state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
  // Sayfalandırılmış task verileri
  const paginatedTasks = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return tasks.slice(startIndex, startIndex + rowsPerPage);
  }, [tasks, page, rowsPerPage]);
  
  // Filtre değişikliklerinde sayfa numarasını sıfırla
  useEffect(() => {
    setPage(0);
  }, [tasks]);
  
  // Şubeleri yükle
  useEffect(() => {
    const loadBranches = async () => {
      if (!companyId) {
        console.warn("TasksTable: Şube yüklenemiyor çünkü companyId değeri bulunamadı:", companyId);
        return;
      }
      
      try {
        console.log("TasksTable: Şubeleri yüklüyorum, companyId:", companyId);
        const branchesRef = ref(database, `companies/${companyId}/branches`);
        const branchesSnapshot = await get(branchesRef);
        
        if (branchesSnapshot.exists()) {
          const branchesData = branchesSnapshot.val();
          const branchesMap: {[key: string]: string} = {};
          
          Object.entries(branchesData).forEach(([id, data]: [string, any]) => {
            branchesMap[id] = data.name || 'İsimsiz Şube';
          });
          
          console.log("TasksTable: Şubeler yüklendi:", branchesMap);
          setBranches(branchesMap);
        } else {
          console.warn("TasksTable: Şubeler bulunamadı!");
        }
      } catch (error) {
        console.error('Şube verileri yüklenirken hata:', error);
      }
    };
    
    loadBranches();
  }, [companyId]);
  
  // Sayfa değişimi
  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  // Sayfa başına satır sayısı değişimi
  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Şube adını getir
  const getBranchName = (branchId: string | null) => {
    if (!branchId) return '-';
    
    // branchId bir nesne mi kontrol et ve düzenle
    if (typeof branchId === 'object' && branchId !== null) {
      const keys = Object.keys(branchId);
      if (keys.length > 0) {
        const firstKey = keys[0];
        console.log(`getBranchName: branchId bir nesne, ilk anahtar kullanılıyor: ${firstKey}`);
        branchId = firstKey;
      }
    }
    
    // Artık branchId bir string olmalı, şube adını döndür
    return branches[branchId as string] || '-';
  };
  
  return (
    <Box>
      <TableContainer component={Paper} sx={{ 
        mt: 2, 
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
        borderRadius: 2,
        overflow: 'hidden'
      }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width="5%">Durum</TableCell>
              <TableCell width="15%">Görev Adı</TableCell>
              <TableCell width="25%">Görev Saatleri</TableCell>
              <TableCell width="15%">Tarih</TableCell>
              <TableCell width="10%">Tolerans</TableCell>
              <TableCell width="10%">Personel</TableCell>
              <TableCell width="10%">Durum</TableCell>
              <TableCell width="10%">Şube</TableCell>
              <TableCell width="10%" align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTasks.map((task) => (
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
                  {task.status === 'completed' && (
                    <Typography variant="body2" color="text.secondary">
                      {task.fromDatabase && task.completionDate 
                        ? `${task.completionDate}` 
                        : (task.completedAt ? new Date(task.completedAt).toLocaleDateString('tr-TR', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-')}
                    </Typography>
                  )}
                  {task.status === 'missed' && (
                    <Typography variant="body2" color="text.secondary">
                      {task.fromDatabase && task.missedDate 
                        ? `${task.missedDate}` 
                        : (task.missedAt ? new Date(task.missedAt).toLocaleDateString('tr-TR', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-')}
                    </Typography>
                  )}
                  {task.status !== 'completed' && task.status !== 'missed' && (
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
                      height: 20, 
                      fontSize: '0.7rem', 
                      bgcolor: `${getStatusColor(task.status)}20`, 
                      color: getStatusColor(task.status),
                      fontWeight: 500
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    fontSize: '0.75rem'
                  }}>
                    {task.branchesId ? (
                      <>
                        <LocationOnIcon fontSize="small" sx={{ mr: 0.5, fontSize: 16 }} />
                        {getBranchName(task.branchesId)}
                      </>
                    ) : (
                      '-'
                    )}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {task.isRecurring && task.completionType === 'qr' && !task.fromDatabase && (
                    <Button
                      size="small"
                      startIcon={<QrCodeIcon />}
                      variant="outlined"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenQrPrintModal(task, e);
                      }}
                      sx={{ 
                        p: 0.5, 
                        minWidth: 'auto', 
                        fontSize: '0.7rem',
                        height: 26
                      }}
                    >
                      QR
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  <Typography color="text.secondary">
                    Görev bulunamadı
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Sayfalama */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <TablePagination
          component="div"
          count={tasks.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
          labelRowsPerPage="Sayfa başına satır:"
          labelDisplayedRows={({ from, to, count }) => `${count} kayıttan ${from}-${to} arası gösteriliyor`}
        />
      </Box>
    </Box>
  );
};

// Tasks bileşeni arayüzü oluştur
interface TasksProps {
  branchId?: string;
  isManager?: boolean;
}

interface TaskData {
  name: string;
  description: string;
  personnelId: string;
  status: string;
  isRecurring: boolean;
  completionType: string;
  createdAt: number;
  repeatType?: string;
  startTolerance?: number;
  dailyRepetitions?: number;
  repetitionTimes?: string[];
  weekDays?: number[];
  monthDay?: number;
  yearDate?: string;
  groupId?: string;
  branchesId?: string;
}

const Tasks: React.FC<TasksProps> = ({ branchId, isManager = false }) => {
  // State tanımlamaları
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [missedTasks, setMissedTasks] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [taskGroups, setTaskGroups] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [personnelFilter, setPersonnelFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all'); // Yeni grup filtresi state'i
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState<string>('');
  const [taskSearchTerm, setTaskSearchTerm] = useState<string>('');
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
  // Bilgi modalı state'i
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  // Görev tipi sekmesi state'i
  const [taskType, setTaskType] = useState<string>('daily');
  // Şube bilgisi state'i
  const [branches, setBranches] = useState<{[key: string]: string}>({});
  const [showFilters, setShowFilters] = useState(false); // Filtre görünürlüğü için yeni state

  // Verileri saklamak için referanslar oluşturuyorum
  const [weeklyTasksData, setWeeklyTasksData] = useState<any[]>([]);
  const [monthlyTasksData, setMonthlyTasksData] = useState<any[]>([]);
  const [yearlyTasksData, setYearlyTasksData] = useState<any[]>([]);

  // Görünüm modunu localStorage'dan yükle
  useEffect(() => {
    const savedViewMode = localStorage.getItem('tasksViewMode');
    if (savedViewMode === 'list' || savedViewMode === 'card') {
      setViewMode(savedViewMode);
    }
  }, []);
  
  // Şubeleri yükle
  useEffect(() => {
    const loadBranches = async () => {
      if (!companyId) {
        console.warn("TasksTable: Şube yüklenemiyor çünkü companyId değeri bulunamadı:", companyId);
        return;
      }
      
      try {
        console.log("TasksTable: Şubeleri yüklüyorum, companyId:", companyId);
        const branchesRef = ref(database, `companies/${companyId}/branches`);
        const branchesSnapshot = await get(branchesRef);
        
        if (branchesSnapshot.exists()) {
          const branchesData = branchesSnapshot.val();
          const branchesMap: {[key: string]: string} = {};
          
          Object.entries(branchesData).forEach(([id, data]: [string, any]) => {
            branchesMap[id] = data.name || 'İsimsiz Şube';
          });
          
          console.log("TasksTable: Şubeler yüklendi:", branchesMap);
          setBranches(branchesMap);
        } else {
          console.warn("TasksTable: Şubeler bulunamadı!");
        }
      } catch (error) {
        console.error('Şube verileri yüklenirken hata:', error);
      }
    };
    
    loadBranches();
  }, [companyId]);
  
  // Şube adını getir
  const getBranchName = (branchId: string | null) => {
    if (!branchId) return '-';
    
    // branchId bir nesne mi kontrol et ve düzenle
    if (typeof branchId === 'object' && branchId !== null) {
      const keys = Object.keys(branchId);
      if (keys.length > 0) {
        const firstKey = keys[0];
        console.log(`getBranchName: branchId bir nesne, ilk anahtar kullanılıyor: ${firstKey}`);
        branchId = firstKey;
      }
    }
    
    // Artık branchId bir string olmalı, şube adını döndür
    return branches[branchId as string] || '-';
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

  // Grup filtresi için handler
  const handleGroupFilterChange = (_event: React.SyntheticEvent, newValue: any) => {
    setGroupFilter(newValue ? newValue.id : 'all');
  };

  // Filtrelenmiş görev listesini hesapla
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    
    // Eğer branchId verilmişse, sadece o şubeye ait görevleri göster
    if (branchId) {
      result = result.filter(task => {
        // branchesId bir nesne olabilir veya string olabilir
        if (typeof task.branchesId === 'object' && task.branchesId !== null) {
          // Nesne durumunda, anahtarlarını kontrol et
          return Object.keys(task.branchesId).includes(branchId);
        } else {
          // String durumunda direk karşılaştır
          return task.branchesId === branchId;
        }
      });
      
      // Tamamlanan görevleri de şubeye göre filtrele
      if (statusFilter === 'completed') {
        const filteredCompletedTasks = completedTasks.filter(task => {
          if (typeof task.branchesId === 'object' && task.branchesId !== null) {
            return Object.keys(task.branchesId).includes(branchId);
          } else {
            return task.branchesId === branchId;
          }
        });
        result = [
          ...result.filter(task => task.status === 'completed'),
          ...filteredCompletedTasks
        ];
      } else if (statusFilter === 'missed') {
        // Kaçırılan görevleri de şubeye göre filtrele
        const filteredMissedTasks = missedTasks.filter(task => {
          if (typeof task.branchesId === 'object' && task.branchesId !== null) {
            return Object.keys(task.branchesId).includes(branchId);
          } else {
            return task.branchesId === branchId;
          }
        });
        result = [
          ...result.filter(task => task.status === 'missed'),
          ...filteredMissedTasks
        ];
      }
    } else {
      // Şube ID'si verilmemişse normal filtrele
      if (statusFilter === 'completed') {
        // Ana görev listesindeki tamamlanan görevler + veritabanındaki tamamlanan görevler
        result = [
          ...result.filter(task => task.status === 'completed'),
          ...completedTasks
        ];
      } else if (statusFilter === 'missed') {
        // Ana görev listesindeki kaçırılan görevler + veritabanındaki kaçırılan görevler
        result = [
          ...result.filter(task => task.status === 'missed'),
          ...missedTasks
        ];
      } else if (statusFilter !== 'all') {
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
    
    // Grup filtresi uygulanıyor
    if (groupFilter !== 'all') {
      result = result.filter(task => task.groupId === groupFilter);
    }
    
    return result;
  }, [tasks, completedTasks, missedTasks, statusFilter, personnelFilter, taskSearchTerm, groupFilter, branchId]);

  // Veri işleme fonksiyonu
  const processData = (tasksData: any, personnelData: any, completedTasksData: any = null, missedTasksData: any = null) => {
    // Görev listesini hazırla
    const tasksList = tasksData ? Object.entries(tasksData)
      .filter(([key]) => key !== 'missedTasks') // missedTasks anahtarını filtrele
      .map(([id, data]: [string, any]) => {
        // Personel bilgisini bul
        const personnelId = data.personnelId || '';
        const personnelInfo = personnelData[personnelId] || {};
        
        // branchesId değerini doğru şekilde al
        let branchesId = data.branchesId || null;
        
        // branchesId bir nesne ise, ilk anahtarını al (format düzeltme)
        if (typeof branchesId === 'object' && branchesId !== null) {
          const keys = Object.keys(branchesId);
          if (keys.length > 0) {
            branchesId = keys[0];
            console.log(`Task ${id} için branchesId nesneden string'e dönüştürüldü:`, branchesId);
          }
        }

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
          completedAt: data.completedAt || null, // Tamamlanma tarihi
          groupId: data.groupId || null, // Görev grup ID'sini burada sakla
          branchesId: branchesId, // Şube ID'sini ekle
        };
      }) : [];
    
    // Görevleri oluşturulma tarihine göre sırala (yeniden eskiye)
    const sortedTasks = [...tasksList].sort((a, b) => b.createdAt - a.createdAt);
    setTasks(sortedTasks);
    
    // Veritabanından çekilen tamamlanan görevleri işle
    if (completedTasksData) {
      const completedTasksList: any[] = [];
      
      // completedTasks verilerini düz bir liste halinde dönüştür
      Object.entries(completedTasksData).forEach(([taskId, taskDates]: [string, any]) => {
        Object.entries(taskDates).forEach(([date, timeSlots]: [string, any]) => {
          Object.entries(timeSlots).forEach(([time, taskData]: [string, any]) => {
            // Görev bilgilerini bul
            const originalTask = sortedTasks.find(t => t.id === taskId) || {
              name: '',
              description: '',
              createdAt: Date.now(),
              personnelId: '',
              isRecurring: false,
              completionType: 'button'
            };
            
            // Personel bilgisini bul
            const personnelId = taskData.completedBy || originalTask.personnelId || '';
            const personnelInfo = personnelData[personnelId] || {};
            
            // Tarih ve saat formatını oluştur
            const completionDate = new Date(`${date} ${time}`);
            
            // Personelin şube bilgisini bul
            let branchesId = null;
            
            // Önce orijinal görevden şube ID'sini kontrol et
            if ('branchesId' in originalTask) {
              branchesId = originalTask.branchesId;
            }
            
            // Sonra personelin şube ID'sini kontrol et
            if (!branchesId && personnelId && personnelData[personnelId] && personnelData[personnelId].branchesId) {
              branchesId = personnelData[personnelId].branchesId;
              
              // branchesId bir nesne ise, ilk anahtarını al (format düzeltme)
              if (typeof branchesId === 'object' && branchesId !== null) {
                const keys = Object.keys(branchesId);
                if (keys.length > 0) {
                  branchesId = keys[0];
                }
              }
            }
            
            completedTasksList.push({
              id: `${taskId}_${date}_${time}`,
              originalTaskId: taskId,
              name: taskData.name || originalTask.name || 'İsimsiz Görev',
              description: originalTask.description || '',
              status: 'completed',
              createdAt: originalTask.createdAt || Date.now(),
              completedAt: completionDate.getTime(),
              completionDate: date, // YYYY-MM-DD formatında
              completionTime: time, // HH:MM:SS formatında
              personnelId: personnelId,
              personnelName: personnelInfo.name || 'Atanmamış',
              isRecurring: originalTask.isRecurring || false,
              completionType: originalTask.completionType || 'button',
              repetitionTimes: [time], // Sadece bu tamamlanan saati göster
              fromDatabase: true, // Veritabanından geldiğini belirt
              branchesId: branchesId // Şube ID'sini ekle
            });
          });
        });
      });
      
      // Tamamlanma tarihine göre sırala (yeniden eskiye)
      setCompletedTasks(completedTasksList.sort((a, b) => b.completedAt - a.completedAt));
    } else {
      setCompletedTasks([]);
    }
    
    // Veritabanından çekilen kaçırılmış görevleri işle
    if (missedTasksData) {
      const missedTasksList: any[] = [];
      
      // missedTasks verilerini düz bir liste halinde dönüştür
      Object.entries(missedTasksData).forEach(([taskId, taskDates]: [string, any]) => {
        Object.entries(taskDates).forEach(([date, timeSlots]: [string, any]) => {
          Object.entries(timeSlots).forEach(([time, taskData]: [string, any]) => {
            // Görev bilgilerini bul
            const originalTask = sortedTasks.find(t => t.id === taskId) || {
              name: '',
              description: '',
              createdAt: Date.now(),
              personnelId: '',
              isRecurring: false,
              completionType: 'button'
            };
            
            // Personel bilgisini bul
            const personnelId = taskData.personnelId || originalTask.personnelId || '';
            const personnelInfo = personnelData[personnelId] || {};
            
            // Tarih ve saat formatını oluştur
            const missedDate = new Date(`${date} ${time}`);
            
            // Personelin şube bilgisini bul
            let branchesId = null;
            
            // Önce orijinal görevden şube ID'sini kontrol et
            if ('branchesId' in originalTask) {
              branchesId = originalTask.branchesId;
            }
            
            // Sonra personelin şube ID'sini kontrol et
            if (!branchesId && personnelId && personnelData[personnelId] && personnelData[personnelId].branchesId) {
              branchesId = personnelData[personnelId].branchesId;
              
              // branchesId bir nesne ise, ilk anahtarını al (format düzeltme)
              if (typeof branchesId === 'object' && branchesId !== null) {
                const keys = Object.keys(branchesId);
                if (keys.length > 0) {
                  branchesId = keys[0];
                }
              }
            }
            
            missedTasksList.push({
              id: `${taskId}_${date}_${time}`,
              originalTaskId: taskId,
              name: taskData.name || originalTask.name || 'İsimsiz Görev',
              description: originalTask.description || '',
              status: 'missed',
              createdAt: originalTask.createdAt || Date.now(),
              missedAt: missedDate.getTime(),
              missedDate: date, // YYYY-MM-DD formatında
              missedTime: time, // HH:MM:SS formatında
              personnelId: personnelId,
              personnelName: personnelInfo.name || 'Atanmamış',
              isRecurring: originalTask.isRecurring || false,
              completionType: originalTask.completionType || 'button',
              repetitionTimes: [time], // Sadece bu kaçırılan saati göster
              fromDatabase: true, // Veritabanından geldiğini belirt
              branchesId: branchesId // Şube ID'sini ekle
            });
          });
        });
      });
      
      // Kaçırılma tarihine göre sırala (yeniden eskiye)
      setMissedTasks(missedTasksList.sort((a, b) => b.missedAt - a.missedAt));
    } else {
      setMissedTasks([]);
    }
    
    // Personel listesini hazırla
    const personnelList = personnelData ? Object.entries(personnelData)
      .filter(([_, data]: [string, any]) => !data.isDeleted) // Silinen personelleri filtrele
      .map(([id, data]: [string, any]) => {
        // branchesId değerini doğru şekilde al
        let branchesId = data.branchesId || null;
        
        // branchesId bir nesne ise, ilk anahtarını al (format düzeltme)
        if (typeof branchesId === 'object' && branchesId !== null) {
          const keys = Object.keys(branchesId);
          if (keys.length > 0) {
            branchesId = keys[0];
            console.log(`Personel ${id} için branchesId nesneden string'e dönüştürüldü:`, branchesId);
          }
        }
        
        return {
          id,
          name: data.name || 'İsimsiz Personel',
          hasTask: data.hasTask || false,
          branchesId: branchesId, // Şube ID'sini ekle
          email: data.email || '',
          phone: data.phone || '',
        };
      }) : [];
    
    console.log("Personel listesi hazırlandı:", personnelList);
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
        
        // Personel, görevleri, tamamlanan ve kaçırılan görevleri almak için referanslar oluştur
        const personnelRef = ref(database, `companies/${companyId}/personnel`);
        const tasksRef = ref(database, `companies/${companyId}/tasks`);
        const completedTasksRef = ref(database, `companies/${companyId}/completedTasks`);
        const missedTasksRef = ref(database, `companies/${companyId}/missedTasks`);
        const taskGroupsRef = ref(database, `companies/${companyId}/taskGroups`);
        
        // Başlangıç verilerini al
        const personnelSnapshot = await get(personnelRef);
        const tasksSnapshot = await get(tasksRef);
        const completedTasksSnapshot = await get(completedTasksRef);
        const missedTasksSnapshot = await get(missedTasksRef);
        const taskGroupsSnapshot = await get(taskGroupsRef);
        
        const personnelData = personnelSnapshot.exists() ? personnelSnapshot.val() : {};
        const tasksData = tasksSnapshot.exists() ? tasksSnapshot.val() : {};
        const completedTasksData = completedTasksSnapshot.exists() ? completedTasksSnapshot.val() : {};
        const missedTasksData = missedTasksSnapshot.exists() ? missedTasksSnapshot.val() : {};
        
        // Görev gruplarını işle
        if (taskGroupsSnapshot.exists()) {
          const groupsData = taskGroupsSnapshot.val();
          const groupsList = Object.entries(groupsData).map(([id, data]: [string, any]) => {
            // branchesId değerini doğru şekilde al
            let branchesId = data.branchesId || null;
            
            // branchesId bir nesne ise, ilk anahtarını al (format düzeltme)
            if (typeof branchesId === 'object' && branchesId !== null) {
              const keys = Object.keys(branchesId);
              if (keys.length > 0) {
                branchesId = keys[0];
                console.log(`Görev grubu ${id} için branchesId nesneden string'e dönüştürüldü:`, branchesId);
              }
            }
            
            return {
              id,
              name: data.name || 'İsimsiz Grup',
              createdAt: data.createdAt || '',
              branchesId: branchesId, // Şube ID'sini ekle
            };
          });
          console.log("Görev grupları hazırlandı:", groupsList);
          setTaskGroups(groupsList);
        } else {
          setTaskGroups([]);
        }
        
        // Verileri işle
        processData(tasksData, personnelData, completedTasksData, missedTasksData);
        
        // Realtime güncellemeleri dinle
        // Personel değişiklikleri
        onValue(personnelRef, (snapshot) => {
          const personnelData = snapshot.exists() ? snapshot.val() : {};
          
          // Görev verilerini de al ve birlikte işle
          Promise.all([
            get(tasksRef),
            get(completedTasksRef),
            get(missedTasksRef)
          ]).then(([tasksSnapshot, completedTasksSnapshot, missedTasksSnapshot]) => {
            const tasksData = tasksSnapshot.exists() ? tasksSnapshot.val() : {};
            const completedTasksData = completedTasksSnapshot.exists() ? completedTasksSnapshot.val() : {};
            const missedTasksData = missedTasksSnapshot.exists() ? missedTasksSnapshot.val() : {};
            processData(tasksData, personnelData, completedTasksData, missedTasksData);
          });
        });
        
        // Görev değişiklikleri
        onValue(tasksRef, (snapshot) => {
          const tasksData = snapshot.exists() ? snapshot.val() : {};
          
          // Personel, tamamlanan ve kaçırılan görev verilerini de al ve birlikte işle
          Promise.all([
            get(personnelRef),
            get(completedTasksRef),
            get(missedTasksRef)
          ]).then(([personnelSnapshot, completedTasksSnapshot, missedTasksSnapshot]) => {
            const personnelData = personnelSnapshot.exists() ? personnelSnapshot.val() : {};
            const completedTasksData = completedTasksSnapshot.exists() ? completedTasksSnapshot.val() : {};
            const missedTasksData = missedTasksSnapshot.exists() ? missedTasksSnapshot.val() : {};
            processData(tasksData, personnelData, completedTasksData, missedTasksData);
          });
        });
        
        // Tamamlanan görevler değişiklikleri
        onValue(completedTasksRef, (snapshot) => {
          const completedTasksData = snapshot.exists() ? snapshot.val() : {};
          
          // Personel ve görev verilerini de al ve birlikte işle
          Promise.all([
            get(personnelRef),
            get(tasksRef),
            get(missedTasksRef)
          ]).then(([personnelSnapshot, tasksSnapshot, missedTasksSnapshot]) => {
            const personnelData = personnelSnapshot.exists() ? personnelSnapshot.val() : {};
            const tasksData = tasksSnapshot.exists() ? tasksSnapshot.val() : {};
            const missedTasksData = missedTasksSnapshot.exists() ? missedTasksSnapshot.val() : {};
            processData(tasksData, personnelData, completedTasksData, missedTasksData);
          });
        });
        
        // Kaçırılan görevler değişiklikleri
        onValue(missedTasksRef, (snapshot) => {
          const missedTasksData = snapshot.exists() ? snapshot.val() : {};
          
          // Personel, görev ve tamamlanan görev verilerini de al ve birlikte işle
          Promise.all([
            get(personnelRef),
            get(tasksRef),
            get(completedTasksRef)
          ]).then(([personnelSnapshot, tasksSnapshot, completedTasksSnapshot]) => {
            const personnelData = personnelSnapshot.exists() ? personnelSnapshot.val() : {};
            const tasksData = tasksSnapshot.exists() ? tasksSnapshot.val() : {};
            const completedTasksData = completedTasksSnapshot.exists() ? completedTasksSnapshot.val() : {};
            processData(tasksData, personnelData, completedTasksData, missedTasksData);
          });
        });
        
        // Görev grupları değişiklikleri
        onValue(taskGroupsRef, (snapshot) => {
          if (snapshot.exists()) {
            const groupsData = snapshot.val();
            const groupsList = Object.entries(groupsData).map(([id, data]: [string, any]) => {
              // branchesId değerini doğru şekilde al
              let branchesId = data.branchesId || null;
              
              // branchesId bir nesne ise, ilk anahtarını al (format düzeltme)
              if (typeof branchesId === 'object' && branchesId !== null) {
                const keys = Object.keys(branchesId);
                if (keys.length > 0) {
                  branchesId = keys[0];
                  console.log(`Görev grubu ${id} için branchesId nesneden string'e dönüştürüldü:`, branchesId);
                }
              }
              
              return {
                id,
                name: data.name || 'İsimsiz Grup',
                createdAt: data.createdAt || '',
                branchesId: branchesId, // Şube ID'sini ekle
              };
            });
            console.log("Görev grupları güncel değişikliklerle hazırlandı:", groupsList);
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
        off(ref(database, `companies/${companyId}/completedTasks`));
        off(ref(database, `companies/${companyId}/missedTasks`));
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
      
      // Seçilen görevi bul
      const task = selectedTask || {};
      
      // Eğer haftalık görevse, haftalık görev silme fonksiyonunu çağır
      if (taskType === 'weekly') {
        return handleDeleteWeeklyTask(taskId, personnelId);
      }
      
      // Eğer aylık görevse, aylık görev silme fonksiyonunu çağır
      if (taskType === 'monthly') {
        return handleDeleteMonthlyTask(taskId, personnelId);
      }
      
      // Normal görev silme işlemi
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
  
  // Haftalık görev silme fonksiyonu
  const handleDeleteWeeklyTask = async (taskId: string, personnelId: string) => {
    if (!companyId) {
      throw new Error('Şirket bilgisi bulunamadı');
    }

    try {
      console.log('Haftalık görev silme işlemi başladı. TaskId:', taskId, 'PersonnelId:', personnelId);
      
      // Haftalık görevi sil
      await remove(ref(database, `companies/${companyId}/weeklyTasks/${taskId}`));
      console.log('Haftalık görev silindi');
      
      // Personelin diğer görevlerini kontrol et (normal görevler)
      const tasksSnapshot = await get(ref(database, `companies/${companyId}/tasks`));
      const weeklyTasksSnapshot = await get(ref(database, `companies/${companyId}/weeklyTasks`));
      
      let hasOtherTasks = false;
      
      // Normal görevlerde kontrol
      if (tasksSnapshot.exists()) {
        const tasksData = tasksSnapshot.val();
        hasOtherTasks = Object.values(tasksData).some(
          (task: any) => task.personnelId === personnelId
        );
      }
      
      // Haftalık görevlerde kontrol (silinen görev hariç)
      if (!hasOtherTasks && weeklyTasksSnapshot.exists()) {
        const weeklyTasksData = weeklyTasksSnapshot.val();
        hasOtherTasks = Object.entries(weeklyTasksData).some(
          ([id, task]: [string, any]) => id !== taskId && task.personnelId === personnelId
        );
      }
      
      // Eğer başka görev yoksa personelin görev durumunu false yap
      if (!hasOtherTasks) {
        console.log('Personelin başka görevi yok, hasTask false yapılıyor');
        await update(ref(database, `companies/${companyId}/personnel/${personnelId}`), {
          hasTask: false
        });
      }
      
      console.log('Haftalık görev silme işlemi tamamlandı');
    } catch (error) {
      console.error('Haftalık görev silinirken hata:', error);
      throw error;
    }
  };

  // Görev detaylarını gösterme fonksiyonu
  const handleShowTaskDetail = (task: any) => {
    // Tamamlanan veya Tamamlanmamış filtresi aktifse detay modalını açma
    if (statusFilter === 'completed' || statusFilter === 'missed') {
      return; // Detay modalını açmadan çık
    }
    
    setSelectedTask(task);
    setTaskDetailOpen(true);
  };

  // Yeni görev ekleme fonksiyonu
  const handleAddTask = async (taskData: {
    name: string;
    description: string;
    personnelId: string;
    completionType: string;
    isRecurring: boolean;
    repeatType: string;
    dailyRepetitions?: number;
    startTolerance: number;
    repetitionTimes?: string[];
    groupId?: string;
    weekDays?: number[];
    monthDay?: number;
    yearDate?: string;
    branchesId?: string; // Şube ID'si parametresi
    monthlyData?: {
      month: number;
      monthName: string;
      days: {
        day: number;
        dailyRepetitions: number;
        repetitionTimes: string[];
      }[];
    }[];
  }) => {
    if (!companyId) {
      throw new Error('Şirket bilgisi bulunamadı');
    }

    try {
      console.log('Görev ekleme işlemi başladı:', taskData);
      
      // Firebase'de yeni görev referansı oluştur
      const tasksRef = ref(database, `companies/${companyId}/tasks`);
      const newTaskRef = push(tasksRef);
      const newTaskKey = newTaskRef.key;
      
      if (!newTaskKey) {
        throw new Error('Görev ID oluşturulamadı');
      }
      
      const taskToSave: TaskData = {
        name: taskData.name,
        description: taskData.description,
        personnelId: taskData.personnelId,
        status: 'pending', // Başlangıç durumu
        isRecurring: taskData.isRecurring,
        completionType: taskData.completionType,
        createdAt: Date.now(),
      };
      
      // Şube ID'si varsa ekle
      if (taskData.branchesId) {
        taskToSave.branchesId = taskData.branchesId;
        console.log(`Görev ${newTaskKey} için branchesId eklendi:`, taskData.branchesId);
      }
      
      // Tekrarlı görevleri ekle
      if (taskData.isRecurring) {
        taskToSave.repeatType = taskData.repeatType;
        taskToSave.startTolerance = taskData.startTolerance;
        
        // Aylık görevler için yeni formatta veri varsa
        if (taskData.repeatType === 'monthly' && taskData.monthlyData) {
          // MonthlyTasks koleksiyonuna veriyi ekle
          const monthlyTasksRef = ref(database, `companies/${companyId}/monthlyTasks/${newTaskKey}`);
          
          // Ana görev verilerini monthlyTasks koleksiyonuna kaydet
          interface MonthlyTaskData {
            name: string;
            description: string;
            personnelId: string;
            status: string;
            completionType: string;
            createdAt: number;
            startTolerance: number;
            groupId?: string;
            branchesId?: string;
          }
          
          const monthlyTaskToSave: MonthlyTaskData = {
            name: taskData.name,
            description: taskData.description,
            personnelId: taskData.personnelId,
            status: 'pending',
            completionType: taskData.completionType,
            createdAt: Date.now(),
            startTolerance: taskData.startTolerance,
          };
          
          // Şube ID'si varsa ekle
          if (taskData.branchesId) {
            monthlyTaskToSave.branchesId = taskData.branchesId;
          }
          
          // Eğer görev grubu seçildiyse bunu da ekle
          if (taskData.groupId) {
            monthlyTaskToSave.groupId = taskData.groupId;
          }
          
          // Ana görev verilerini kaydet
          await set(monthlyTasksRef, monthlyTaskToSave);
          console.log('Aylık görev ana verisi eklendi');
          
          // Her ay için veriyi ayarla
          for (const monthData of taskData.monthlyData) {
            // Her ay içindeki her gün için veriyi ayarla
            for (const dayData of monthData.days) {
              // Ay ve gün değerlerini iki basamaklı formata dönüştür
              const monthFormat = monthData.month.toString().padStart(2, '0'); 
              const dayFormat = dayData.day.toString().padStart(2, '0');
              
              // Günlük tekrar bilgilerini ayarla
              await set(
                ref(database, `companies/${companyId}/monthlyTasks/${newTaskKey}/month${monthFormat}/day${dayFormat}`),
                {
                  dailyRepetitions: dayData.dailyRepetitions,
                  repetitionTimes: dayData.repetitionTimes
                }
              );
            }
          }
          
          console.log('Aylık görev verileri kaydedildi');
          
          // Personelin görev durumunu güncelle
          await update(ref(database, `companies/${companyId}/personnel/${taskData.personnelId}`), {
            hasTask: true
          });
          
          console.log('Personel görev durumu güncellendi');
          return; // Aylık görevler için işlemi burada sonlandır, tasks koleksiyonuna kaydetme
        } else {
          // Eski formatta aylık görev
          if (taskData.repeatType === 'monthly' && taskData.monthDay) {
            taskToSave.monthDay = taskData.monthDay;
          }
          
          // Diğer tekrar tipleri
          if (taskData.dailyRepetitions) {
            taskToSave.dailyRepetitions = taskData.dailyRepetitions;
          }
          
          if (taskData.repetitionTimes) {
            taskToSave.repetitionTimes = taskData.repetitionTimes;
          }
          
          if (taskData.repeatType === 'weekly' && taskData.weekDays) {
            taskToSave.weekDays = taskData.weekDays;
          } else if (taskData.repeatType === 'yearly' && taskData.yearDate) {
            taskToSave.yearDate = taskData.yearDate;
          }
        }
      }
      
      // Eğer görev grubu seçildiyse bunu da ekle
      if (taskData.groupId) {
        taskToSave.groupId = taskData.groupId;
      }
      
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
  
  // Haftalık görev ekleme fonksiyonu
  const handleAddWeeklyTask = async (taskData: {
    name: string;
    description: string;
    personnelId: string;
    completionType: string;
    weekDays: {
      day: number;
      dailyRepetitions: number;
      repetitionTimes: string[];
    }[];
    startTolerance: number;
    groupId?: string;
    branchesId?: string; // Şube ID'si parametresi
  }) => {
    if (!companyId) {
      throw new Error('Şirket bilgisi bulunamadı');
    }

    try {
      console.log('Haftalık görev ekleme işlemi başladı:', taskData);
      
      // Firebase'de yeni haftalık görev referansı oluştur
      const newTaskRef = ref(database, `companies/${companyId}/weeklyTasks`);
      const newTaskKey = push(newTaskRef).key;
      
      if (!newTaskKey) {
        throw new Error('Görev ID oluşturulamadı');
      }
      
      // Ana görev verilerini hazırla
      interface WeeklyTaskData {
        name: string;
        description: string;
        personnelId: string;
        status: string;
        completionType: string;
        createdAt: number;
        startTolerance: number;
        groupId?: string;
        branchesId?: string; // Şube ID'si
      }
      
      const taskToSave: WeeklyTaskData = {
        name: taskData.name,
        description: taskData.description,
        personnelId: taskData.personnelId,
        status: 'pending', // Başlangıç durumu
        completionType: taskData.completionType,
        createdAt: Date.now(),
        startTolerance: taskData.startTolerance,
      };
      
      // Şube ID'si varsa ekle
      if (taskData.branchesId) {
        taskToSave.branchesId = taskData.branchesId;
        console.log(`Haftalık görev ${newTaskKey} için branchesId eklendi:`, taskData.branchesId);
      }
      
      // Eğer görev grubu seçildiyse bunu da ekle
      if (taskData.groupId) {
        taskToSave.groupId = taskData.groupId;
      }
      
      // Ana görevi kaydet
      await set(ref(database, `companies/${companyId}/weeklyTasks/${newTaskKey}`), taskToSave);
      console.log('Haftalık görev ana verisi eklendi');
      
      // Her bir gün için tekrarları kaydet
      for (const dayData of taskData.weekDays) {
        await set(
          ref(database, `companies/${companyId}/weeklyTasks/${newTaskKey}/days/${dayData.day}`), 
          {
            dailyRepetitions: dayData.dailyRepetitions,
            repetitionTimes: dayData.repetitionTimes
          }
        );
      }
      
      console.log('Haftalık görev günleri başarıyla eklendi');
      
      // Personelin görev durumunu güncelle
      await update(ref(database, `companies/${companyId}/personnel/${taskData.personnelId}`), {
        hasTask: true
      });
      
      console.log('Personel görev durumu güncellendi');
    } catch (error) {
      console.error('Haftalık görev eklenirken hata:', error);
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

  // Excel dışa aktarma fonksiyonu
  const exportToExcel = async () => {
    try {
      // Excel workbook oluştur
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Görevler');
      
      // Sütun başlıklarını tanımla
      worksheet.columns = [
        { header: 'Durum', key: 'status', width: 15 },
        { header: 'Görev Adı', key: 'name', width: 30 },
        { header: 'Görev Saatleri', key: 'times', width: 30 },
        { header: 'Tarih', key: 'date', width: 20 },
        { header: 'Tolerans', key: 'tolerance', width: 12 },
        { header: 'Personel', key: 'personnel', width: 20 },
        { header: 'Açıklama', key: 'description', width: 40 }
      ];
      
      // Stil tanımlamaları
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4F81BD' } },
        border: {
          top: { style: 'thin' as const },
          left: { style: 'thin' as const },
          bottom: { style: 'thin' as const },
          right: { style: 'thin' as const }
        }
      };
      
      // Başlık stilini uygula
      worksheet.getRow(1).eachCell(cell => {
        cell.style = headerStyle;
      });
      
      // Filtrelenmiş görev verilerini ekle
      filteredTasks.forEach(task => {
        // Görev saatleri
        const taskTimes = task.repetitionTimes && task.repetitionTimes.length > 0
          ? task.repetitionTimes.join(', ')
          : '-';
        
        // Tarih bilgisi
        let dateInfo = '-';
        if (task.status === 'completed') {
          dateInfo = task.fromDatabase && task.completionDate 
            ? task.completionDate 
            : (task.completedAt ? new Date(task.completedAt).toLocaleDateString('tr-TR') : '-');
        } else if (task.status === 'missed') {
          dateInfo = task.fromDatabase && task.missedDate 
            ? task.missedDate 
            : (task.missedAt ? new Date(task.missedAt).toLocaleDateString('tr-TR') : '-');
        }
        
        // Tolerans bilgisi
        const toleranceInfo = task.isRecurring ? `${task.startTolerance || 15} dk` : '-';
        
        // Satır ekleme
        worksheet.addRow({
          status: getStatusLabel(task.status),
          name: task.name,
          times: taskTimes,
          date: dateInfo,
          tolerance: toleranceInfo,
          personnel: task.personnelName || 'Atanmamış',
          description: task.description || ''
        });
      });
      
      // Zebrastripe (alternatif satır renklendirme)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // başlığı atla
          const fillColor = rowNumber % 2 === 0 ? 'FFF2F2F2' : 'FFFFFFFF';
          row.eachCell(cell => {
            cell.style = {
              fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: fillColor } },
              border: {
                top: { style: 'thin' as const },
                left: { style: 'thin' as const },
                bottom: { style: 'thin' as const },
                right: { style: 'thin' as const }
              }
            };
          });
        }
      });
      
      // Excel dosyasını oluştur ve indir
      const buffer = await workbook.xlsx.writeBuffer();
      const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      saveAs(new Blob([buffer]), `Görevler_${currentDate}.xlsx`);
      
    } catch (error) {
      console.error('Excel dışa aktarma hatası:', error);
      alert('Excel dosyası oluşturulurken bir hata oluştu.');
    }
  };

  // Görev tipini değiştir
  const handleTaskTypeChange = (event: React.SyntheticEvent, newValue: string) => {
    setTaskType(newValue);
  };

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

  // Aylık görev silme fonksiyonu
  const handleDeleteMonthlyTask = async (taskId: string, personnelId: string): Promise<void> => {
    if (!companyId) {
      throw new Error('Şirket bilgisi bulunamadı');
    }

    try {
      console.log('Aylık görev siliniyor. TaskId:', taskId);
      
      // Firebase'den görevi sil
      await remove(ref(database, `companies/${companyId}/monthlyTasks/${taskId}`));
      console.log('Aylık görev başarıyla silindi');
      
      // Personelin diğer görevlerini kontrol et
      const otherTasksSnapshot = await get(
        ref(database, `companies/${companyId}/tasks`)
      );
      
      const weeklyTasksSnapshot = await get(
        ref(database, `companies/${companyId}/weeklyTasks`)
      );
      
      const monthlyTasksSnapshot = await get(
        ref(database, `companies/${companyId}/monthlyTasks`)
      );
      
      let hasOtherTasks = false;
      
      // Normal görevleri kontrol et
      if (otherTasksSnapshot.exists()) {
        const tasksData = otherTasksSnapshot.val();
        hasOtherTasks = Object.entries(tasksData).some(
          ([id, data]: [string, any]) => data.personnelId === personnelId
        );
      }
      
      // Haftalık görevleri kontrol et
      if (!hasOtherTasks && weeklyTasksSnapshot.exists()) {
        const weeklyTasksData = weeklyTasksSnapshot.val();
        hasOtherTasks = Object.entries(weeklyTasksData).some(
          ([id, data]: [string, any]) => data.personnelId === personnelId
        );
      }
      
      // Kalan aylık görevleri kontrol et
      if (!hasOtherTasks && monthlyTasksSnapshot.exists()) {
        const monthlyTasksData = monthlyTasksSnapshot.val();
        hasOtherTasks = Object.entries(monthlyTasksData).some(
          ([id, data]: [string, any]) => id !== taskId && data.personnelId === personnelId
        );
      }
      
      // Eğer başka görev yoksa personelin görev durumunu false yap
      if (!hasOtherTasks) {
        console.log('Personelin başka görevi yok, hasTask false yapılıyor');
        await update(ref(database, `companies/${companyId}/personnel/${personnelId}`), {
          hasTask: false
        });
      }
      
      console.log('Personel bilgisi güncellendi');
    } catch (error) {
      console.error('Aylık görev silinirken hata:', error);
      throw error;
    }
  };

  // Yıllık görev silme fonksiyonu
  const handleDeleteYearlyTask = async (taskId: string, personnelId: string): Promise<void> => {
    if (!companyId) {
      throw new Error('Şirket bilgisi bulunamadı');
    }

    try {
      console.log('Yıllık görev siliniyor. TaskId:', taskId);
      
      // Firebase'den görevi sil
      await remove(ref(database, `companies/${companyId}/yearlyTasks/${taskId}`));
      console.log('Yıllık görev başarıyla silindi');
      
      // Personelin diğer görevlerini kontrol et
      const otherTasksSnapshot = await get(
        ref(database, `companies/${companyId}/tasks`)
      );
      
      const weeklyTasksSnapshot = await get(
        ref(database, `companies/${companyId}/weeklyTasks`)
      );
      
      const monthlyTasksSnapshot = await get(
        ref(database, `companies/${companyId}/monthlyTasks`)
      );
      
      const yearlyTasksSnapshot = await get(
        ref(database, `companies/${companyId}/yearlyTasks`)
      );
      
      let hasOtherTasks = false;
      
      // Normal görevleri kontrol et
      if (otherTasksSnapshot.exists()) {
        const tasksData = otherTasksSnapshot.val();
        hasOtherTasks = Object.entries(tasksData).some(
          ([id, data]: [string, any]) => data.personnelId === personnelId
        );
      }
      
      // Haftalık görevleri kontrol et
      if (!hasOtherTasks && weeklyTasksSnapshot.exists()) {
        const weeklyTasksData = weeklyTasksSnapshot.val();
        hasOtherTasks = Object.entries(weeklyTasksData).some(
          ([id, data]: [string, any]) => data.personnelId === personnelId
        );
      }
      
      // Kalan aylık görevleri kontrol et
      if (!hasOtherTasks && monthlyTasksSnapshot.exists()) {
        const monthlyTasksData = monthlyTasksSnapshot.val();
        hasOtherTasks = Object.entries(monthlyTasksData).some(
          ([id, data]: [string, any]) => id !== taskId && data.personnelId === personnelId
        );
      }
      
      // Kalan yıllık görevleri kontrol et
      if (!hasOtherTasks && yearlyTasksSnapshot.exists()) {
        const yearlyTasksData = yearlyTasksSnapshot.val();
        hasOtherTasks = Object.entries(yearlyTasksData).some(
          ([id, data]: [string, any]) => id !== taskId && data.personnelId === personnelId
        );
      }
      
      // Eğer başka görev yoksa personelin görev durumunu false yap
      if (!hasOtherTasks) {
        console.log('Personelin başka görevi yok, hasTask false yapılıyor');
        await update(ref(database, `companies/${companyId}/personnel/${personnelId}`), {
          hasTask: false
        });
      }
      
      console.log('Personel bilgisi güncellendi');
    } catch (error) {
      console.error('Yıllık görev silinirken hata:', error);
      throw error;
    }
  };

  // Sekmeye göre doğru veri setini döndüren fonksiyon
  const getTasksForExport = () => {
    switch(taskType) {
      case 'daily':
        return filteredTasks;
      case 'weekly':
        return weeklyTasksData;
      case 'monthly':
        return monthlyTasksData;
      case 'yearly':
        return yearlyTasksData;
      default:
        return filteredTasks;
    }
  };

  // Weekly tasks bileşeni için callback
  const handleWeeklyTasksDataChange = (tasks: any[]) => {
    setWeeklyTasksData(tasks);
  };

  // Monthly tasks bileşeni için callback
  const handleMonthlyTasksDataChange = (tasks: any[]) => {
    setMonthlyTasksData(tasks);
  };

  // Yearly tasks bileşeni için callback
  const handleYearlyTasksDataChange = (tasks: any[]) => {
    setYearlyTasksData(tasks);
  };

  return (
    <ScrollableContent>
      <HeaderContainer>
        <Typography variant="h4" component="h1" fontWeight="bold" color="primary" sx={{ py: 1 }}>
          {isManager ? 'Şube Görevleri' : 'Görevler'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
          <IconButton
            onClick={() => setInfoModalOpen(true)}
            color="info"
            sx={{
              width: 36,
              height: 36
            }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
          <ExcelExportButton 
            tasks={getTasksForExport()}
            taskType={taskType as 'daily' | 'weekly' | 'monthly' | 'yearly'}
            loading={loading}
            getStatusLabel={getStatusLabel}
          />
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

      {/* Görev Tipi Sekmeleri */}
      <Box sx={{ mb: showFilters ? 1 : 2 }}>
        <Tabs 
          value={taskType} 
          onChange={handleTaskTypeChange} 
          variant="fullWidth"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              py: 1.5
            }
          }}
        >
          <Tab 
            value="daily" 
            label="Günlük Görevler" 
            icon={<TodayIcon />} 
            iconPosition="start"
          />
          <Tab 
            value="weekly" 
            label="Haftalık Görevler" 
            icon={<WeekIcon />} 
            iconPosition="start"
          />
          <Tab 
            value="monthly" 
            label="Aylık Görevler" 
            icon={<MonthIcon />} 
            iconPosition="start"
          />
          <Tab 
            value="yearly" 
            label="Yıllık Görevler" 
            icon={<YearIcon />} 
            iconPosition="start"
          />
          <Tab 
            value="takvim" 
            label="Takvim" 
            icon={<TakvimIcon />} 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Günlük Görevler İçeriği */}
      {taskType === 'daily' && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
            <Button 
              variant="outlined" 
              color="primary" 
              size="small"
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{ borderRadius: 2, py: 0.5 }}
            >
              {showFilters ? 'Filtreleri Gizle' : 'Filtreleri Göster'}
            </Button>
          </Box>
          
          <Collapse in={showFilters}>
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
                  <TextField
                    size="small"
                    placeholder="Görev Ara..."
                    value={taskSearchTerm}
                    onChange={(e) => setTaskSearchTerm(e.target.value)}
                    sx={{ mt: 1 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormControl>

                <FormControl sx={{ minWidth: 200, flex: 1 }}>
                  <Autocomplete
                    size="small"
                    options={personnel}
                    getOptionLabel={(option) => option.name || ''}
                    value={personnel.find(p => p.id === personnelFilter) || null}
                    onChange={(event, newValue) => {
                      setPersonnelFilter(newValue?.id || 'all');
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Personel Ara..."
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <MenuItem {...props}>
                        {option.name}
                      </MenuItem>
                    )}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    noOptionsText="Personel bulunamadı"
                    clearText="Tümünü Temizle"
                    openText="Aç"
                    closeText="Kapat"
                  />
                  
                  {/* Grup Filtresi */}
                  <Autocomplete
                    size="small"
                    options={taskGroups}
                    getOptionLabel={(option) => option.name || ''}
                    value={taskGroups.find(g => g.id === groupFilter) || null}
                    onChange={handleGroupFilterChange}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Grup Filtrele..."
                        sx={{ mt: 1 }}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <CategoryIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <MenuItem {...props}>
                        {option.name}
                      </MenuItem>
                    )}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    noOptionsText="Grup bulunamadı"
                    clearText="Tümünü Temizle"
                    openText="Aç"
                    closeText="Kapat"
                  />
                </FormControl>
              </Box>
            </FilterContainer>
          </Collapse>

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
                  <TaskCard 
                    onClick={() => handleShowTaskDetail(task)}
                    sx={{
                      cursor: statusFilter === 'completed' || statusFilter === 'missed' ? 'default' : 'pointer',
                      '&:hover': {
                        boxShadow: statusFilter === 'completed' || statusFilter === 'missed' 
                          ? '0 4px 12px rgba(0,0,0,0.05)' // Orijinal gölge
                          : '0 6px 16px rgba(0,0,0,0.1)' // Hover durumunda daha belirgin gölge
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
                          flexGrow: 1,
                        }}
                      >
                        {task.description || 'Açıklama yok'}
                      </Typography>

                      {/* Tarih bilgisi göster */}
                      {(task.status === 'completed' || task.status === 'missed') && (
                        <Box sx={{ mb: 1.5 }}>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'flex-end',
                              fontStyle: 'italic'
                            }}
                          >
                            {task.status === 'completed' ? 'Tamamlanma: ' : 'Kaçırılma: '}
                            {task.fromDatabase && (task.completionDate || task.missedDate)
                              ? `${task.status === 'completed' ? task.completionDate : task.missedDate}`
                              : (task.status === 'completed' 
                                  ? (task.completedAt ? new Date(task.completedAt).toLocaleDateString('tr-TR', { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : '-') 
                                  : (task.missedAt ? new Date(task.missedAt).toLocaleDateString('tr-TR', { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : '-')
                              )
                            }
                          </Typography>
                        </Box>
                      )}

                      {task.branchesId && (
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            fontSize: '0.7rem'
                          }}>
                            <BusinessIcon fontSize="small" sx={{ mr: 0.5, fontSize: 14, color: 'info.main' }} />
                            Şube: {getBranchName(task.branchesId)}
                          </Typography>
                        </Box>
                      )}

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
                        
                        {task.isRecurring && task.completionType === 'qr' && !task.fromDatabase && statusFilter !== 'completed' && statusFilter !== 'missed' && (
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
              statusFilter={statusFilter}
              onShowTaskDetail={handleShowTaskDetail}
              onOpenQrPrintModal={handleOpenQrPrintModal}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              getStatusLabel={getStatusLabel}
              getTaskTimeColor={getTaskTimeColor}
              companyId={companyId}
            />
          )}
        </>
      )}

      {/* Haftalık Görevler İçeriği */}
      {taskType === 'weekly' && (
        <>
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
                <TextField
                  size="small"
                  placeholder="Görev Ara..."
                  value={taskSearchTerm}
                  onChange={(e) => setTaskSearchTerm(e.target.value)}
                  sx={{ mt: 1 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </FormControl>

              <FormControl sx={{ minWidth: 200, flex: 1 }}>
                <Autocomplete
                  size="small"
                  options={personnel}
                  getOptionLabel={(option) => option.name || ''}
                  value={personnel.find(p => p.id === personnelFilter) || null}
                  onChange={(event, newValue) => {
                    setPersonnelFilter(newValue?.id || 'all');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Personel Ara..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <MenuItem {...props}>
                      {option.name}
                    </MenuItem>
                  )}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  noOptionsText="Personel bulunamadı"
                  clearText="Tümünü Temizle"
                  openText="Aç"
                  closeText="Kapat"
                />
              </FormControl>
            </Box>
          </FilterContainer>

          <WeeklyTasks
            companyId={companyId}
            statusFilter={statusFilter}
            personnelFilter={personnelFilter}
            taskSearchTerm={taskSearchTerm}
            viewMode={viewMode}
            personnel={personnel}
            onShowTaskDetail={handleShowTaskDetail}
            onOpenQrPrintModal={handleOpenQrPrintModal}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            getStatusLabel={getStatusLabel}
            getTaskTimeColor={getTaskTimeColor}
            onDeleteTask={handleDeleteTask}
            onWeeklyTasksDataChange={handleWeeklyTasksDataChange}
          />
        </>
      )}

      {/* Aylık Görevler İçeriği */}
      {taskType === 'monthly' && (
        <>
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
                <TextField
                  size="small"
                  placeholder="Görev Ara..."
                  value={taskSearchTerm}
                  onChange={(e) => setTaskSearchTerm(e.target.value)}
                  sx={{ mt: 1 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </FormControl>

              <FormControl sx={{ minWidth: 200, flex: 1 }}>
                <Autocomplete
                  size="small"
                  options={personnel}
                  getOptionLabel={(option) => option.name || ''}
                  value={personnel.find(p => p.id === personnelFilter) || null}
                  onChange={(event, newValue) => {
                    setPersonnelFilter(newValue?.id || 'all');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Personel Ara..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <MenuItem {...props}>
                      {option.name}
                    </MenuItem>
                  )}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  noOptionsText="Personel bulunamadı"
                  clearText="Tümünü Temizle"
                  openText="Aç"
                  closeText="Kapat"
                />
              </FormControl>
            </Box>
          </FilterContainer>

          <MonthlyTasks
            companyId={companyId}
            statusFilter={statusFilter}
            personnelFilter={personnelFilter}
            taskSearchTerm={taskSearchTerm}
            viewMode={viewMode}
            personnel={personnel}
            onShowTaskDetail={handleShowTaskDetail}
            onOpenQrPrintModal={handleOpenQrPrintModal}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            getStatusLabel={getStatusLabel}
            getTaskTimeColor={getTaskTimeColor}
            onDeleteTask={handleDeleteMonthlyTask}
            onMonthlyTasksDataChange={handleMonthlyTasksDataChange}
          />
        </>
      )}

      {/* Yıllık Görevler İçeriği */}
      {taskType === 'yearly' && (
        <>
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
                <TextField
                  size="small"
                  placeholder="Görev Ara..."
                  value={taskSearchTerm}
                  onChange={(e) => setTaskSearchTerm(e.target.value)}
                  sx={{ mt: 1 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </FormControl>

              <FormControl sx={{ minWidth: 200, flex: 1 }}>
                <Autocomplete
                  size="small"
                  options={personnel}
                  getOptionLabel={(option) => option.name || ''}
                  value={personnel.find(p => p.id === personnelFilter) || null}
                  onChange={(event, newValue) => {
                    setPersonnelFilter(newValue?.id || 'all');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Personel Ara..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <MenuItem {...props}>
                      {option.name}
                    </MenuItem>
                  )}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  noOptionsText="Personel bulunamadı"
                  clearText="Tümünü Temizle"
                  openText="Aç"
                  closeText="Kapat"
                />
              </FormControl>
            </Box>
          </FilterContainer>

          <YearlyTasks
            companyId={companyId}
            statusFilter={statusFilter}
            personnelFilter={personnelFilter}
            taskSearchTerm={taskSearchTerm}
            viewMode={viewMode}
            personnel={personnel}
            onShowTaskDetail={handleShowTaskDetail}
            onOpenQrPrintModal={handleOpenQrPrintModal}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            getStatusLabel={getStatusLabel}
            getTaskTimeColor={getTaskTimeColor}
            onDeleteTask={handleDeleteYearlyTask}
            onYearlyTasksDataChange={handleYearlyTasksDataChange}
          />
        </>
      )}

      {taskType === 'takvim' && (
        <Takvim
          companyId={companyId}
        />
      )}

      {/* Görev Detay Modalı - hem yöneticiler hem normal kullanıcılar görebilir */}
      <TaskDetailModal
        open={taskDetailOpen}
        onClose={() => setTaskDetailOpen(false)}
        task={selectedTask}
        onDelete={handleDeleteTask}
        onUpdatePersonnel={!isManager ? handleUpdatePersonnel : undefined} // Yöneticiler personel atayamaz
        personnel={personnel}
        getStatusColor={getStatusColor}
        getStatusIcon={getStatusIcon}
        getStatusLabel={getStatusLabel}
        readOnly={isManager} // Yönetici modu salt okunur
      />

      {/* Görev Ekleme Modalı - hem yöneticiler hem de normal kullanıcılar görebilir */}
      <AddTaskModal
        open={addTaskModalOpen}
        onClose={() => setAddTaskModalOpen(false)}
        onAddTask={handleAddTask}
        onAddWeeklyTask={handleAddWeeklyTask}
        personnel={personnel}
        taskGroups={taskGroups}
        companyId={companyId || ''}
        branchId={branchId}
        isManager={isManager}
      />
      
      {/* Grup ekleme modalı - şimdi hem yöneticiler hem de normal kullanıcılar görebilir */}
      <TaskGroupsModal
        open={taskGroupsModalOpen}
        onClose={() => setTaskGroupsModalOpen(false)}
        companyId={companyId || ''}
        taskGroups={taskGroups}
        isManager={isManager}
        branchId={branchId}
      />
      
      {/* Bu modallar her zaman gösterilsin */}
      {/* QR Kod Yazdırma Modalı */}
      <QrPrintModal
        open={qrPrintModalOpen}
        onClose={() => setQrPrintModalOpen(false)}
        task={selectedTaskForQr}
      />

      {/* Bilgi Modalı */}
      <TaskInfoModal
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
      />
    </ScrollableContent>
  );
};

export default Tasks; 
