import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box,
  styled,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemButton,
  FormControlLabel,
  Chip,
  SelectChangeEvent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  PeopleOutline as PeopleIcon,
  AssignmentOutlined as TaskIcon,
  CheckCircleOutline as CompletedIcon,
  PendingOutlined as PendingIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  InfoOutlined as InfoIcon,
  Search as SearchIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { ref, get, onValue, off } from 'firebase/database';
import { database, auth } from '../../firebase';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import MissedTasksModal from './MissedTasksModal';
import CompletedTasksModal from './CompletedTasksModal';
import PendingTasksModal from './PendingTasksModal';
import AllCompletedTasksModal from './AllCompletedTasksModal';
import { useNavigate } from 'react-router-dom';
import SurveyCharts from './SurveyCharts';
import TaskStatusChart from './TaskStatusChart';
import PersonnelPerformanceChart from './PersonnelPerformanceChart';
import WidgetSelectorModal from './WidgetSelectorModal';
import StatsCards from './StatsCards';

// Leaflet için marker icon düzeltmeleri
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Marker icon with custom color
const createColoredMarkerIcon = (color = 'blue') => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    iconRetinaUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

// Map view ayarlamak için özel komponent
interface MapViewProps {
  center: L.LatLngExpression;
  zoom: number;
}

// Dashboard bileşeni için props tanımı
interface DashboardProps {
  branchId?: string | null;
  isManager?: boolean;
}

function MapView({ center, zoom }: MapViewProps) {
  const map = useMap();
  if (Array.isArray(center)) {
    map.setView(center as [number, number], zoom);
  } else {
    map.setView([center.lat, center.lng], zoom);
  }
  return null;
}

// Tema renkleri (mobile uyumlu)
const THEME_COLORS = {
  personnel: '#1976D2', // Mavi
  tasks: '#9C27B0',     // Mor
  pending: '#FF9800',   // Turuncu
  completed: '#4CAF50'  // Yeşil
};

// Kaydırılabilir ana içerik için styled component
const ScrollableContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  overflowY: 'auto',
  height: 'calc(100vh - 64px)', // Header yüksekliğini (varsayılan 64px) çıkarıyoruz
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

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  borderRadius: 8,
  overflow: 'hidden',
  '& .MuiCardHeader-root': {
    padding: theme.spacing(1),
    '& .MuiTypography-h6': {
      fontSize: '1rem',
      fontWeight: 'bold',
    },
  },
  '& .MuiCardContent-root': {
    padding: theme.spacing(1),
  },
}));

// İstatistik kartı için styled component - tıklanabilir kart
const StatsCard = styled(Paper)<{ bgcolor: string }>(({ theme, bgcolor }) => ({
  padding: theme.spacing(3),
  display: 'flex',
  alignItems: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  borderRadius: 12,
  cursor: 'pointer',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
    background: `linear-gradient(to right, white, ${bgcolor}10)`,
  },
}));

const IconBox = styled(Box)<{ bgcolor: string }>(({ theme, bgcolor }) => ({
  width: 40,
  height: 40,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: bgcolor,
  marginRight: theme.spacing(1),
  '& .MuiSvgIcon-root': {
    color: 'white',
    fontSize: 24,
  },
}));

const StatsText = styled(Box)({
  flexGrow: 1,
  '& .MuiTypography-h4': {
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  '& .MuiTypography-body2': {
    fontSize: '0.75rem',
  },
});

const ChartContainer = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  borderRadius: 8,
  '& .MuiTypography-h6': {
    fontSize: '1rem',
    fontWeight: 'bold',
  },
}));

// Location Map Card
const MapCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  borderRadius: 12,
  overflow: 'hidden',
}));

const MapContainerWrapper = styled(Box)(({ theme }) => ({
  height: 400,
  [theme.breakpoints.up('md')]: {
    height: 500, // Orta boyutlu ekranlarda (tablet)
  },
  [theme.breakpoints.up('lg')]: {
    height: 600, // Büyük ekranlarda
  },
  [theme.breakpoints.up('xl')]: {
    height: 700, // Çok büyük ekranlarda
  },
  width: '100%',
  '& .leaflet-container': {
    height: '100%',
    width: '100%',
    borderRadius: '0 0 12px 12px',
  }
}));

const FilterContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(2),
  alignItems: 'flex-end'
}));

