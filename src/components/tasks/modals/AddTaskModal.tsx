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
  Collapse,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  TaskAlt as TaskIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  Add as AddIcon,
  Today as TodayIcon,
  DateRange as WeekIcon,
  CalendarMonth as MonthIcon,
  CalendarToday as YearIcon
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
    repeatType: string;
    dailyRepetitions: number;
    startTolerance: number;
    repetitionTimes: string[];
    groupId?: string;
    // Haftalık, aylık ve yıllık tekrar seçenekleri için ek alanlar
    weekDays?: number[];
    monthDay?: number;
    yearDate?: string;
  }) => Promise<void>;
  onAddWeeklyTask?: (taskData: {
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
  }) => Promise<void>;
  personnel: any[];
  taskGroups?: any[];
  companyId?: string;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ 
  open, 
  onClose, 
  onAddTask, 
  onAddWeeklyTask,
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
  const [repeatType, setRepeatType] = useState('daily');
  const [dailyRepetitions, setDailyRepetitions] = useState(1);
  const [startTolerance, setStartTolerance] = useState(15);
  const [repetitionTimes, setRepetitionTimes] = useState<string[]>(['12:00']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskGroupsModalOpen, setTaskGroupsModalOpen] = useState(false);
  
  // Haftalık, aylık ve yıllık tekrar seçenekleri için state'ler
  const [weekDays, setWeekDays] = useState<number[]>([1]); // Pazartesi varsayılan
  const [monthDay, setMonthDay] = useState<number>(1); // Ayın ilk günü varsayılan
  const [yearDate, setYearDate] = useState<string>('01-01'); // 1 Ocak varsayılan

  // Haftalık görevler için yeni state'ler
  const [weeklyTaskDays, setWeeklyTaskDays] = useState<{
    day: number;
    dayName: string;
    selected: boolean;
    dailyRepetitions: number;
    repetitionTimes: string[];
  }[]>([
    { day: 1, dayName: 'Pazartesi', selected: false, dailyRepetitions: 1, repetitionTimes: ['12:00'] },
    { day: 2, dayName: 'Salı', selected: false, dailyRepetitions: 1, repetitionTimes: ['12:00'] },
    { day: 3, dayName: 'Çarşamba', selected: false, dailyRepetitions: 1, repetitionTimes: ['12:00'] },
    { day: 4, dayName: 'Perşembe', selected: false, dailyRepetitions: 1, repetitionTimes: ['12:00'] },
    { day: 5, dayName: 'Cuma', selected: false, dailyRepetitions: 1, repetitionTimes: ['12:00'] },
    { day: 6, dayName: 'Cumartesi', selected: false, dailyRepetitions: 1, repetitionTimes: ['12:00'] },
    { day: 0, dayName: 'Pazar', selected: false, dailyRepetitions: 1, repetitionTimes: ['12:00'] },
  ]);

  // Form alanlarını sıfırla
  const resetForm = () => {
    setTaskName('');
    setTaskDescription('');
    setSelectedPersonnelId('');
    setSelectedGroupId('');
    setCompletionType('button');
    setIsRecurring(false);
    setRepeatType('daily');
    setDailyRepetitions(1);
    setStartTolerance(15);
    setRepetitionTimes(['12:00']);
    setWeekDays([1]);
    setMonthDay(1);
    setYearDate('01-01');
    setError(null);
    
    // Haftalık görev günlerini sıfırla
    setWeeklyTaskDays(weeklyTaskDays.map(day => ({
      ...day,
      selected: false,
      dailyRepetitions: 1,
      repetitionTimes: ['12:00']
    })));
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

  // Haftalık tekrar için gün seçimini güncelle
  const handleWeekDayChange = (day: number) => {
    if (weekDays.includes(day)) {
      // Eğer zaten seçili ise kaldır (en az bir gün seçili olmalı)
      if (weekDays.length > 1) {
        setWeekDays(weekDays.filter(d => d !== day));
      }
    } else {
      // Seçili değilse ekle
      setWeekDays([...weekDays, day]);
    }
  };

  // Haftalık görev günü seçimi
  const handleWeeklyDayToggle = (dayIndex: number) => {
    const updatedDays = [...weeklyTaskDays];
    updatedDays[dayIndex].selected = !updatedDays[dayIndex].selected;
    setWeeklyTaskDays(updatedDays);
  };
  
  // Haftalık görev günlük tekrar sayısı değişimi
  const handleWeeklyDayRepetitionChange = (dayIndex: number, repetitions: number) => {
    const updatedDays = [...weeklyTaskDays];
    updatedDays[dayIndex].dailyRepetitions = repetitions;
    
    // Tekrar sayısına göre saatleri güncelle
    const currentTimes = updatedDays[dayIndex].repetitionTimes;
    if (repetitions > currentTimes.length) {
      // Yeni saat ekle
      const newTimes = [...currentTimes];
      for (let i = currentTimes.length; i < repetitions; i++) {
        newTimes.push('12:00');
      }
      updatedDays[dayIndex].repetitionTimes = newTimes;
    } else if (repetitions < currentTimes.length) {
      // Fazla saatleri kaldır
      updatedDays[dayIndex].repetitionTimes = currentTimes.slice(0, repetitions);
    }
    
    setWeeklyTaskDays(updatedDays);
  };
  
  // Haftalık görev gün saati değişimi
  const handleWeeklyDayTimeChange = (dayIndex: number, timeIndex: number, newTime: string) => {
    const updatedDays = [...weeklyTaskDays];
    updatedDays[dayIndex].repetitionTimes[timeIndex] = newTime;
    setWeeklyTaskDays(updatedDays);
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
    
    // Haftalık görev için en az bir gün seçili olmalı
    if (isRecurring && repeatType === 'weekly') {
      if (!weeklyTaskDays.some(day => day.selected)) {
        setError('Lütfen en az bir hafta günü seçin.');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Haftalık görevleri ayrı bir API çağrısıyla işle
      if (isRecurring && repeatType === 'weekly' && onAddWeeklyTask) {
        // Seçili günleri filtrele
        const selectedDays = weeklyTaskDays
          .filter(day => day.selected)
          .map(({ day, dailyRepetitions, repetitionTimes }) => ({
            day,
            dailyRepetitions,
            repetitionTimes
          }));
          
        await onAddWeeklyTask({
          name: taskName,
          description: taskDescription,
          personnelId: selectedPersonnelId,
          completionType,
          weekDays: selectedDays,
          startTolerance,
          groupId: selectedGroupId || undefined,
        });
      } else {
        // Normal görevler için mevcut işlemi kullan
        await onAddTask({
          name: taskName,
          description: taskDescription,
          personnelId: selectedPersonnelId,
          completionType,
          isRecurring,
          repeatType,
          dailyRepetitions,
          startTolerance,
          repetitionTimes,
          groupId: selectedGroupId || undefined,
          weekDays: isRecurring && repeatType === 'weekly' ? weekDays : undefined,
          monthDay: isRecurring && repeatType === 'monthly' ? monthDay : undefined,
          yearDate: isRecurring && repeatType === 'yearly' ? yearDate : undefined
        });
      }
      
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

  // Haftanın günleri
  const weekDayLabels = [
    { value: 1, label: 'Pazartesi' },
    { value: 2, label: 'Salı' },
    { value: 3, label: 'Çarşamba' },
    { value: 4, label: 'Perşembe' },
    { value: 5, label: 'Cuma' },
    { value: 6, label: 'Cumartesi' },
    { value: 0, label: 'Pazar' }
  ];

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
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Tekrar Tipi
                  </Typography>
                  <Tabs
                    value={repeatType}
                    onChange={(e, newValue) => setRepeatType(newValue)}
                    variant="fullWidth"
                    sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                  >
                    <Tab 
                      value="daily" 
                      label="Günlük" 
                      icon={<TodayIcon />} 
                      iconPosition="start"
                    />
                    <Tab 
                      value="weekly" 
                      label="Haftalık" 
                      icon={<WeekIcon />} 
                      iconPosition="start"
                    />
                    <Tab 
                      value="monthly" 
                      label="Aylık" 
                      icon={<MonthIcon />} 
                      iconPosition="start"
                    />
                    <Tab 
                      value="yearly" 
                      label="Yıllık" 
                      icon={<YearIcon />} 
                      iconPosition="start"
                    />
                  </Tabs>
                </Grid>

                {/* Haftalık tekrar seçenekleri */}
                {repeatType === 'weekly' && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                        Haftanın Günleri
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {weeklyTaskDays.map((day, index) => (
                          <Button
                            key={day.day}
                            variant={day.selected ? "contained" : "outlined"}
                            color="primary"
                            onClick={() => handleWeeklyDayToggle(index)}
                            sx={{ minWidth: '110px' }}
                          >
                            {day.dayName}
                          </Button>
                        ))}
                      </Box>
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
                    
                    {/* Seçili günler için tekrar ayarları */}
                    {weeklyTaskDays.filter(day => day.selected).map((day, dayIndex) => {
                      const actualDayIndex = weeklyTaskDays.findIndex(d => d.day === day.day);
                      return (
                        <Grid item xs={12} key={day.day} sx={{ mt: 2 }}>
                          <Paper 
                            variant="outlined" 
                            sx={{ p: 2, borderRadius: 2, borderColor: 'primary.light' }}
                          >
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                              {day.dayName} Tekrar Ayarları
                            </Typography>
                            
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <FormControl fullWidth variant="outlined" size="small">
                                  <InputLabel>Günlük Tekrar Sayısı</InputLabel>
                                  <Select
                                    value={day.dailyRepetitions.toString()}
                                    onChange={(e) => handleWeeklyDayRepetitionChange(actualDayIndex, Number(e.target.value))}
                                    label="Günlük Tekrar Sayısı"
                                  >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                      <MenuItem key={num} value={num}>{num}</MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>
                              
                              <Grid item xs={12}>
                                <Typography variant="body2" gutterBottom>
                                  Tekrar Saatleri:
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {Array.from({ length: day.dailyRepetitions }).map((_, timeIndex) => (
                                    <TextField
                                      key={timeIndex}
                                      label={`${timeIndex + 1}. Tekrar Saati`}
                                      type="time"
                                      value={day.repetitionTimes[timeIndex]}
                                      onChange={(e) => handleWeeklyDayTimeChange(actualDayIndex, timeIndex, e.target.value)}
                                      InputLabelProps={{ shrink: true }}
                                      inputProps={{ step: 300 }}
                                      size="small"
                                      fullWidth
                                    />
                                  ))}
                                </Box>
                              </Grid>
                            </Grid>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </>
                )}

                {/* Günlük tekrar seçenekleri */}
                {repeatType === 'daily' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Günlük Tekrar Sayısı</InputLabel>
                        <Select
                          value={dailyRepetitions.toString()}
                          onChange={(e) => setDailyRepetitions(Number(e.target.value))}
                          label="Günlük Tekrar Sayısı"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
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

                {/* Aylık tekrar seçenekleri */}
                {repeatType === 'monthly' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Ayın Günü</InputLabel>
                        <Select
                          value={monthDay.toString()}
                          onChange={(e) => setMonthDay(Number(e.target.value))}
                          label="Ayın Günü"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <MenuItem key={day} value={day}>{day}</MenuItem>
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
                      <TextField
                        label="Tekrar Saati"
                        type="time"
                        value={repetitionTimes[0]}
                        onChange={(e) => handleTimeChange(0, e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ step: 300 }}
                        fullWidth
                      />
                    </Grid>
                  </>
                )}

                {/* Yıllık tekrar seçenekleri */}
                {repeatType === 'yearly' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Yıllık Tarih"
                        type="date"
                        value={`2024-${yearDate}`} // Herhangi bir yıl ekleyerek geçerli tarih formatı oluştur
                        onChange={(e) => {
                          // Tarihten sadece ay ve günü al
                          const date = new Date(e.target.value);
                          const month = (date.getMonth() + 1).toString().padStart(2, '0');
                          const day = date.getDate().toString().padStart(2, '0');
                          setYearDate(`${month}-${day}`);
                        }}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                      />
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
                      <TextField
                        label="Tekrar Saati"
                        type="time"
                        value={repetitionTimes[0]}
                        onChange={(e) => handleTimeChange(0, e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ step: 300 }}
                        fullWidth
                      />
                    </Grid>
                  </>
                )}
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