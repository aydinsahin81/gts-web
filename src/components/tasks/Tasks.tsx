import React, { useState, useEffect } from 'react';
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
  ToggleButton
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
  Print as PrintIcon
} from '@mui/icons-material';
import { ref, get, onValue, off, remove, update, push, set } from 'firebase/database';
import { database, auth } from '../../firebase';
import TimeService from '../../services/TimeService';
import TaskTimeService, { TaskTimeStatus } from '../../services/TaskTimeService';
import MissedTaskService from '../../services/MissedTaskService';

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
  { value: 'assigned', label: 'Atanmış', color: '#1976D2' },
  { value: 'waiting', label: 'Bekleyen', color: '#2196F3' },
  { value: 'pending', label: 'Beklemede', color: '#FF9800' },
  { value: 'missed', label: 'Tamamlanmamış', color: '#F44336' },
];

// Görev detay modalı bileşeni
interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  task: any;
  onDelete: (taskId: string, personnelId: string) => Promise<void>;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusLabel: (status: string) => string;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ 
  open, 
  onClose, 
  task, 
  onDelete,
  getStatusColor,
  getStatusIcon,
  getStatusLabel 
}) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!task) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      await onDelete(task.id, task.personnelId);
      onClose();
    } catch (err) {
      setError('Görev silinirken bir hata oluştu. Lütfen tekrar deneyin.');
      console.error('Görev silme hatası:', err);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        bgcolor: 'primary.main',
        color: 'white',
        py: 2
      }}>
        <Typography variant="h6" fontWeight="bold">Görev Detayları</Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 3 }}>
        <Collapse in={!!error}>
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setError(null)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            <AlertTitle>Hata</AlertTitle>
            {error}
          </Alert>
        </Collapse>

        <Box sx={{ mb: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Avatar
                sx={{
                  bgcolor: `${getStatusColor(task.status)}20`,
                  color: getStatusColor(task.status),
                  mr: 2
                }}
              >
                {getStatusIcon(task.status)}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="bold">{task.name}</Typography>
                <Chip
                  label={getStatusLabel(task.status)}
                  size="small"
                  sx={{
                    bgcolor: `${getStatusColor(task.status)}20`,
                    color: getStatusColor(task.status),
                    fontWeight: 'medium',
                    mt: 0.5
                  }}
                />
              </Box>
            </Box>
          </Paper>
        </Box>

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Açıklama
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            mb: 3
          }}
        >
          <Typography variant="body2">
            {task.description || 'Açıklama yok'}
          </Typography>
        </Paper>

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Detaylar
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            mb: 3
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PersonIcon fontSize="small" sx={{ color: 'primary.main', mr: 1 }} />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Atanan Personel
              </Typography>
              <Typography variant="body2">
                {task.personnelName}
              </Typography>
            </Box>
          </Box>

          {task.isRecurring && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Tekrarlı Görev Bilgileri
              </Typography>
              
              {task.repetitionTimes && task.repetitionTimes.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Tekrar saatleri:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {task.repetitionTimes.slice(0, 3).map((time: string, index: number) => (
                      <Chip
                        key={index}
                        label={time}
                        size="small"
                        sx={{
                          bgcolor: '#03A9F420',
                          color: '#03A9F4',
                          fontSize: '0.7rem',
                          height: 20
                        }}
                      />
                    ))}
                    {task.repetitionTimes.length > 3 && (
                      <Chip
                        label={`+${task.repetitionTimes.length - 3}`}
                        size="small"
                        sx={{
                          bgcolor: '#03A9F420',
                          color: '#03A9F4',
                          fontSize: '0.7rem',
                          height: 20
                        }}
                      />
                    )}
                  </Box>
                </Box>
              )}
            </>
          )}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteConfirmOpen(true)}
          disabled={isDeleting}
        >
          {isDeleting ? 'Siliniyor...' : 'Görevi Sil'}
        </Button>
      </DialogActions>

      {/* Silme Onay Diyaloğu */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
          Dikkat: Görevi Sil
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography>
            <strong>{task.name}</strong> görevini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)} 
            disabled={isDeleting}
          >
            İptal
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