const Dashboard: React.FC<DashboardProps> = ({ branchId, isManager = false }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPersonnel: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
  });
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]); // Tüm görevler için liste
  const [taskStatusData, setTaskStatusData] = useState<any[]>([]);
  const [personnelPerformanceData, setPersonnelPerformanceData] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [recentMissedTasks, setRecentMissedTasks] = useState<any[]>([]);
  const [recentCompletedTasks, setRecentCompletedTasks] = useState<any[]>([]);
  const [allMissedTasks, setAllMissedTasks] = useState<any[]>([]);
  const [allCompletedTasks, setAllCompletedTasks] = useState<any[]>([]);
  const [allPendingTasks, setAllPendingTasks] = useState<any[]>([]);
  const [missedTasksModalOpen, setMissedTasksModalOpen] = useState(false);
  const [completedTasksModalOpen, setCompletedTasksModalOpen] = useState(false);
  const [pendingTasksModalOpen, setPendingTasksModalOpen] = useState(false);
  const [allCompletedTasksModalOpen, setAllCompletedTasksModalOpen] = useState(false);
  const [worstPerformers, setWorstPerformers] = useState<any[]>([]);
  const theme = useTheme();
  const navigate = useNavigate();
  
  // Arama için state'ler
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState('');
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  
  // New state for map features
  const [taskLocations, setTaskLocations] = useState<any[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<any[]>([]);
  const [selectedTaskCount, setSelectedTaskCount] = useState<number>(10);
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [allTasksWithLocation, setAllTasksWithLocation] = useState<any[]>([]);
  
  // Görev durum dağılımı ve personel performansı için açıklama modalları için state
  const [taskStatusInfoModalOpen, setTaskStatusInfoModalOpen] = useState(false);
  const [personnelPerformanceInfoModalOpen, setPersonnelPerformanceInfoModalOpen] = useState(false);
  
  // Widget seçimi için state'ler
  const [widgetSelectorOpen, setWidgetSelectorOpen] = useState(false);
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(['stats', 'taskStatus', 'personnelPerformance']);
  
  // Widget listesi
  const widgets = [
    {
      id: 'stats',
      title: 'İstatistik Kartları',
      description: 'Toplam personel, görev ve diğer istatistikler'
    },
    {
      id: 'taskStatus',
      title: 'Görev Durumu Dağılımı',
      description: 'Görevlerin durumlarına göre dağılım grafiği'
    },
    {
      id: 'personnelPerformance',
      title: 'Personel Performansı',
      description: 'Personellerin görev performans grafiği'
    },
    {
      id: 'surveyCharts',
      title: 'Anket Grafikleri',
      description: 'Anket sonuçlarının grafiksel gösterimi'
    },
    {
      id: 'missedTasks',
      title: 'Geciken Görevler',
      description: 'Son geciken görevlerin listesi'
    },
    {
      id: 'completedTasks',
      title: 'Tamamlanan Görevler',
      description: 'Son tamamlanan görevlerin listesi'
    },
    {
      id: 'worstPerformers',
      title: 'En Çok Görev Geciktirenler',
      description: 'En çok görev geciktiren personellerin listesi'
    },
    {
      id: 'bestPerformers',
      title: 'En Çok Görev Yapanlar',
      description: 'En çok görev yapan personellerin listesi'
    },
    {
      id: 'taskLocations',
      title: 'Görev Konumları',
      description: 'Görev tamamlama konumlarının harita üzerinde gösterimi'
    }
  ];
  
  // Modal pencereleri için işlevler
  const handleOpenMissedTasksModal = () => {
    setMissedTasksModalOpen(true);
  };

  const handleCloseMissedTasksModal = () => {
    setMissedTasksModalOpen(false);
  };

  const handleOpenCompletedTasksModal = () => {
    setCompletedTasksModalOpen(true);
  };

  const handleCloseCompletedTasksModal = () => {
    setCompletedTasksModalOpen(false);
  };
  
  // Yeni modallar için işlevler
  const handleOpenPendingTasksModal = () => {
    setPendingTasksModalOpen(true);
  };

  const handleClosePendingTasksModal = () => {
    setPendingTasksModalOpen(false);
  };

  const handleOpenAllCompletedTasksModal = () => {
    setAllCompletedTasksModalOpen(true);
  };

  const handleCloseAllCompletedTasksModal = () => {
    setAllCompletedTasksModalOpen(false);
  };
  
  // Sayfa yönlendirme fonksiyonları
  const handleNavigateToPersonnel = () => {
    navigate('/personnel');
  };
  
  const handleNavigateToTasks = () => {
    navigate('/tasks');
  };
  
  // Veri güncellemesini işler
  const processData = (personnelData: any, tasksData: any, companyData: any = {}) => {
    // Personel listesi
    let personnelList = personnelData ? Object.entries(personnelData).map(([id, data]: [string, any]) => ({
      id,
      ...data,
    })) : [];
    
    // Eğer yönetici ve branchId varsa, sadece bu şubeye ait personeli filtrele
    if (isManager && branchId) {
      personnelList = personnelList.filter(person => person.branchesId === branchId);
    }
    
    setPersonnel(personnelList);
    
    // Görev listesi - ana görevleri al (toplam görev sayısı için)
    let tasksList = tasksData ? Object.entries(tasksData)
      .filter(([key]) => key !== 'missedTasks') // missedTasks anahtarını filtrele
      .map(([id, data]: [string, any]) => ({
        id,
        ...data,
      })) : [];
    
    // Eğer yönetici ve branchId varsa, sadece bu şubeye ait görevleri filtrele
    if (isManager && branchId) {
      tasksList = tasksList.filter(task => {
        // Görevin bağlı olduğu personel bu şubede mi kontrol et
        const personnelOfTask = personnelList.find(p => p.id === task.personnelId);
        return personnelOfTask && personnelOfTask.branchesId === branchId;
      });
    }
    
    // Tüm görevleri sakla
    setTasks(tasksList);
    
    // Son eklenen görevler
    const sortedTasks = [...tasksList].sort((a, b) => b.createdAt - a.createdAt).slice(0, 2);
    setRecentTasks(sortedTasks);
    
    // Devam eden görevleri al (accepted ve assigned olanlar)
    const pendingTasksList = tasksList
      .filter(task => task.status === 'accepted' || task.status === 'assigned')
      .map(task => ({
        id: task.id,
        name: task.name,
        description: task.description || '',
        status: task.status,
        personnelId: task.personnelId,
        personnelName: personnelData[task.personnelId]?.name || 'Atanmamış',
      }));
    setAllPendingTasks(pendingTasksList);
    
    // İstatistikleri hesapla
    const totalTasks = tasksList.length;
    const completedTasksCount = tasksList.filter(task => task.status === 'completed').length;
    const activeTasksCount = tasksList.filter(task => task.status === 'accepted' || task.status === 'assigned').length;
    const waitingTasksCount = tasksList.filter(task => task.status === 'waiting').length;
    const pendingTasksCount = tasksList.filter(task => task.status === 'pending').length;
    
    // Tamamlanmamış (missed) görevleri hesapla
    let missedTasksCount = 0;
    
    // Missed task listesi
    const missedTasksList: any[] = [];
    
    // Tamamlanmış görev listesi 
    const completedTasksList: any[] = [];
    
    // Personel performans değerlendirmesi için
    const personnelMissedCounts: { [key: string]: { id: string, name: string, missedCount: number } } = {};
    
    // Tüm personeli başlangıçta 0 gecikme ile ekle
    personnelList.forEach(person => {
      personnelMissedCounts[person.id] = {
        id: person.id,
        name: person.name,
        missedCount: 0
      };
    });
    
    // Eğer şirketin missedTasks verisi varsa say
    if (companyData && companyData.missedTasks) {
      console.log("missedTasks bulundu:", companyData.missedTasks);
      
      // missedTasks yapısını incele ve say
      Object.entries(companyData.missedTasks).forEach(([taskId, taskDates]: [string, any]) => {
        // Her tarih için
        Object.entries(taskDates).forEach(([date, timeSlots]: [string, any]) => {
          // Her saat için
          Object.entries(timeSlots).forEach(([time, taskData]: [string, any]) => {
            // İlgili görevi tasks listesinden bul (atanan personeli almak için)
            const task = tasksList.find(t => t.id === taskId);
            
            // Personel bilgisini bul
            let personnelName = "Atanmamış";
            let personnelId = null;
            if (task && task.personnelId) {
              personnelId = task.personnelId;
              const person = personnelList.find(p => p.id === task.personnelId);
              
              // Eğer bu personel yöneticinin şubesine aitse sayıma dahil et
              if (person) {
                // Eğer yönetici ve branchId varsa, sadece bu şubeye ait missed görevleri say
                if (!isManager || !branchId || person.branchesId === branchId) {
                  missedTasksCount++;
                  personnelName = person.name;
                  
                  // Personelin gecikme sayısını artır
                  if (personnelMissedCounts[person.id]) {
                    personnelMissedCounts[person.id].missedCount += 1;
                  }
                  
                  // Geciken görevleri listeye ekle
                  missedTasksList.push({
                    id: `${taskId}-${date}-${time}`,
                    name: taskData.taskName,
                    description: taskData.taskDescription || '',
                    date: date,
                    time: time,
                    missedAt: taskData.missedAt,
                    personnelId: personnelId,
                    personnelName: personnelName
                  });
                }
              }
            }
          });
        });
      });
      
      console.log("Toplam missed görev sayısı:", missedTasksCount);
    }
    
    // Tamamlanan görevleri al
    let completedTasksFromDbCount = 0;
    if (companyData && companyData.completedTasks) {
      Object.entries(companyData.completedTasks).forEach(([taskId, taskDates]: [string, any]) => {
        // Her tarih için
        Object.entries(taskDates).forEach(([date, timeSlots]: [string, any]) => {
          // Her saat için
          Object.entries(timeSlots).forEach(([time, taskData]: [string, any]) => {
            // İlgili görevi tasks listesinden bul (atanan personeli almak için)
            const task = tasksList.find(t => t.id === taskId);
            
            // Personel bilgisini bul
            let personnelName = "Atanmamış";
            let personnelId = taskData.completedBy || task?.personnelId || null;
            
            // Öncelikle startedBy veya completedBy bilgisini kullan
            if (personnelId) {
              const person = personnelList.find(p => p.id === personnelId);
              
              // Eğer bu personel yöneticinin şubesine aitse sayıma dahil et
              if (person) {
                // Eğer yönetici ve branchId varsa, sadece bu şubeye ait tamamlanan görevleri say
                if (!isManager || !branchId || person.branchesId === branchId) {
                  completedTasksFromDbCount++; // Tamamlanan görev sayacını artır
                  personnelName = person.name;
                  
                  // Tamamlanan görevleri listeye ekle
                  completedTasksList.push({
                    id: `${taskId}-${date}-${time}`,
                    name: taskData.taskName,
                    description: taskData.taskDescription || '',
                    date: date,
                    time: time,
                    completedAt: taskData.completedAt,
                    personnelId: personnelId,
                    personnelName: personnelName
                  });
                }
              }
            }
          });
        });
      });
    }
    
    // Toplam tamamlanan görev sayısı: ana liste + veritabanından gelen
    const totalCompletedTasks = completedTasksCount + completedTasksFromDbCount;
    console.log("Toplam tamamlanan görevler:", totalCompletedTasks);
    console.log("- Ana listeden:", completedTasksCount);
    console.log("- Veritabanından:", completedTasksFromDbCount);
    
    // En kötü performans gösteren personelleri hesapla (en çok görev geciktiren)
    const worstPerformers = Object.values(personnelMissedCounts)
      .filter(person => person.missedCount > 0) // Sadece görevi geciktirmiş personelleri al
      .sort((a, b) => b.missedCount - a.missedCount) // Gecikme sayısına göre sırala (çoktan aza)
      .slice(0, 10); // En kötü 10 personeli al
    
    setWorstPerformers(worstPerformers);
    
    setStats({
      totalPersonnel: personnelList.length,
      totalTasks, // Sadece tasks altındaki görevleri göster, missedTasks'ı dahil etme
      completedTasks: totalCompletedTasks, // Değiştirildi: Toplam tamamlanan görev sayısı
      pendingTasks: activeTasksCount,
    });
    
    // Görev durumu verilerini hazırla
    setTaskStatusData([
      { name: 'Tamamlanan', value: totalCompletedTasks, color: THEME_COLORS.completed }, // Tüm tamamlanan görevler (ana liste + veritabanı)
      { name: 'Devam Eden', value: activeTasksCount, color: '#1976D2' }, // Mavi
      { name: 'Bekleyen', value: waitingTasksCount, color: '#2196F3' }, // Açık Mavi
      { name: 'Bekliyor', value: pendingTasksCount, color: THEME_COLORS.pending }, // Turuncu
      { name: 'Tamamlanmamış', value: missedTasksCount, color: '#F44336' }, // Kırmızı
    ].filter(item => item.value > 0));
    
    // Personel performans verilerini hazırla
    // Personellerin tamamladığı görev sayılarını hesapla
    const personnelPerformance: { [key: string]: { name: string, completed: number, pending: number, missed: number } } = {};
    
    personnelList.forEach(person => {
      personnelPerformance[person.id] = {
        name: person.name,
        completed: 0,   // Tüm tamamlanan görevler (ana liste + veritabanı)
        pending: 0,     // Devam eden görevler
        missed: 0       // Kaçırılan görevler
      };
    });
    
    // Ana görev listesindeki tamamlanan ve devam eden görevleri hesapla
    tasksList.forEach(task => {
      if (task.personnelId && personnelPerformance[task.personnelId]) {
        if (task.status === 'completed') {
          personnelPerformance[task.personnelId].completed += 1;
        } else if (task.status === 'accepted' || task.status === 'assigned') {
          personnelPerformance[task.personnelId].pending += 1;
        }
      }
    });
    
    // Veritabanından gelen tamamlanan görevleri hesapla
    if (companyData && companyData.completedTasks) {
      Object.entries(companyData.completedTasks).forEach(([taskId, taskDates]: [string, any]) => {
        Object.entries(taskDates).forEach(([date, timeSlots]: [string, any]) => {
          Object.entries(timeSlots).forEach(([time, taskData]: [string, any]) => {
            // Personel bilgisini bul
            let personnelId = null;
            
            // Öncelikle completedBy varsa kullan
            if (taskData.completedBy) {
              personnelId = taskData.completedBy;
            } 
            // Yoksa ilgili görevi bul ve onun personnelId'sini kullan
            else {
              const task = tasksList.find(t => t.id === taskId);
              if (task && task.personnelId) {
                personnelId = task.personnelId;
              }
            }
            
            // Personel bulunabildiyse ve dizinde varsa sayacı artır
            if (personnelId && personnelPerformance[personnelId]) {
              personnelPerformance[personnelId].completed += 1;
            }
          });
        });
      });
    }
    
    // Kaçırılan görevleri hesapla
    if (companyData && companyData.missedTasks) {
      Object.entries(companyData.missedTasks).forEach(([taskId, taskDates]: [string, any]) => {
        Object.entries(taskDates).forEach(([date, timeSlots]: [string, any]) => {
          Object.entries(timeSlots).forEach(([time, taskData]: [string, any]) => {
            // İlgili görevi tasks listesinden bul (atanan personeli almak için)
            const task = tasksList.find(t => t.id === taskId);
            
            // Personel bilgisini bul
            if (task && task.personnelId && personnelPerformance[task.personnelId]) {
              personnelPerformance[task.personnelId].missed += 1;
            }
          });
        });
      });
    }
    
    // Performans verilerini grafiğe uygun hale getir
    const performanceData = Object.values(personnelPerformance)
      .filter(p => p.completed > 0 || p.pending > 0 || p.missed > 0) // Görevi olan personelleri göster
      .sort((a, b) => {
        // Toplam görev sayısına göre sırala (tüm kategoriler)
        const totalA = a.completed + a.pending + a.missed;
        const totalB = b.completed + b.pending + b.missed;
        return totalB - totalA;
      })
      .slice(0, 5); // İlk 5 personeli al
    
    setPersonnelPerformanceData(performanceData);

    // Son 10 geciken görevi tarih ve saate göre sırala
    const sortedMissedTasks = [...missedTasksList]
      .sort((a, b) => b.missedAt - a.missedAt)
      .slice(0, 10);
      
    // Son 10 tamamlanan görevi tarih ve saate göre sırala
    const sortedCompletedTasks = [...completedTasksList]
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, 10);
    
    setRecentMissedTasks(sortedMissedTasks);
    setRecentCompletedTasks(sortedCompletedTasks);

    // Tüm geciken ve tamamlanan görevleri de sakla (en yeniden eskiye doğru sıralı)
    setAllMissedTasks([...missedTasksList].sort((a, b) => b.missedAt - a.missedAt));
    setAllCompletedTasks([...completedTasksList].sort((a, b) => b.completedAt - a.completedAt));

    // Extract all completed tasks with location data
    const tasksWithLocation: any[] = [];
    
    if (companyData && companyData.completedTasks) {
      Object.entries(companyData.completedTasks).forEach(([taskId, taskDates]: [string, any]) => {
        // Her tarih için
        Object.entries(taskDates).forEach(([date, timeSlots]: [string, any]) => {
          // Her saat için
          Object.entries(timeSlots).forEach(([time, taskData]: [string, any]) => {
            // Check if task has location data
            if (taskData.completionLocation) {
              // Find task and personnel info
              const task = tasksList.find(t => t.id === taskId);
              let personnelName = "Atanmamış";
              let personnelId = null;
              
              // Determine who completed the task
              if (taskData.completedBy) {
                personnelId = taskData.completedBy;
                const person = personnelList.find(p => p.id === taskData.completedBy);
                if (person) personnelName = person.name;
              } else if (task && task.personnelId) {
                personnelId = task.personnelId;
                const person = personnelList.find(p => p.id === task.personnelId);
                if (person) personnelName = person.name;
              }
              
              // Add to location list
              tasksWithLocation.push({
                id: `${taskId}-${date}-${time}`,
                taskId: taskId,
                name: taskData.taskName,
                description: taskData.taskDescription || '',
                date: date,
                time: time,
                location: taskData.completionLocation,
                completedAt: taskData.completedAt,
                personnelId: personnelId,
                personnelName: personnelName
              });
            }
          });
        });
      });
    }
    
    // Sort by completion time (newest first)
    tasksWithLocation.sort((a, b) => b.completedAt - a.completedAt);
    
    // Set all tasks with location data
    setAllTasksWithLocation(tasksWithLocation);
    
    // Set initial filtered tasks (most recent N tasks)
    setFilteredLocations(tasksWithLocation.slice(0, selectedTaskCount));
  };
  
  // Filter locations based on selections
  useEffect(() => {
    let filtered = [...allTasksWithLocation];
    
    // Filter by personnel if any selected
    if (selectedPersonnel.length > 0) {
      filtered = filtered.filter(task => selectedPersonnel.includes(task.personnelId));
    }
    
    // Filter by task ID if any selected
    if (selectedTasks.length > 0) {
      filtered = filtered.filter(task => selectedTasks.includes(task.taskId));
    }
    
    // Limit to selected count
    filtered = filtered.slice(0, selectedTaskCount);
    
    setFilteredLocations(filtered);
  }, [selectedTaskCount, selectedPersonnel, selectedTasks, allTasksWithLocation]);
  
  // Handle task count selection
  const handleTaskCountChange = (event: SelectChangeEvent<number>) => {
    setSelectedTaskCount(event.target.value as number);
  };
  
  // Handle personnel selection
  const handlePersonnelChange = (event: SelectChangeEvent<string[]>) => {
    setSelectedPersonnel(event.target.value as string[]);
  };
  
  // Handle task selection
  const handleTaskChange = (event: SelectChangeEvent<string[]>) => {
    setSelectedTasks(event.target.value as string[]);
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setSelectedTaskCount(10);
    setSelectedPersonnel([]);
    setSelectedTasks([]);
  };
  
  // Widget seçimini değiştir
  const handleWidgetSelectionChange = (widgetId: string) => {
    setSelectedWidgets(prev => {
      if (prev.includes(widgetId)) {
        return prev.filter(id => id !== widgetId);
      } else {
        return [...prev, widgetId];
      }
    });
  };

  // Modal'ı aç
  const handleOpenWidgetSelector = () => {
    setWidgetSelectorOpen(true);
  };

  // Modal'ı kapat
  const handleCloseWidgetSelector = () => {
    setWidgetSelectorOpen(false);
  };
  
  useEffect(() => {
    const setupDashboard = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) return;
        
        // Kullanıcı verilerini al
        const userSnapshot = await get(ref(database, `users/${user.uid}`));
        if (!userSnapshot.exists()) return;
        
        const userData = userSnapshot.val();
        const companyId = userData.companyId || null;
        setCompanyId(companyId);
        
        if (!companyId) {
          setLoading(false);
          return;
        }
        
        // Şubeyi kontrol et - branchId props'tan geldiyse onu kullan, 
        // yoksa kullanıcı verisinden kontrol et (manager değilse)
        const effectiveBranchId = branchId || (!isManager ? userData.branchesId : null);
        
        console.log("Dashboard yükleniyor:", isManager ? "Yönetici modu" : "Normal mod");
        if (effectiveBranchId) {
          console.log("Şube ID:", effectiveBranchId);
        }
        
        // Personel, görev ve şirket verilerini almak için referanslar
        const personnelRef = ref(database, `companies/${companyId}/personnel`);
        const tasksRef = ref(database, `companies/${companyId}/tasks`);
        const companyRef = ref(database, `companies/${companyId}`);
        
        // Başlangıç verilerini almak için bir kez çağrı yap
        const personnelSnapshot = await get(personnelRef);
        const tasksSnapshot = await get(tasksRef);
        const companySnapshot = await get(companyRef);
        
        const personnelData = personnelSnapshot.exists() ? personnelSnapshot.val() : {};
        const tasksData = tasksSnapshot.exists() ? tasksSnapshot.val() : {};
        const companyData = companySnapshot.exists() ? companySnapshot.val() : {};
        
        // Verileri işle
        processData(personnelData, tasksData, companyData);
        
        // Personel, görev ve şirket değişiklikleri için anlık dinleyiciler oluştur
        onValue(personnelRef, (snapshot) => {
          const personnelData = snapshot.exists() ? snapshot.val() : {};
          
          // Diğer verileri de al
          Promise.all([
            get(tasksRef),
            get(companyRef)
          ]).then(([tasksSnapshot, companySnapshot]) => {
            const tasksData = tasksSnapshot.exists() ? tasksSnapshot.val() : {};
            const companyData = companySnapshot.exists() ? companySnapshot.val() : {};
            processData(personnelData, tasksData, companyData);
          });
        });
        
        onValue(tasksRef, (snapshot) => {
          const tasksData = snapshot.exists() ? snapshot.val() : {};
          
          // Diğer verileri de al
          Promise.all([
            get(personnelRef),
            get(companyRef)
          ]).then(([personnelSnapshot, companySnapshot]) => {
            const personnelData = personnelSnapshot.exists() ? personnelSnapshot.val() : {};
            const companyData = companySnapshot.exists() ? companySnapshot.val() : {};
            processData(personnelData, tasksData, companyData);
          });
        });
        
        // Şirket verisi değiştiğinde (missedTasks eklendiğinde/güncellendiğinde)
        onValue(companyRef, (snapshot) => {
          const companyData = snapshot.exists() ? snapshot.val() : {};
          
          // Diğer verileri de al
          Promise.all([
            get(personnelRef),
            get(tasksRef)
          ]).then(([personnelSnapshot, tasksSnapshot]) => {
            const personnelData = personnelSnapshot.exists() ? personnelSnapshot.val() : {};
            const tasksData = tasksSnapshot.exists() ? tasksSnapshot.val() : {};
            processData(personnelData, tasksData, companyData);
          });
        });
      } catch (error) {
        console.error('Dashboard veri alınırken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    
    setupDashboard();
    
    // Component unmount olduğunda dinleyicileri temizle
    return () => {
      // Kullanıcının şirket ID'si varsa dinleyicileri kaldır
      if (companyId) {
        off(ref(database, `companies/${companyId}/personnel`));
        off(ref(database, `companies/${companyId}/tasks`));
        off(ref(database, `companies/${companyId}`));
      }
    };
  }, [companyId, branchId, isManager]);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Görev durumu grafiği için renkler
  const COLORS = [THEME_COLORS.completed, '#1976D2', '#2196F3', THEME_COLORS.pending, '#F44336', '#9E9E9E'];
  
  // Personel performans grafiği için renkler
  const PERFORMANCE_COLORS = {
    completed: THEME_COLORS.completed, // Tamamlanan görevler için yeşil
    pending: '#1976D2',                // Devam eden görevler için mavi
    missed: '#F44336'                  // Kaçırılan görevler için kırmızı
  };
  
  const CustomTooltip = ({ active, payload, label, performanceChart }: any) => {
    if (active && payload && payload.length) {
      if (performanceChart) {
        return (
          <Box sx={{ bgcolor: 'background.paper', p: 2, boxShadow: 3, borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="bold">{payload[0]?.payload.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
              <Box sx={{ width: 10, height: 10, bgcolor: PERFORMANCE_COLORS.completed, borderRadius: '50%' }} />
              <Typography variant="body2">Tamamlanan: {payload[0]?.value}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
              <Box sx={{ width: 10, height: 10, bgcolor: PERFORMANCE_COLORS.pending, borderRadius: '50%' }} />
              <Typography variant="body2">Devam Eden: {payload[1]?.value}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
              <Box sx={{ width: 10, height: 10, bgcolor: PERFORMANCE_COLORS.missed, borderRadius: '50%' }} />
              <Typography variant="body2">Kaçırılan: {payload[2]?.value}</Typography>
            </Box>
          </Box>
        );
      }
      
      return (
        <Box sx={{ bgcolor: 'background.paper', p: 2, boxShadow: 3, borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="bold">{payload[0].name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: payload[0].payload.color, borderRadius: '50%' }} />
            <Typography variant="body2">{payload[0].value} Görev</Typography>
          </Box>
        </Box>
      );
    }
    
    return null;
  };
  
  // Modal açma/kapama fonksiyonları
  const handleTaskStatusInfoOpen = () => {
    setTaskStatusInfoModalOpen(true);
  };

  const handleTaskStatusInfoClose = () => {
    setTaskStatusInfoModalOpen(false);
  };

  const handlePersonnelPerformanceInfoOpen = () => {
    setPersonnelPerformanceInfoModalOpen(true);
  };

  const handlePersonnelPerformanceInfoClose = () => {
    setPersonnelPerformanceInfoModalOpen(false);
  };
  
  return (
    <ScrollableContent>
      {/* Widget Yönetim Butonu */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        mb: 2,
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: 'background.paper',
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Button
          variant="contained"
          startIcon={<SettingsIcon />}
          onClick={handleOpenWidgetSelector}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            boxShadow: 2,
            '&:hover': {
              boxShadow: 4
            }
          }}
        >
          Widget'ları Yönet
        </Button>
      </Box>

      {/* İstatistik Kartları */}
      {selectedWidgets.includes('stats') && (
        <StatsCards
          stats={stats}
          isManager={isManager}
          onPersonnelClick={handleNavigateToPersonnel}
          onTasksClick={handleNavigateToTasks}
          onPendingTasksClick={handleOpenPendingTasksModal}
          onCompletedTasksClick={handleOpenAllCompletedTasksModal}
        />
      )}
      
      {/* Grafikler */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {selectedWidgets.includes('taskStatus') && (
          <Grid item xs={12} md={6} className="task-distribution-section">
            <TaskStatusChart 
              taskStatusData={taskStatusData} 
              onInfoClick={handleTaskStatusInfoOpen} 
            />
          </Grid>
        )}
        
        {selectedWidgets.includes('personnelPerformance') && (
          <Grid item xs={12} md={6} className="personnel-performance-section">
            <PersonnelPerformanceChart 
              personnelPerformanceData={personnelPerformanceData} 
              onInfoClick={handlePersonnelPerformanceInfoOpen}
            />
          </Grid>
        )}
      </Grid>
      
      {/* Anket Grafikleri */}
      {selectedWidgets.includes('surveyCharts') && (
        <Grid container spacing={1} sx={{ mb: 2 }} className="survey-charts-section">
          <Grid item xs={12}>
            <SurveyCharts />
          </Grid>
        </Grid>
      )}
      
      {/* Liste Kartları */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {selectedWidgets.includes('missedTasks') && (
          <Grid item xs={12} md={6} className="missed-tasks-section">
            <StyledCard>
              <CardHeader 
                title="Geciken Son 10 Görev" 
                titleTypographyProps={{ fontWeight: 'bold' }}
                action={
                  <Button 
                    variant="text" 
                    color="primary" 
                    onClick={handleOpenMissedTasksModal}
                    size="small"
                  >
                    Tümünü Gör
                  </Button>
                }
              />
              <Divider />
              <CardContent>
                {recentMissedTasks.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                    Henüz geciken görev bulunmuyor
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Görev Adı</TableCell>
                          <TableCell>Personel</TableCell>
                          <TableCell>Tarih</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentMissedTasks.map((task) => (
                          <TableRow key={task.id} hover>
                            <TableCell>
                              <Typography variant="body2" noWrap>
                                {task.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {task.personnelName && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <PersonIcon fontSize="small" color="primary" />
                                  <Typography variant="body2" noWrap>
                                    {task.personnelName}
                                  </Typography>
                                </Box>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap>
                                {`${task.time} - ${task.date}`}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </StyledCard>
          </Grid>
        )}
        
        {selectedWidgets.includes('completedTasks') && (
          <Grid item xs={12} md={6} className="completed-tasks-section">
            <StyledCard>
              <CardHeader 
                title="Tamamlanan Son 10 Görev" 
                titleTypographyProps={{ fontWeight: 'bold' }}
                action={
                  <Button 
                    variant="text" 
                    color="primary" 
                    onClick={handleOpenCompletedTasksModal}
                    size="small"
                  >
                    Tümünü Gör
                  </Button>
                }
              />
              <Divider />
              <CardContent>
                {recentCompletedTasks.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                    Henüz tamamlanan görev bulunmuyor
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Görev Adı</TableCell>
                          <TableCell>Personel</TableCell>
                          <TableCell>Tarih</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentCompletedTasks.map((task) => (
                          <TableRow key={task.id} hover>
                            <TableCell>
                              <Typography variant="body2" noWrap>
                                {task.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {task.personnelName && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <PersonIcon fontSize="small" color="success" />
                                  <Typography variant="body2" noWrap>
                                    {task.personnelName}
                                  </Typography>
                                </Box>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap>
                                {`${task.time} - ${task.date}`}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </StyledCard>
          </Grid>
        )}
      </Grid>
      
      {/* En Çok Görev Geciktiren ve Yapan Personeller */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {selectedWidgets.includes('worstPerformers') && (
          <Grid item xs={12} md={6} className="worst-performers-section">
            <StyledCard>
              <CardHeader 
                title="En Çok Görev Geciktiren Personeller" 
                titleTypographyProps={{ fontWeight: 'bold' }}
              />
              <Divider />
              <CardContent>
                {worstPerformers.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                    Henüz gecikmiş görev kaydı bulunmuyor
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Personel</TableCell>
                          <TableCell>Geciken Görev Sayısı</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {worstPerformers.slice(0, 10).map((person, index) => (
                          <TableRow key={person.id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Avatar sx={{ width: 24, height: 24, bgcolor: index < 3 ? '#F44336' : theme.palette.grey[500] }}>
                                  <PersonIcon fontSize="small" />
                                </Avatar>
                                <Typography variant="body2" noWrap>
                                  {person.name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium" color={index < 3 ? 'error' : 'inherit'}>
                                {person.missedCount} görev
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </StyledCard>
          </Grid>
        )}
        
        {selectedWidgets.includes('bestPerformers') && (
          <Grid item xs={12} md={6} className="best-performers-section">
            <StyledCard>
              <CardHeader 
                title="En Çok Görev Yapan Personeller" 
                titleTypographyProps={{ fontWeight: 'bold' }}
              />
              <Divider />
              <CardContent>
                {personnelPerformanceData.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                    Henüz tamamlanan görev kaydı bulunmuyor
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Personel</TableCell>
                          <TableCell>Yapılan Görev Sayısı</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {personnelPerformanceData
                          .sort((a, b) => b.completed - a.completed)
                          .slice(0, 10)
                          .map((person, index) => (
                            <TableRow key={person.name} hover>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Avatar sx={{ width: 24, height: 24, bgcolor: index < 3 ? THEME_COLORS.completed : theme.palette.grey[500] }}>
                                    <PersonIcon fontSize="small" />
                                  </Avatar>
                                  <Typography variant="body2" noWrap>
                                    {person.name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium" color={index < 3 ? 'success.main' : 'inherit'}>
                                  {person.completed} görev
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </StyledCard>
          </Grid>
        )}
      </Grid>
      
      {/* Harita */}
      {selectedWidgets.includes('taskLocations') && (
        <MapCard sx={{ mb: 2 }} className="task-locations-section">
          <CardHeader 
            title="Görev Tamamlama Konumları" 
            titleTypographyProps={{ fontWeight: 'bold' }}
            avatar={<Avatar sx={{ bgcolor: THEME_COLORS.completed }}><LocationIcon /></Avatar>}
          />
          <Divider />
          
          <FilterContainer>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Son Görevler</InputLabel>
              <Select
                value={selectedTaskCount}
                label="Son Görevler"
                onChange={handleTaskCountChange}
              >
                <MenuItem value={10}>Son 10 Görev</MenuItem>
                <MenuItem value={20}>Son 20 Görev</MenuItem>
                <MenuItem value={30}>Son 30 Görev</MenuItem>
                <MenuItem value={50}>Son 50 Görev</MenuItem>
                <MenuItem value={100}>Son 100 Görev</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 200, maxWidth: 300 }}>
              <InputLabel>Personel Filtrele</InputLabel>
              <Select
                multiple
                value={selectedPersonnel}
                label="Personel Filtrele"
                onChange={handlePersonnelChange}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => {
                      const person = personnel.find(p => p.id === value);
                      return (
                        <Chip 
                          key={value} 
                          label={person ? person.name : value} 
                          size="small" 
                        />
                      );
                    })}
                  </Box>
                )}
                onClose={() => setPersonnelSearchTerm('')}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 250,
                      overflow: 'auto'
                    }
                  }
                }}
              >
                <ListItem>
                  <TextField
                    size="small"
                    autoFocus
                    placeholder="Personel Ara..."
                    fullWidth
                    value={personnelSearchTerm}
                    onChange={(e) => setPersonnelSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </ListItem>
                {personnel
                  .filter(person => 
                    personnelSearchTerm === '' || 
                    person.name.toLowerCase().includes(personnelSearchTerm.toLowerCase())
                  )
                  .map((person) => (
                    <MenuItem key={person.id} value={person.id}>
                      <Checkbox checked={selectedPersonnel.indexOf(person.id) > -1} />
                      <ListItemText primary={person.name} />
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 200, maxWidth: 300 }}>
              <InputLabel>Görev Filtrele</InputLabel>
              <Select
                multiple
                value={selectedTasks}
                label="Görev Filtrele"
                onChange={handleTaskChange}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => {
                      const task = tasks.find(t => t.id === value);
                      return (
                        <Chip 
                          key={value} 
                          label={task ? task.name : value} 
                          size="small" 
                        />
                      );
                    })}
                  </Box>
                )}
                onClose={() => setTaskSearchTerm('')}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 250,
                      overflow: 'auto'
                    }
                  }
                }}
              >
                <ListItem>
                  <TextField
                    size="small"
                    autoFocus
                    placeholder="Görev Ara..."
                    fullWidth
                    value={taskSearchTerm}
                    onChange={(e) => setTaskSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </ListItem>
                {tasks
                  .filter(task => 
                    taskSearchTerm === '' || 
                    task.name.toLowerCase().includes(taskSearchTerm.toLowerCase())
                  )
                  .map((task) => (
                    <MenuItem key={task.id} value={task.id}>
                      <Checkbox checked={selectedTasks.indexOf(task.id) > -1} />
                      <ListItemText primary={task.name} />
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={handleClearFilters}
              sx={{ height: 40 }}
            >
              Filtreleri Temizle
            </Button>
            
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Toplam: {filteredLocations.length} konum gösteriliyor
              </Typography>
            </Box>
          </FilterContainer>
          
          <MapContainerWrapper>
            {filteredLocations.length === 0 ? (
              <Box sx={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Typography color="textSecondary">
                  Konum bilgisi olan görev bulunmuyor veya seçilen filtrelere uygun görev yok
                </Typography>
              </Box>
            ) : (
              <MapContainer 
                style={{ height: '100%', width: '100%' }}
                zoom={13} 
                scrollWheelZoom={true}
              >
                <MapView 
                  center={
                    filteredLocations.length > 0 
                      ? [filteredLocations[0].location.latitude, filteredLocations[0].location.longitude] as [number, number]
                      : [39.9334, 32.8597] as [number, number]
                  } 
                  zoom={13} 
                />
                
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {filteredLocations.map((task, index) => {
                  const icon = createColoredMarkerIcon(getPersonnelColor(index));
                  return (
                    <Marker 
                      key={task.id} 
                      position={[task.location.latitude, task.location.longitude] as [number, number]} 
                      icon={icon}
                    >
                      <Tooltip permanent={false} direction="top">
                        <strong>{task.name}</strong><br />
                        {task.personnelName}
                      </Tooltip>
                      <Popup>
                        <Box sx={{ minWidth: 200 }}>
                          <Typography variant="subtitle1" fontWeight="bold">{task.name}</Typography>
                          <Typography variant="body2">{task.description}</Typography>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2">
                            <strong>Personel:</strong> {task.personnelName}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Tarih:</strong> {task.date}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Saat:</strong> {task.time}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Konum:</strong> {task.location.latitude.toFixed(5)}, {task.location.longitude.toFixed(5)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Doğruluk:</strong> {task.location.accuracy ? `±${task.location.accuracy.toFixed(1)}m` : 'Belirtilmemiş'}
                          </Typography>
                        </Box>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            )}
          </MapContainerWrapper>
        </MapCard>
      )}
      
      {/* Widget Seçim Modalı */}
      <WidgetSelectorModal
        open={widgetSelectorOpen}
        onClose={handleCloseWidgetSelector}
        selectedWidgets={selectedWidgets}
        onWidgetSelectionChange={handleWidgetSelectionChange}
        widgets={widgets}
      />
      
      {/* Modal Pencereler */}
      <MissedTasksModal 
        open={missedTasksModalOpen} 
        onClose={handleCloseMissedTasksModal} 
        tasks={allMissedTasks} 
      />
      
      <CompletedTasksModal 
        open={completedTasksModalOpen} 
        onClose={handleCloseCompletedTasksModal} 
        tasks={allCompletedTasks} 
      />
      
      {/* Yeni modallar */}
      <PendingTasksModal 
        open={pendingTasksModalOpen} 
        onClose={handleClosePendingTasksModal} 
        tasks={allPendingTasks} 
      />
      
      <AllCompletedTasksModal 
        open={allCompletedTasksModalOpen} 
        onClose={handleCloseAllCompletedTasksModal} 
        tasks={[
          // Ana görev listesindeki tamamlanmış görevler
          ...tasks.filter(task => task.status === 'completed').map(task => {
            // Personel bilgisini bul
            const personel = personnel.find(p => p.id === task.personnelId);
            return {
              id: task.id,
              name: task.name,
              description: task.description || '',
              // Tamamlanma zamanı varsa kullan, yoksa oluşturulma zamanını kullan
              completedAt: task.completedAt || task.createdAt,
              personnelId: task.personnelId,
              personnelName: personel ? personel.name : 'Atanmamış'
            };
          }),
          // Veritabanından çekilen completedTasks koleksiyonundaki görevler
          ...allCompletedTasks
        ].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))} // En son tamamlananlar en üstte
      />
      
      {/* Bilgi modalları */}
      <Dialog open={taskStatusInfoModalOpen} onClose={handleTaskStatusInfoClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <InfoIcon sx={{ mr: 1, color: 'primary.main' }} />
            Görev Durumu Dağılımı Hakkında
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Bu grafik şirketteki tüm görevlerin durum dağılımını göstermektedir. Her dilim bir görev durumunu temsil eder:
          </Typography>
          <List>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: THEME_COLORS.completed }}>
                  <CompletedIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary="Tamamlanan" 
                secondary="Ana görev listesindeki tamamlanan görevler ile veritabanındaki tamamlanan görevlerin toplamı"
              />
            </ListItem>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: '#1976D2' }}>
                  <TaskIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary="Devam Eden" 
                secondary="Personel tarafından kabul edilmiş veya atanmış durumda olan görevler"
              />
            </ListItem>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: '#2196F3' }}>
                  <TaskIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary="Bekleyen" 
                secondary="Henüz personele atanmamış, bekleyen görevler"
              />
            </ListItem>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: THEME_COLORS.pending }}>
                  <PendingIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary="Bekliyor" 
                secondary="Bekleyen durumundaki görevler"
              />
            </ListItem>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: '#F44336' }}>
                  <TaskIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary="Tamamlanmamış" 
                secondary="Zamanında tamamlanamamış ve gecikmiş görevler"
              />
            </ListItem>
          </List>
          <Typography paragraph>
            Grafiğin altında her bir durumun toplam görevlere oranı yüzde olarak gösterilmektedir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTaskStatusInfoClose}>Kapat</Button>
        </DialogActions>
      </Dialog>
      
      <Dialog open={personnelPerformanceInfoModalOpen} onClose={handlePersonnelPerformanceInfoClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <InfoIcon sx={{ mr: 1, color: 'primary.main' }} />
            Personel Performansı Hakkında
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Bu grafik, en aktif 5 personelinizin görev performansını göstermektedir. Her çubuk bir personelin görev dağılımını temsil eder:
          </Typography>
          <List>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: THEME_COLORS.completed }}>
                  <CompletedIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary="Tamamlanan" 
                secondary="Personelin başarıyla tamamladığı görevlerin toplam sayısı"
              />
            </ListItem>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: '#1976D2' }}>
                  <TaskIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary="Devam Eden" 
                secondary="Personelin şu anda devam ettiği görevlerin sayısı"
              />
            </ListItem>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: '#F44336' }}>
                  <TaskIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary="Kaçırılan" 
                secondary="Personelin zamanında tamamlayamadığı görevlerin sayısı"
              />
            </ListItem>
          </List>
          <Typography paragraph>
            Bu grafik, hangi personelin daha fazla görev üstlendiğini ve bu görevleri ne kadar başarılı bir şekilde tamamladığını göstermektedir. Toplam görev sayısına göre en çok göreve sahip 5 personel listelenmektedir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePersonnelPerformanceInfoClose}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </ScrollableContent>
  );
};

// Personel renklerini belirle
const getPersonnelColor = (index: number) => {
  const colors = [
    '#FF6B6B', // Kırmızı
    '#4ECDC4', // Turkuaz
    '#45B7D1', // Mavi
    '#96CEB4', // Yeşil
    '#FFEEAD', // Sarı
    '#D4A5A5', // Pembe
    '#9B59B6', // Mor
    '#E67E22', // Turuncu
    '#1ABC9C', // Deniz Yeşili
    '#3498DB'  // Açık Mavi
  ];
  return colors[index % colors.length];
};

// Görev durumuna göre renk döndürür
function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return THEME_COLORS.completed; // Yeşil
    case 'accepted':
    case 'assigned':
      return '#1976D2'; // Mavi
    case 'waiting':
      return '#2196F3'; // Açık Mavi
    case 'pending':
      return THEME_COLORS.pending; // Turuncu
    case 'missed':
      return '#F44336'; // Kırmızı
    default:
      return '#9E9E9E'; // Gri
  }
}

export default Dashboard; 