import React, { useState } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Paper,
  Avatar,
  Chip,
  Divider,
  Alert,
  AlertTitle,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  TextField,
  Autocomplete
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  SwapHoriz as SwapHorizIcon,
  Search as SearchIcon
} from '@mui/icons-material';

interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  task: any;
  onDelete?: (taskId: string, personnelId: string) => Promise<void>;
  onUpdatePersonnel?: (taskId: string, newPersonnelId: string) => Promise<void>;
  personnel?: any[];
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusLabel: (status: string) => string;
  readOnly?: boolean;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ 
  open, 
  onClose, 
  task, 
  onDelete,
  onUpdatePersonnel,
  personnel = [],
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  readOnly = false
}) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personnelChangeOpen, setPersonnelChangeOpen] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [isChangingPersonnel, setIsChangingPersonnel] = useState(false);
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<any | null>(null);

  const handleDelete = async () => {
    if (!task || !onDelete) return;
    
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

  const handlePersonnelChange = (_event: React.SyntheticEvent, newValue: any) => {
    if (newValue) {
      setSelectedPersonnelId(newValue.id);
      setSelectedPersonnel(newValue);
    } else {
      setSelectedPersonnelId('');
      setSelectedPersonnel(null);
    }
  };

  const handlePersonnelChangeSubmit = async () => {
    if (!task || !selectedPersonnelId || !onUpdatePersonnel) return;
    
    setIsChangingPersonnel(true);
    setError(null);
    
    try {
      await onUpdatePersonnel(task.id, selectedPersonnelId);
      setPersonnelChangeOpen(false);
    } catch (err) {
      setError('Personel değiştirilirken bir hata oluştu. Lütfen tekrar deneyin.');
      console.error('Personel değiştirme hatası:', err);
    } finally {
      setIsChangingPersonnel(false);
    }
  };

  // Personel değiştirme modalı açıldığında mevcut personeli seç
  React.useEffect(() => {
    if (personnelChangeOpen && task) {
      setSelectedPersonnelId(task.personnelId);
      setSelectedPersonnel(personnel.find(p => p.id === task.personnelId) || null);
    }
  }, [personnelChangeOpen, task, personnel]);

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
        <Typography variant="h6" fontWeight="bold">
          {readOnly ? 'Görev Bilgileri' : 'Görev Detayları'}
        </Typography>
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

          {!readOnly && onUpdatePersonnel && personnel.length > 0 && (
            <Box sx={{ mt: 1, mb: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                startIcon={<SwapHorizIcon />}
                onClick={() => {
                  setSelectedPersonnelId(task.personnelId);
                  setPersonnelChangeOpen(true);
                }}
                sx={{ borderRadius: 1 }}
              >
                Personel Değiştir
              </Button>
            </Box>
          )}

          {task.isRecurring && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Tekrar Bilgisi
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  Tolerans: {task.startTolerance || 15} dakika
                </Typography>
                {task.repetitionTimes && task.repetitionTimes.length > 0 && (
                  <>
                    <Typography variant="caption" color="text.secondary">
                      Tekrar Saatleri:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {task.repetitionTimes.map((time: string, index: number) => (
                        <Chip
                          key={index}
                          label={time}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            </>
          )}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {!readOnly && onDelete && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={isDeleting}
          >
            {isDeleting ? 'Siliniyor...' : 'Görevi Sil'}
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={onClose}
          sx={{ ml: 'auto' }}
        >
          {readOnly ? 'Kapat' : 'Tamam'}
        </Button>
      </DialogActions>

      {/* Silme onay diyaloğu */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Görev Silme Onayı</DialogTitle>
        <DialogContent>
          <Typography>
            "{task.name}" görevini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>İptal</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            {isDeleting ? 'Siliniyor...' : 'Evet, Sil'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Personel değiştirme diyaloğu */}
      <Dialog open={personnelChangeOpen} onClose={() => setPersonnelChangeOpen(false)}>
        <DialogTitle>Personel Değiştir</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            "{task.name}" görevi için yeni bir personel seçin.
          </Typography>
          <Autocomplete
            id="personnel-select"
            options={personnel}
            getOptionLabel={(option) => option.name}
            value={selectedPersonnel}
            onChange={handlePersonnelChange}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Personel Ara"
                variant="outlined"
                size="small"
                fullWidth
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <SearchIcon color="action" fontSize="small" sx={{ mr: 1 }} />
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
            noOptionsText="Personel bulunamadı"
            filterOptions={(options, state) => {
              const inputValue = state.inputValue.toLowerCase().trim();
              return options.filter(option => 
                option.name.toLowerCase().includes(inputValue)
              );
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPersonnelChangeOpen(false)}>İptal</Button>
          <Button 
            onClick={handlePersonnelChangeSubmit} 
            color="primary" 
            variant="contained"
            disabled={isChangingPersonnel || !selectedPersonnelId || selectedPersonnelId === task.personnelId}
          >
            {isChangingPersonnel ? 'Değiştiriliyor...' : 'Personeli Değiştir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default TaskDetailModal; 