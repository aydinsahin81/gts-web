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
  useTheme
} from '@mui/material';
import {
  PeopleOutline as PeopleIcon,
  AssignmentOutlined as TaskIcon,
  CheckCircleOutline as CompletedIcon,
  PendingOutlined as PendingIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { ref, get, onValue, off } from 'firebase/database';
import { database, auth } from '../../firebase';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList
} from 'recharts';
import MissedTasksModal from './MissedTasksModal';
import CompletedTasksModal from './CompletedTasksModal';
import PendingTasksModal from './PendingTasksModal';
import AllCompletedTasksModal from './AllCompletedTasksModal';
import { useNavigate } from 'react-router-dom';

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
  borderRadius: 12,
  overflow: 'hidden',
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
  width: 60,
  height: 60,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: bgcolor,
  marginRight: theme.spacing(2),
  '& .MuiSvgIcon-root': {
    color: 'white',
    fontSize: 30,
  },
}));

const StatsText = styled(Box)({
  flexGrow: 1,
});

const ChartContainer = styled(Card)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  borderRadius: 12,
}));

const Dashboard: React.FC = () => {
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
    const personnelList = personnelData ? Object.entries(personnelData).map(([id, data]: [string, any]) => ({
      id,
      ...data,
    })) : [];
    
    setPersonnel(personnelList);
    
    // Görev listesi - ana görevleri al (toplam görev sayısı için)
    const tasksList = tasksData ? Object.entries(tasksData)
      .filter(([key]) => key !== 'missedTasks') // missedTasks anahtarını filtrele
      .map(([id, data]: [string, any]) => ({
        id,
        ...data,
      })) : [];
    
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
            missedTasksCount++;
            
            // İlgili görevi tasks listesinden bul (atanan personeli almak için)
            const task = tasksList.find(t => t.id === taskId);
            
            // Personel bilgisini bul
            let personnelName = "Atanmamış";
            let personnelId = null;
            if (task && task.personnelId) {
              personnelId = task.personnelId;
              const person = personnelList.find(p => p.id === task.personnelId);
              if (person) {
                personnelName = person.name;
                
                // Personelin gecikme sayısını artır
                if (personnelMissedCounts[person.id]) {
                  personnelMissedCounts[person.id].missedCount += 1;
                }
              }
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
          });
        });
      });
      
      console.log("Toplam missed görev sayısı:", missedTasksCount);
    }
    
    // Tamamlanan görevleri al
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
            // Öncelikle startedBy veya completedBy bilgisini kullan
            if (taskData.completedBy) {
              const person = personnelList.find(p => p.id === taskData.completedBy);
              if (person) {
                personnelName = person.name;
              }
            } else if (taskData.startedBy) {
              const person = personnelList.find(p => p.id === taskData.startedBy);
              if (person) {
                personnelName = person.name;
              }
            } else if (task && task.personnelId) {
              const person = personnelList.find(p => p.id === task.personnelId);
              if (person) {
                personnelName = person.name;
              }
            }
            
            // Tamamlanan görevleri listeye ekle
            completedTasksList.push({
              id: `${taskId}-${date}-${time}`,
              name: taskData.taskName,
              description: taskData.taskDescription || '',
              date: date,
              time: time,
              completedAt: taskData.completedAt,
              personnelId: taskData.completedBy || task?.personnelId || null,
              personnelName: personnelName
            });
          });
        });
      });
    }
    
    // En kötü performans gösteren personelleri hesapla (en çok görev geciktiren)
    const worstPerformers = Object.values(personnelMissedCounts)
      .filter(person => person.missedCount > 0) // Sadece görevi geciktirmiş personelleri al
      .sort((a, b) => b.missedCount - a.missedCount) // Gecikme sayısına göre sırala (çoktan aza)
      .slice(0, 10); // En kötü 10 personeli al
    
    setWorstPerformers(worstPerformers);
    
    setStats({
      totalPersonnel: personnelList.length,
      totalTasks, // Sadece tasks altındaki görevleri göster, missedTasks'ı dahil etme
      completedTasks: completedTasksCount,
      pendingTasks: activeTasksCount,
    });
    
    // Görev durumu verilerini hazırla
    setTaskStatusData([
      { name: 'Tamamlanan', value: completedTasksCount, color: THEME_COLORS.completed },
      { name: 'Devam Eden', value: activeTasksCount, color: '#1976D2' }, // Mavi
      { name: 'Bekleyen', value: waitingTasksCount, color: '#2196F3' }, // Açık Mavi
      { name: 'Pending', value: pendingTasksCount, color: THEME_COLORS.pending }, // Turuncu
      { name: 'Tamamlanmamış', value: missedTasksCount, color: '#F44336' }, // Kırmızı
    ].filter(item => item.value > 0));
    
    // Personel performans verilerini hazırla
    // Personellerin tamamladığı görev sayılarını hesapla
    const personnelPerformance: { [key: string]: { completed: number, pending: number, name: string } } = {};
    
    personnelList.forEach(person => {
      personnelPerformance[person.id] = {
        name: person.name,
        completed: 0,
        pending: 0
      };
    });
    
    tasksList.forEach(task => {
      if (task.personnelId && personnelPerformance[task.personnelId]) {
        if (task.status === 'completed') {
          personnelPerformance[task.personnelId].completed += 1;
        } else if (task.status === 'accepted' || task.status === 'assigned') {
          personnelPerformance[task.personnelId].pending += 1;
        }
      }
    });
    
    // Performans verilerini grafiğe uygun hale getir
    const performanceData = Object.values(personnelPerformance)
      .filter(p => p.completed > 0 || p.pending > 0) // Sadece görevi olan personelleri göster
      .sort((a, b) => (b.completed + b.pending) - (a.completed + a.pending)) // Toplam görev sayısına göre sırala
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
  }, [companyId]);
  
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
    completed: THEME_COLORS.completed,
    pending: '#1976D2' // Devam eden görevler için mavi
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
  
  return (
    <ScrollableContent>
      {/* İstatistik Kartları - Dashboard başlığı silinmiş ve üste hizalanmış */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard 
            bgcolor={THEME_COLORS.personnel} 
            onClick={handleNavigateToPersonnel}
          >
            <IconBox bgcolor={THEME_COLORS.personnel}>
              <PeopleIcon />
            </IconBox>
            <StatsText>
              <Typography variant="h4" fontWeight="bold">
                {stats.totalPersonnel}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Toplam Personel
              </Typography>
            </StatsText>
          </StatsCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard 
            bgcolor={THEME_COLORS.tasks} 
            onClick={handleNavigateToTasks}
          >
            <IconBox bgcolor={THEME_COLORS.tasks}>
              <TaskIcon />
            </IconBox>
            <StatsText>
              <Typography variant="h4" fontWeight="bold">
                {stats.totalTasks}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Toplam Görev
              </Typography>
            </StatsText>
          </StatsCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard 
            bgcolor={THEME_COLORS.pending} 
            onClick={handleOpenPendingTasksModal}
          >
            <IconBox bgcolor={THEME_COLORS.pending}>
              <PendingIcon />
            </IconBox>
            <StatsText>
              <Typography variant="h4" fontWeight="bold">
                {stats.pendingTasks}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Devam Eden Görev
              </Typography>
            </StatsText>
          </StatsCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard 
            bgcolor={THEME_COLORS.completed}
            onClick={handleOpenAllCompletedTasksModal}
          >
            <IconBox bgcolor={THEME_COLORS.completed}>
              <CompletedIcon />
            </IconBox>
            <StatsText>
              <Typography variant="h4" fontWeight="bold">
                {stats.completedTasks}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Tamamlanan Görev
              </Typography>
            </StatsText>
          </StatsCard>
        </Grid>
      </Grid>
      
      {/* Grafikler */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Görev Durumu Dağılım Grafiği */}
        <Grid item xs={12} md={6}>
          <ChartContainer>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Görev Durumu Dağılımı
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {taskStatusData.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Typography color="textSecondary">Henüz görev bulunmuyor</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </Grid>
        
        {/* Personel Performans Grafiği */}
        <Grid item xs={12} md={6}>
          <ChartContainer>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Personel Performansı
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {personnelPerformanceData.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Typography color="textSecondary">Henüz personel performans verisi bulunmuyor</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={personnelPerformanceData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip performanceChart={true} />} />
                  <Legend verticalAlign="bottom" height={36} />
                  <Bar 
                    dataKey="completed" 
                    stackId="a" 
                    fill={PERFORMANCE_COLORS.completed} 
                    name="Tamamlanan" 
                    barSize={20}
                  >
                    <LabelList dataKey="completed" position="right" style={{ fill: theme.palette.text.primary }} />
                  </Bar>
                  <Bar 
                    dataKey="pending" 
                    stackId="a" 
                    fill={PERFORMANCE_COLORS.pending} 
                    name="Devam Eden"
                    barSize={20}
                  >
                    <LabelList dataKey="pending" position="right" style={{ fill: theme.palette.text.primary }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </Grid>
      </Grid>
      
      {/* Geciken ve Tamamlanan Son Görevler */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Geciken Son 10 Görev */}
        <Grid item xs={12} md={6}>
          <StyledCard>
            <CardHeader 
              title="Geciken Son 10 Görev" 
              titleTypographyProps={{ fontWeight: 'bold' }}
              action={
                <Button 
                  variant="text" 
                  color="primary" 
                  onClick={handleOpenMissedTasksModal}
                >
                  Tümünü Gör
                </Button>
              }
            />
            <Divider />
            <CardContent sx={{ flexGrow: 1, overflow: 'auto', maxHeight: 320 }}>
              <List>
                {recentMissedTasks.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 4 }}>
                    Henüz geciken görev bulunmuyor
                  </Typography>
                ) : (
                  recentMissedTasks.map((task) => (
                    <ListItem key={task.id} divider>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#F44336' }}>
                          <TaskIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            {task.name}
                            {task.personnelName && (
                              <Typography variant="caption" 
                                sx={{ 
                                  bgcolor: theme.palette.grey[100], 
                                  px: 1, 
                                  py: 0.5, 
                                  borderRadius: 1,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.5
                                }}
                              >
                                <PersonIcon fontSize="inherit" color="primary" />
                                {task.personnelName}
                              </Typography>
                            )}
                          </Box>
                        }
                        secondary={`${task.time} - ${task.date}`}
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </StyledCard>
        </Grid>
        
        {/* Tamamlanan Son 10 Görev */}
        <Grid item xs={12} md={6}>
          <StyledCard>
            <CardHeader 
              title="Tamamlanan Son 10 Görev" 
              titleTypographyProps={{ fontWeight: 'bold' }}
              action={
                <Button 
                  variant="text" 
                  color="primary" 
                  onClick={handleOpenCompletedTasksModal}
                >
                  Tümünü Gör
                </Button>
              }
            />
            <Divider />
            <CardContent sx={{ flexGrow: 1, overflow: 'auto', maxHeight: 320 }}>
              <List>
                {recentCompletedTasks.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 4 }}>
                    Henüz tamamlanan görev bulunmuyor
                  </Typography>
                ) : (
                  recentCompletedTasks.map((task) => (
                    <ListItem key={task.id} divider>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: THEME_COLORS.completed }}>
                          <TaskIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            {task.name}
                            {task.personnelName && (
                              <Typography variant="caption" 
                                sx={{ 
                                  bgcolor: theme.palette.grey[100], 
                                  px: 1, 
                                  py: 0.5, 
                                  borderRadius: 1,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.5
                                }}
                              >
                                <PersonIcon fontSize="inherit" color="success" />
                                {task.personnelName}
                              </Typography>
                            )}
                          </Box>
                        }
                        secondary={`${task.time} - ${task.date}`}
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>
      
      {/* En Kötü Performanslı Personeller */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <StyledCard>
            <CardHeader 
              title="En Çok Görev Geciktiren Personeller" 
              titleTypographyProps={{ fontWeight: 'bold' }}
            />
            <Divider />
            <CardContent sx={{ flexGrow: 1, overflow: 'auto', maxHeight: 320 }}>
              {worstPerformers.length === 0 ? (
                <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 4 }}>
                  Henüz gecikmiş görev kaydı bulunmuyor
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {worstPerformers.map((person, index) => (
                    <Grid item xs={12} md={6} lg={4} key={person.id}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          display: 'flex', 
                          alignItems: 'center', 
                          border: '1px solid',
                          borderColor: theme.palette.divider,
                          borderRadius: 2,
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 5,
                            height: '100%',
                            bgcolor: '#F44336',
                          }
                        }}
                      >
                        <Box sx={{ mr: 2, position: 'relative' }}>
                          <Avatar sx={{ bgcolor: index < 3 ? '#F44336' : theme.palette.grey[500] }}>
                            <PersonIcon />
                          </Avatar>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              position: 'absolute', 
                              top: -10, 
                              right: -10, 
                              bgcolor: index < 3 ? '#F44336' : theme.palette.grey[500], 
                              color: 'white', 
                              width: 20, 
                              height: 20, 
                              borderRadius: '50%', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: 11
                            }}
                          >
                            {index + 1}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="medium" noWrap>
                            {person.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {person.missedCount} gecikmiş görev
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>
      
      {/* Alt Kartlar */}
      <Grid container spacing={3}>
        {/* Personel Listesi */}
        <Grid item xs={12} md={6}>
          <StyledCard>
            <CardHeader 
              title="Son Eklenen Personeller" 
              titleTypographyProps={{ fontWeight: 'bold' }}
            />
            <Divider />
            <CardContent sx={{ flexGrow: 1, overflow: 'auto', maxHeight: 320 }}>
              <List>
                {personnel.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 4 }}>
                    Henüz personel eklenmemiş
                  </Typography>
                ) : (
                  personnel.slice(0, 2).map((person) => (
                    <ListItem key={person.id} divider>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: THEME_COLORS.personnel }}>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={person.name} 
                        secondary={person.hasTask ? 'Görev Atanmış' : 'Müsait'} 
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </StyledCard>
        </Grid>
        
        {/* Son Görevler */}
        <Grid item xs={12} md={6}>
          <StyledCard>
            <CardHeader 
              title="Son Eklenen Görevler" 
              titleTypographyProps={{ fontWeight: 'bold' }}
            />
            <Divider />
            <CardContent sx={{ flexGrow: 1, overflow: 'auto', maxHeight: 320 }}>
              <List>
                {recentTasks.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 4 }}>
                    Henüz görev eklenmemiş
                  </Typography>
                ) : (
                  recentTasks.map((task) => (
                    <ListItem key={task.id} divider>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: getStatusColor(task.status) }}>
                          <TaskIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={task.name} 
                        secondary={task.description || 'Açıklama yok'} 
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>
      
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
        tasks={tasks.filter(task => task.status === 'completed')} 
      />
    </ScrollableContent>
  );
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