// Yeni görev ekleme modalı bileşeni
interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  onAddTask: (taskData: {
    name: string;
    description: string;
    personnelId: string;
    completionType: string;
    isRecurring: boolean;
    dailyRepetitions: number;
    startTolerance: number;
    repetitionTimes: string[];
  }) => Promise<void>;
  personnel: any[];
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ open, onClose, onAddTask, personnel }) => {
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [completionType, setCompletionType] = useState('button');
  const [isRecurring, setIsRecurring] = useState(false);
  const [dailyRepetitions, setDailyRepetitions] = useState(1);
  const [startTolerance, setStartTolerance] = useState(15);
  const [repetitionTimes, setRepetitionTimes] = useState<string[]>(['12:00']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form alanlarını sıfırla
  const resetForm = () => {
    setTaskName('');
    setTaskDescription('');
    setSelectedPersonnelId('');
    setCompletionType('button');
    setIsRecurring(false);
    setDailyRepetitions(1);
    setStartTolerance(15);
    setRepetitionTimes(['12:00']);
    setError(null);
  };

  // Modal kapandığında formu sıfırla
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // Tekrar sayısı değiştiğinde repetitionTimes dizisini güncelle
  useEffect(() => {
    if (dailyRepetitions > repetitionTimes.length) {
      // Yeni saat ekle
      const newTimes = [...repetitionTimes];
      for (let i = repetitionTimes.length; i < dailyRepetitions; i++) {
        newTimes.push('12:00');
      }
      setRepetitionTimes(newTimes);
    } else if (dailyRepetitions < repetitionTimes.length) {
      // Fazla saatleri kaldır
      setRepetitionTimes(repetitionTimes.slice(0, dailyRepetitions));
    }
  }, [dailyRepetitions]);

  // Tekrar saatini güncelle
  const handleTimeChange = (index: number, newTime: string) => {
    const newTimes = [...repetitionTimes];
    newTimes[index] = newTime;
    setRepetitionTimes(newTimes);
  };

  // Görev ekle
  const handleSubmit = async () => {
    // Validation
    if (!taskName.trim()) {
      setError('Lütfen bir görev adı girin.');
      return;
    }

    if (!selectedPersonnelId) {
      setError('Lütfen bir personel seçin.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onAddTask({
        name: taskName,
        description: taskDescription,
        personnelId: selectedPersonnelId,
        completionType,
        isRecurring,
        dailyRepetitions,
        startTolerance,
        repetitionTimes,
      });
      
      onClose();
    } catch (err) {
      console.error('Görev eklenirken hata:', err);
      setError('Görev eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        bgcolor: 'primary.main',
        color: 'white',
        py: 2
      }}>
        <Typography variant="h6" fontWeight="bold">Yeni Görev Ekle</Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 4 }}>
        <Collapse in={!!error}>
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setError(null)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            <AlertTitle>Hata</AlertTitle>
            {error}
          </Alert>
        </Collapse>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" color="primary" fontWeight="medium" gutterBottom>
            Görev Bilgileri
          </Typography>
          <Divider />
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Görev Adı"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              required
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <TaskIcon sx={{ mr: 1, color: 'text.secondary' }} />
                ),
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Görev Açıklaması"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              multiline
              rows={3}
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="personnel-select-label">Personel Seçin</InputLabel>
              <Select
                labelId="personnel-select-label"
                value={selectedPersonnelId}
                onChange={(e) => setSelectedPersonnelId(e.target.value)}
                label="Personel Seçin"
                required
              >
                {personnel.map((person) => (
                  <MenuItem key={person.id} value={person.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                      {person.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              Görev Tamamlama Yöntemi
            </Typography>
            <RadioGroup
              row
              value={completionType}
              onChange={(e) => setCompletionType(e.target.value)}
            >
              <FormControlLabel 
                value="button" 
                control={<Radio color="primary" />} 
                label="Buton" 
              />
              <FormControlLabel 
                value="qr" 
                control={<Radio color="primary" />} 
                label="QR Kod" 
              />
            </RadioGroup>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="subtitle1" fontWeight="medium">
                  Tekrarlı Görev
                </Typography>
              }
            />
          </Grid>

          {isRecurring && (
            <>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Günlük Tekrar Sayısı</InputLabel>
                  <Select
                    value={dailyRepetitions.toString()}
                    onChange={(e) => setDailyRepetitions(Number(e.target.value))}
                    label="Günlük Tekrar Sayısı"
                  >
                    {[1, 2, 3, 4, 5].map((num) => (
                      <MenuItem key={num} value={num}>{num}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Başlama Toleransı (dk)</InputLabel>
                  <Select
                    value={startTolerance.toString()}
                    onChange={(e) => setStartTolerance(Number(e.target.value))}
                    label="Başlama Toleransı (dk)"
                  >
                    {[5, 10, 15, 20, 30, 45, 60].map((num) => (
                      <MenuItem key={num} value={num}>{num} dakika</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                  Tekrar Saatleri
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  {Array.from({ length: dailyRepetitions }).map((_, index) => (
                    <TextField
                      key={index}
                      label={`${index + 1}. Tekrar Saati`}
                      type="time"
                      value={repetitionTimes[index]}
                      onChange={(e) => handleTimeChange(index, e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ step: 300 }}
                      size="small"
                    />
                  ))}
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          İptal
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : undefined}
        >
          {isSubmitting ? 'Ekleniyor...' : 'Görevi Ekle'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// QR Kod Yazdırma modalı bileşeni
interface QrPrintModalProps {
  open: boolean;
  onClose: () => void;
  task: any;
}

const QrPrintModal: React.FC<QrPrintModalProps> = ({ open, onClose, task }) => {
  if (!task) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        bgcolor: 'primary.main',
        color: 'white',
        py: 2
      }}>
        <Typography variant="h6" fontWeight="bold">QR Kod Yazdır</Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" color="primary" gutterBottom>
            {task.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Görev için QR Kodlar
          </Typography>
        </Box>

        {/* QR Kod içeriği burada oluşturulacak */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: 200,
          mb: 3,
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          p: 2
        }}>
          <QrCodeIcon sx={{ fontSize: 100, color: 'text.secondary', opacity: 0.5 }} />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>
          Kapat
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PrintIcon />}
        >
          Yazdır
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Tasks: React.FC = () => {
  // State tanımlamaları
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [personnelFilter, setPersonnelFilter] = useState<string>('all');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
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
        
        // Başlangıç verilerini al
        const personnelSnapshot = await get(personnelRef);
        const tasksSnapshot = await get(tasksRef);
        
        const personnelData = personnelSnapshot.exists() ? personnelSnapshot.val() : {};
        const tasksData = tasksSnapshot.exists() ? tasksSnapshot.val() : {};
        
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
      const taskToSave = {
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
          // Kaçırılan ve tamamlanan görev zamanlarını al
          const missedTimes = await MissedTaskService.getMissedTaskTimes(task.id, companyId as string);
          const completedTimes = await MissedTaskService.getCompletedTaskTimes(task.id, companyId as string);
          
          // Başlatılmış ama tamamlanmamış görevlerin durumlarını al
          const timeStatuses = await MissedTaskService.getCompletedTaskTimeStatuses(task.id, companyId as string);
          
          // Tekrarlanan her zaman için durumu kontrol et
          for (const timeString of task.repetitionTimes) {
            // Zaman tamamlanmış veya kaçırılmış ise özel durum ata
            if (completedTimes.includes(timeString)) {
              statusMap[`${task.id}_${timeString}`] = {
                status: 'completed',
                color: '#4CAF50', // Yeşil
                activeTime: timeString
              };
              continue;
            }
            
            if (missedTimes.includes(timeString)) {
              statusMap[`${task.id}_${timeString}`] = {
                status: 'missed',
                color: '#F44336', // Kırmızı
                activeTime: timeString
              };
              continue;
            }
            
            // Zaman başlatılmış ama tamamlanmamış ise
            if (timeStatuses[timeString] === 'started') {
              statusMap[`${task.id}_${timeString}`] = {
                status: 'started',
                color: '#795548', // Kahverengi
                activeTime: timeString
              };
              continue;
            }
            
            // Durumu kontrol et (yaklaşan, aktif, geçmiş)
            const result = await TaskTimeService.checkRecurringTaskTime(
              task.repetitionTimes,
              task.startTolerance || 15,
              task.status
            );
            
            // Renk belirle
            const color = TaskTimeService.getTaskTimeColor(result.status, task.status);
            
            statusMap[`${task.id}_${timeString}`] = {
              status: result.status,
              color,
              activeTime: result.activeTime
            };
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
              <MenuItem value="none">Atanmamış Görevler</MenuItem>
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
                      <Typography variant="caption" color="text.secondary">
                        Tekrar saatleri:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {task.repetitionTimes.slice(0, 3).map((time: string, index: number) => (
                          <TaskTimeChip
                            key={index}
                            label={time}
                            size="small"
                            status={getTaskTimeColor(task, time)}
                          />
                        ))}
                        {task.repetitionTimes.length > 3 && (
                          <Chip
                            label={`+${task.repetitionTimes.length - 3}`}
                            size="small"
                            sx={{
                              bgcolor: '#03A9F420',
                              color: '#03A9F4',
                              fontSize: '0.7rem',
                              height: 20
                            }}
                          />
                        )}
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
        <List sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          {filteredTasks.map((task) => (
            <React.Fragment key={task.id}>
              <SlimTaskCard>
                <ListItem 
                  alignItems="center" 
                  onClick={() => handleShowTaskDetail(task)}
                  sx={{ p: 1, px: 2 }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: `${getStatusColor(task.status)}20`,
                        color: getStatusColor(task.status),
                      }}
                    >
                      {getStatusIcon(task.status)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {task.name}
                        </Typography>
                        <Chip
                          label={getStatusLabel(task.status)}
                          size="small"
                          sx={{
                            ml: 1,
                            bgcolor: `${getStatusColor(task.status)}20`,
                            color: getStatusColor(task.status),
                            fontWeight: 'medium',
                            height: 20,
                            fontSize: 11,
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        {task.personnelName ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <PersonIcon fontSize="small" sx={{ color: 'text.secondary', mr: 0.5, fontSize: 16 }} />
                            <Typography variant="body2" color="text.secondary">
                              {task.personnelName}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="error" fontStyle="italic" sx={{ mt: 0.5 }}>
                            Personel atanmamış
                          </Typography>
                        )}
                        
                        {task.isRecurring && task.repetitionTimes && task.repetitionTimes.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Tekrar saatleri:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                              {task.repetitionTimes.slice(0, 3).map((time: string, index: number) => (
                                <TaskTimeChip
                                  key={index}
                                  label={time}
                                  size="small"
                                  status={getTaskTimeColor(task, time)}
                                />
                              ))}
                              {task.repetitionTimes.length > 3 && (
                                <Chip
                                  label={`+${task.repetitionTimes.length - 3}`}
                                  size="small"
                                  sx={{
                                    bgcolor: '#03A9F420',
                                    color: '#03A9F4',
                                    fontSize: '0.7rem',
                                    height: 20
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              </SlimTaskCard>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Görev Detay Modalı */}
      <TaskDetailModal
        open={taskDetailOpen}
        onClose={() => setTaskDetailOpen(false)}
        task={selectedTask}
        onDelete={handleDeleteTask}
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
      />

      {/* QR Kod Yazdırma Modalı */}
      <QrPrintModal
        open={qrPrintModalOpen}
        onClose={() => setQrPrintModalOpen(false)}
        task={selectedTaskForQr}
      />
    </ScrollableContent>
  );
};

export default Tasks; 