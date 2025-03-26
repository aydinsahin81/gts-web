import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  RadioGroup,
  Radio,
  Switch,
  Grid,
  Divider,
  Alert,
  AlertTitle,
  IconButton,
  CircularProgress,
  Collapse
} from '@mui/material';
import {
  Close as CloseIcon,
  TaskAlt as TaskIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  Add as AddIcon
} from '@mui/icons-material';
import TaskGroupsModal from './TaskGroupsModal';

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
    groupId?: string;
  }) => Promise<void>;
  personnel: any[];
  taskGroups?: any[];
  companyId?: string;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ 
  open, 
  onClose, 
  onAddTask, 
  personnel, 
  taskGroups = [], 
  companyId = '' 
}) => {
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [completionType, setCompletionType] = useState('button');
  const [isRecurring, setIsRecurring] = useState(false);
  const [dailyRepetitions, setDailyRepetitions] = useState(1);
  const [startTolerance, setStartTolerance] = useState(15);
  const [repetitionTimes, setRepetitionTimes] = useState<string[]>(['12:00']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskGroupsModalOpen, setTaskGroupsModalOpen] = useState(false);

  // Form alanlarını sıfırla
  const resetForm = () => {
    setTaskName('');
    setTaskDescription('');
    setSelectedPersonnelId('');
    setSelectedGroupId('');
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
        groupId: selectedGroupId || undefined
      });
      
      onClose();
    } catch (err) {
      console.error('Görev eklenirken hata:', err);
      setError('Görev eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Grup yönetimi modalını aç
  const handleOpenTaskGroupsModal = () => {
    setTaskGroupsModalOpen(true);
  };

  return (
    <>
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

            <Grid item xs={12} sm={6}>
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

            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="group-select-label">Görev Grubu</InputLabel>
                  <Select
                    labelId="group-select-label"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    label="Görev Grubu"
                  >
                    <MenuItem value="">
                      <em>Grup Seçilmedi</em>
                    </MenuItem>
                    {taskGroups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CategoryIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                          {group.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleOpenTaskGroupsModal}
                  sx={{ minWidth: '48px', px: 0 }}
                >
                  <AddIcon />
                </Button>
              </Box>
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

      {/* Görev Grupları Yönetim Modalı */}
      {companyId && (
        <TaskGroupsModal
          open={taskGroupsModalOpen}
          onClose={() => setTaskGroupsModalOpen(false)}
          companyId={companyId}
          taskGroups={taskGroups}
        />
      )}
    </>
  );
};

export default AddTaskModal; 