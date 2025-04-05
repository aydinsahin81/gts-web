import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  IconButton,
  SelectChangeEvent,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Card,
  CardContent
} from '@mui/material';
import { 
  Search as SearchIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Troubleshoot as TroubleshootIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Upcoming as UpcomingIcon,
  Person as PersonIcon,
  TaskAlt as TaskIcon
} from '@mui/icons-material';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../../firebase';
import { useAuth } from '../../../contexts/AuthContext';
// Servisleri import ediyoruz
import TimeService from '../../../services/TimeService';
import TaskTimeService, { TaskTimeStatus } from '../../../services/TaskTimeService';
import MissedTaskService from '../../../services/MissedTaskService';

// Görevler tabının ana bileşeni
const ManagerTasksTab: React.FC = () => {
  const { currentUser, userDetails } = useAuth();
  
  // State tanımlamaları
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  // Görev zamanı durumları için state'leri ekliyoruz
  const [taskTimeStatuses, setTaskTimeStatuses] = useState<Record<string, any>>({});
  const [isCheckingTasks, setIsCheckingTasks] = useState(false);
  
  // Görevleri yükleme
  useEffect(() => {
    const loadTasks = async () => {
      if (!currentUser || !userDetails || !userDetails.companyId || !userDetails.branchesId) {
        console.log("Eksik veri:", { 
          currentUser: !!currentUser, 
          userDetails: !!userDetails, 
          companyId: userDetails?.companyId, 
          branchesId: userDetails?.branchesId 
        });
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log("Görevler yüklenmeye başlıyor. Şube ID:", userDetails.branchesId);
        
        // Şube ID'sini string olarak saklayalım ve undefined kontrolü yapalım
        const branchId = userDetails.branchesId || '';
        
        // Önce tüm görevleri çekelim ve manuel filtreleyelim
        const tasksRef = ref(database, `companies/${userDetails.companyId}/tasks`);
        const snapshot = await get(tasksRef);
        
        if (snapshot.exists()) {
          const tasksData = snapshot.val();
          console.log("Tüm görevler yüklendi, toplam:", Object.keys(tasksData).length);
          
          // Görevleri diziye dönüştür
          const tasksArray = Object.entries(tasksData).map(([id, data]: [string, any]) => {
            // Verileri kontrol et
            console.log("Görev verisi:", id, data.branchesId);
            
            return {
              id,
              ...data
            };
          });
          
          // branchesId'ye göre manuel filtreleme yapalım, farklı format olasılıklarını kontrol edelim
          const filteredArray = tasksArray.filter(task => {
            if (!branchId) return false;
            
            // branchesId bir dizi veya nesne olabilir
            if (typeof task.branchesId === 'object' && task.branchesId !== null) {
              // Nesne ise, anahtarlar arasında kontrolü yapalım
              if (Object.keys(task.branchesId).includes(branchId)) {
                console.log("Nesne içinde şube ID'si bulundu:", task.id);
                return true;
              }
              
              // Eğer doğrudan içerisinde şube ID'si varsa
              return Object.values(task.branchesId).includes(branchId);
            }
            
            // String ise doğrudan eşleşme kontrolü
            const matches = task.branchesId === branchId;
            if (matches) {
              console.log("String olarak eşleşen şube ID'si bulundu:", task.id);
            }
            return matches;
          });
          
          console.log("Filtreleme sonrası kalan görev sayısı:", filteredArray.length);
          
          // Tarihe göre sırala (yeniden eskiye)
          const sortedTasks = filteredArray.sort((a, b) => b.createdAt - a.createdAt);
          
          // Personel isimlerini getir
          const tasksWithPersonnel = await Promise.all(
            sortedTasks.map(async (task) => {
              if (task.personnelId) {
                const personnelName = await getPersonnelName(task.personnelId);
                return {
                  ...task,
                  personnelName
                };
              }
              return task;
            })
          );
          
          setTasks(tasksWithPersonnel);
          setFilteredTasks(tasksWithPersonnel);
        } else {
          console.log("Hiç görev bulunamadı");
          setTasks([]);
          setFilteredTasks([]);
        }
      } catch (error) {
        console.error('Görevler yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadTasks();
  }, [currentUser, userDetails]);
  
  // Görev zamanlarını kontrol etme
  useEffect(() => {
    const checkTaskTimes = async () => {
      setIsCheckingTasks(true);
      
      // Tekrarlanan görevleri filtreliyoruz
      const recurringTasks = tasks.filter(task => task.isRecurring);
      
      // Her bir görev zamanını kontrol ediyoruz
      const statuses: Record<string, any> = {};
      for (const task of recurringTasks) {
        if (task.repetitionTimes && task.repetitionTimes.length > 0) {
          statuses[task.id] = {};
          
          try {
            // TaskTimeService singleton instance'ını kullanarak görev zamanlarını kontrol ediyoruz
            const result = await TaskTimeService.checkRecurringTaskTime(
              task.repetitionTimes,
              task.startTolerance || 15,
              task.status
            );
            
            // Her zaman için aynı durumu kaydediyoruz
            task.repetitionTimes.forEach((time: string) => {
              statuses[task.id][time] = result.status;
            });
          } catch (error) {
            console.error(`Görev ${task.id} için zaman kontrolü hatası:`, error);
            task.repetitionTimes.forEach((time: string) => {
              statuses[task.id][time] = TaskTimeStatus.notYetDue; // Varsayılan durum
            });
          }
        }
      }
      
      setTaskTimeStatuses(statuses);
      setIsCheckingTasks(false);
    };
    
    if (tasks.length > 0) {
      checkTaskTimes();
    }
  }, [tasks]);
  
  // Görevleri filtrele
  useEffect(() => {
    if (tasks.length === 0) {
      setFilteredTasks([]);
      return;
    }
    
    let filtered = [...tasks];
    
    // Duruma göre filtrele
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    
    // Arama metnine göre filtrele
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(searchLower) || 
        (task.description && task.description.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredTasks(filtered);
  }, [tasks, statusFilter, searchText]);
  
  // Durum değişimi
  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
  };
  
  // Görünüm modu değişimi
  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: 'list' | 'card' | null
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };
  
  // Durum rengi
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
      case 'in_progress':
        return '#2196F3'; // Mavi
      case 'failed':
        return '#F44336'; // Kırmızı
      case 'upcoming':
        return '#9C27B0'; // Mor
      default:
        return '#9E9E9E'; // Gri
    }
  };
  
  // Durum ikonu
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon />;
      case 'accepted':
      case 'assigned':
        return <TaskIcon />;
      case 'started':
      case 'in_progress':
        return <AccessTimeIcon />;
      case 'waiting':
      case 'pending':
        return <HourglassEmptyIcon />;
      case 'missed':
      case 'failed':
        return <CancelIcon />;
      case 'upcoming':
        return <UpcomingIcon />;
      default:
        return <TroubleshootIcon />;
    }
  };
  
  // Durum etiketi
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
      case 'in_progress':
        return 'Devam Ediyor';
      case 'failed':
        return 'Başarısız';
      case 'upcoming':
        return 'Yaklaşan';
      default:
        return 'Bilinmiyor';
    }
  };
  
  // Görev saati için renk kodu döndüren fonksiyon
  const getTaskTimeColor = (task: any, timeString: string): string => {
    if (isCheckingTasks || !taskTimeStatuses[task.id] || !taskTimeStatuses[task.id][timeString]) {
      return '#9E9E9E'; // Yükleniyor veya durum yok ise gri renk
    }
    
    const status = taskTimeStatuses[task.id][timeString];
    
    switch (status) {
      case TaskTimeStatus.completed:
        return '#4CAF50'; // Tamamlanmış ise yeşil
      case TaskTimeStatus.missed:
        return '#F44336'; // Kaçırılmış ise kırmızı
      case TaskTimeStatus.active:
      case TaskTimeStatus.approaching:
        return '#2196F3'; // Aktif veya yaklaşan ise mavi
      case TaskTimeStatus.notYetDue:
        return '#9E9E9E'; // Henüz zamanı gelmemiş ise gri
      case TaskTimeStatus.started:
        return '#795548'; // Başlatılmış ise kahverengi
      default:
        return '#9E9E9E'; // Bilinmiyor ise gri
    }
  };
  
  // Personel ismini getir
  const getPersonnelName = async (personnelId: string): Promise<string> => {
    if (!userDetails?.companyId) return 'Bilinmeyen Personel';
    
    try {
      const personnelRef = ref(database, `companies/${userDetails.companyId}/personnel/${personnelId}`);
      const snapshot = await get(personnelRef);
      
      if (snapshot.exists()) {
        const personnelData = snapshot.val();
        return personnelData.name || 'İsimsiz Personel';
      }
    } catch (error) {
      console.error('Personel verisi alınırken hata:', error);
    }
    
    return 'Bilinmeyen Personel';
  };
  
  // Tablo gösterimine dönderen yardımcı fonksiyon
  const renderTasksTable = () => {
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
              <TableCell width="25%">Görev Saatleri</TableCell>
              <TableCell width="15%">Tarih</TableCell>
              <TableCell width="10%">Tolerans</TableCell>
              <TableCell width="10%">Personel</TableCell>
              <TableCell width="10%">Durum</TableCell>
              <TableCell width="10%" align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTasks.map((task) => (
              <TableRow 
                key={task.id} 
                hover 
                sx={{
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
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
                        <Chip
                          key={index}
                          label={time}
                          size="small"
                          sx={{ 
                            height: 20, 
                            fontSize: '0.7rem',
                            bgcolor: `${getTaskTimeColor(task, time)}20`, 
                            color: getTaskTimeColor(task, time)
                          }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {task.status === 'completed' ? (
                    <Typography variant="body2" color="text.secondary">
                      {task.completedAt ? new Date(task.completedAt).toLocaleDateString('tr-TR', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '-'}
                    </Typography>
                  ) : task.status === 'missed' ? (
                    <Typography variant="body2" color="text.secondary">
                      {task.missedAt ? new Date(task.missedAt).toLocaleDateString('tr-TR', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '-'}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {new Date(task.createdAt).toLocaleDateString('tr-TR', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Typography>
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
                    <IconButton
                      size="small"
                      sx={{ color: 'info.main', p: 0.5, ml: 0.5 }}
                    >
                      <TroubleshootIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {filteredTasks.length === 0 && (
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
  
  // Kart gösterimine döndüren fonksiyon
  const renderTasksCards = () => {
    return (
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {filteredTasks.map((task) => (
          <Grid item xs={12} sm={6} md={4} key={task.id}>
            <Card sx={{ 
              height: '100%', 
              borderRadius: 2, 
              boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                cursor: 'pointer'
              },
              position: 'relative',
              borderLeft: `4px solid ${getStatusColor(task.status)}`
            }}>
              <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                <Tooltip title={getStatusLabel(task.status)}>
                  <Avatar sx={{ 
                    width: 32, 
                    height: 32, 
                    bgcolor: `${getStatusColor(task.status)}20`,
                    color: getStatusColor(task.status)
                  }}>
                    {getStatusIcon(task.status)}
                  </Avatar>
                </Tooltip>
              </Box>
              
              <CardContent sx={{ p: 2, pb: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom sx={{ mr: 3, fontWeight: 'medium' }}>
                  {task.name}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                  {task.description || 'Açıklama yok'}
                </Typography>
                
                {task.isRecurring && task.repetitionTimes && task.repetitionTimes.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {task.repetitionTimes.map((time: string, index: number) => (
                      <Chip
                        key={index}
                        label={time}
                        size="small"
                        sx={{ 
                          height: 20, 
                          fontSize: '0.7rem',
                          bgcolor: `${getTaskTimeColor(task, time)}20`, 
                          color: getTaskTimeColor(task, time)
                        }}
                      />
                    ))}
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon fontSize="small" sx={{ mr: 0.5, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color={task.personnelName ? 'text.secondary' : 'error'} sx={{ fontSize: '0.8rem' }}>
                      {task.personnelName || 'Atanmamış'}
                    </Typography>
                  </Box>
                  
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
              </CardContent>
            </Card>
          </Grid>
        ))}
        
        {filteredTasks.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Görüntülenecek görev bulunamadı.
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    );
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Şube Görevleri
      </Typography>
      
      <Paper elevation={1} sx={{ p: 3 }}>
        {/* Filtreler ve arama */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              placeholder="Görev ara..."
              variant="outlined"
              size="small"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-filter-label">Durum</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                label="Durum"
                onChange={handleStatusFilterChange}
              >
                <MenuItem value="all">Tümü</MenuItem>
                <MenuItem value="completed">Tamamlananlar</MenuItem>
                <MenuItem value="in_progress">Devam Edenler</MenuItem>
                <MenuItem value="pending">Bekleyenler</MenuItem>
                <MenuItem value="failed">Başarısızlar</MenuItem>
                <MenuItem value="upcoming">Yaklaşanlar</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
            >
              <ToggleButton value="list" aria-label="list">
                <ViewListIcon />
              </ToggleButton>
              <ToggleButton value="card" aria-label="card">
                <ViewModuleIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
        
        {/* Görev listesi veya yükleniyor göstergesi */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredTasks.length > 0 ? (
          viewMode === 'list' ? renderTasksTable() : renderTasksCards()
        ) : (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="body1" color="text.secondary">
              Görüntülenecek görev bulunamadı.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ManagerTasksTab; 