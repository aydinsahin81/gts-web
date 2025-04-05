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
  Paper,
  Autocomplete
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
  CalendarToday as YearIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import TaskGroupsModal from './TaskGroupsModal';
import { ref, get } from 'firebase/database';
import { database } from '../../../firebase';

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
  const [isRecurring, setIsRecurring] = useState(false);
  const [repeatType, setRepeatType] = useState('daily');
  const [dailyRepetitions, setDailyRepetitions] = useState(1);
  const [startTolerance, setStartTolerance] = useState(15);
  const [repetitionTimes, setRepetitionTimes] = useState<string[]>(['12:00']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskGroupsModalOpen, setTaskGroupsModalOpen] = useState(false);
  
  // Şube filtresi için yeni state'ler
  const [branches, setBranches] = useState<Array<{id: string, name: string}>>([]);
  const [selectedBranch, setSelectedBranch] = useState<{id: string, name: string} | null>(null);
  const [filteredPersonnel, setFilteredPersonnel] = useState<any[]>([]);
  
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

  // Görev grupları için filtreleme state'i ekleyelim
  const [filteredTaskGroups, setFilteredTaskGroups] = useState<any[]>([]);

  // Şube adını getir - branchesId'den şube adını bulmak için yardımcı fonksiyon
  const getBranchName = (branchId: string | null | object): string => {
    if (!branchId) return '';
    
    // Eğer branchId bir object ise, ilk anahtarı al
    let branchIdStr: string;
    if (typeof branchId === 'object' && branchId !== null) {
      const keys = Object.keys(branchId);
      if (keys.length > 0) {
        branchIdStr = keys[0];
      } else {
        return '';
      }
    } else {
      branchIdStr = branchId as string;
    }
    
    // branches dizisini kullanarak şube adını bul
    const branch = branches.find(b => b.id === branchIdStr);
    return branch ? branch.name : '';
  };

  // Şubeleri yükle
  useEffect(() => {
    const loadBranches = async () => {
      if (!companyId) return;
      
      try {
        const branchesRef = ref(database, `companies/${companyId}/branches`);
        const branchesSnapshot = await get(branchesRef);
        
        if (branchesSnapshot.exists()) {
          const branchesData = branchesSnapshot.val();
          const branchesList = Object.entries(branchesData).map(([id, data]: [string, any]) => ({
            id,
            name: data.name || 'İsimsiz Şube',
          }));
          setBranches(branchesList);
          console.log('Yüklenen şubeler:', branchesList);
        }
      } catch (error) {
        console.error('Şube verileri yüklenirken hata:', error);
      }
    };
    
    if (open) {
      loadBranches();
    }
  }, [companyId, open]);

  // Form açıldığında başlangıç değerlerini yükle
  useEffect(() => {
    if (open) {
      // Başlangıçta filtrelenmiş personel listesini tüm personel olarak ayarla
      setFilteredPersonnel(personnel);
      
      // Başlangıçta filtrelenmiş görev gruplarını tüm görev grupları olarak ayarla
      setFilteredTaskGroups(taskGroups);
      
      // Personelin branchesId değerlerini kontrol et (farklı formatlardaki branchesId'leri hesaba kat)
      const personnelWithBranchCount = personnel.filter(p => {
        if (!p.branchesId) return false;
        
        if (typeof p.branchesId === 'object') {
          return Object.keys(p.branchesId).length > 0;
        }
        
        return true;
      }).length;
      
      console.log(`Modal açıldı, toplam personel: ${personnel.length}, şube bilgisi olan: ${personnelWithBranchCount}`);
      
      // Şube bilgisi olan personeli kontrol et
      if (personnelWithBranchCount === 0 && personnel.length > 0) {
        console.warn('Hiçbir personelin şube bilgisi (branchesId) bulunamadı!');
      }
    }
  }, [open, personnel, taskGroups]);

  // Şube değiştiğinde hem personel hem de görev gruplarını filtrele
  useEffect(() => {
    if (!selectedBranch) {
      // Şube seçili değilse tüm personeli ve görev gruplarını göster
      setFilteredPersonnel(personnel);
      setFilteredTaskGroups(taskGroups);
      return;
    }
    
    console.log("Şube ID:", selectedBranch.id);
    console.log("Toplam personel sayısı:", personnel.length);
    console.log("Toplam görev grubu sayısı:", taskGroups.length);
    
    // Personel filtreleme - Şube ID'sine göre personel filtreleme
    const filteredPerson = personnel.filter(person => {
      // branchesId'nin farklı formatları için kontrol
      let personBranchId = person.branchesId;
      
      console.log(`Personel: ${person.name || person.id}, branchesId: ${JSON.stringify(personBranchId)}`);
      
      // Eğer branchesId bir object ise, ilk anahtarı al
      if (typeof personBranchId === 'object' && personBranchId !== null) {
        const keys = Object.keys(personBranchId);
        if (keys.length > 0) {
          personBranchId = keys[0];
          console.log(`  - Object branchesId için ilk anahtar: ${personBranchId}`);
        }
      }
      
      // Null veya undefined kontrolü
      if (!personBranchId) {
        console.log(`  - branchesId yok, atlanıyor`);
        return false;
      }
      
      // String karşılaştırması yaparak eşleşmeyi kontrol et
      const isMatch = String(personBranchId) === String(selectedBranch.id);
      console.log(`  - Karşılaştırma: "${personBranchId}" === "${selectedBranch.id}" = ${isMatch}`);
      return isMatch;
    });
    
    // Görev gruplarını filtrele: 
    // 1. branchesId'si yoksa genel gruptur, her şubede gösterilir
    // 2. branchesId'si seçilen şubeyle eşleşiyorsa gösterilir
    // 3. diğer şubelerin grupları gösterilmez
    const filteredGroups = taskGroups.filter(group => {
      // Eğer grup şube bilgisi içermiyorsa genel gruptur, hepsinde göster
      if (!group.branchesId) {
        console.log(`Grup: ${group.name || group.id}, branchesId yok, genel grup olarak ekleniyor`);
        return true;
      }
      
      // branchesId'nin farklı formatları için kontrol
      let groupBranchId = group.branchesId;
      
      console.log(`Grup: ${group.name || group.id}, branchesId: ${JSON.stringify(groupBranchId)}`);
      
      // Eğer branchesId bir object ise, ilk anahtarı al
      if (typeof groupBranchId === 'object' && groupBranchId !== null) {
        const keys = Object.keys(groupBranchId);
        if (keys.length > 0) {
          groupBranchId = keys[0];
          console.log(`  - Object branchesId için ilk anahtar: ${groupBranchId}`);
        }
      }
      
      // Null veya undefined kontrolü
      if (!groupBranchId) {
        console.log(`  - branchesId değeri null veya boş, atlanıyor`);
        return false;
      }
      
      // String karşılaştırması yaparak eşleşmeyi kontrol et
      const isMatch = String(groupBranchId) === String(selectedBranch.id);
      console.log(`  - Karşılaştırma: "${groupBranchId}" === "${selectedBranch.id}" = ${isMatch}`);
      return isMatch;
    });
    
    console.log(`Şube "${selectedBranch.name}" için bulunan personel sayısı: ${filteredPerson.length}`);
    console.log(`Şube "${selectedBranch.name}" için bulunan görev grubu sayısı: ${filteredGroups.length}`);
    console.log("Filtrelenmiş görev grupları:", filteredGroups);
    
    if (filteredPerson.length === 0) {
      console.warn(`Uyarı: "${selectedBranch.name}" şubesinde hiç personel bulunamadı.`);
    }
    
    if (filteredGroups.length === 0) {
      console.warn(`Uyarı: "${selectedBranch.name}" şubesinde hiç görev grubu bulunamadı.`);
    }
    
    setFilteredPersonnel(filteredPerson);
    setFilteredTaskGroups(filteredGroups);
    
    // Eğer şu anki seçili personel bu şubede değilse, seçimi temizle
    if (selectedPersonnelId) {
      const personelExists = filteredPerson.some(p => p.id === selectedPersonnelId);
      if (!personelExists) {
        setSelectedPersonnelId('');
      }
    }
    
    // Eğer şu anki seçili grup bu şubede değilse, seçimi temizle
    if (selectedGroupId) {
      const groupExists = filteredGroups.some(g => g.id === selectedGroupId);
      if (!groupExists) {
        setSelectedGroupId('');
      }
    }
  }, [selectedBranch, personnel, taskGroups, selectedPersonnelId, selectedGroupId]);

  // Form alanlarını sıfırla
  const resetForm = () => {
    setTaskName('');
    setTaskDescription('');
    setSelectedPersonnelId('');
    setSelectedBranch(null);
    setSelectedGroupId('');
    setIsRecurring(false);
    setRepeatType('daily');
    setDailyRepetitions(1);
    setStartTolerance(15);
    setRepetitionTimes(['12:00']);
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
          completionType: 'qr', // QR kodu zorunlu
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
          completionType: 'qr', // QR kodu zorunlu
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
          py: 1.5
        }}>
          <Typography variant="h6" fontWeight="bold">Yeni Görev Ekle</Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 2, py: 2 }}>
          <Collapse in={!!error}>
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
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
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" color="primary" fontWeight="medium" gutterBottom>
              Görev Bilgileri
            </Typography>
            <Divider />
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Görev Adı"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                required
                variant="outlined"
                size="small"
                InputProps={{
                  startAdornment: (
                    <TaskIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1.2rem' }} />
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
                rows={2}
                variant="outlined"
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Autocomplete
                fullWidth
                value={selectedBranch}
                onChange={(event, newValue) => {
                  setSelectedBranch(newValue);
                }}
                options={branches}
                getOptionLabel={(option) => option.name}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BusinessIcon fontSize="small" sx={{ mr: 1, color: 'primary.main', fontSize: '0.875rem' }} />
                      <Typography variant="body2">{option.name}</Typography>
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Şube Filtresi (Opsiyonel)"
                    size="small"
                    placeholder="Şube seçin..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <BusinessIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1.2rem' }} />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
              
              {/* Şube seçiliyse bilgi mesajı göster */}
              {selectedBranch && (
                <Alert 
                  severity="info" 
                  variant="outlined" 
                  sx={{ mt: 1, fontSize: '0.75rem', py: 0.5 }}
                  icon={<BusinessIcon sx={{ fontSize: '1rem' }} />}
                >
                  <Box>
                    <Typography variant="caption" display="block" fontWeight="bold">
                      "{selectedBranch.name}" şubesi seçildi
                    </Typography>
                    <Typography variant="caption">
                      Bu şubeye ait {filteredPersonnel.length} personel ve {filteredTaskGroups.filter(g => g.branchesId).length} görev grubu bulundu.
                    </Typography>
                  </Box>
                </Alert>
              )}
            </Grid>

            <Grid item xs={12} sm={6}>
              <Autocomplete
                fullWidth
                value={filteredPersonnel.find(person => person.id === selectedPersonnelId) || null}
                onChange={(event, newValue) => {
                  if (newValue) {
                    setSelectedPersonnelId(newValue.id);
                  } else {
                    setSelectedPersonnelId('');
                  }
                }}
                options={filteredPersonnel}
                getOptionLabel={(option) => option.name}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <PersonIcon fontSize="small" sx={{ mr: 1, color: 'primary.main', fontSize: '0.875rem' }} />
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body2">{option.name}</Typography>
                        {option.branchName ? (
                          <Typography variant="caption" color="text.secondary">
                            {option.branchName}
                          </Typography>
                        ) : option.branchesId ? (
                          <Typography variant="caption" color="text.secondary">
                            {getBranchName(option.branchesId)}
                          </Typography>
                        ) : null}
                      </Box>
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Personel Seçin"
                    required
                    size="small"
                    placeholder="Personel ara..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <PersonIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1.2rem' }} />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                filterOptions={(options, state) => {
                  const inputValue = state.inputValue.toLowerCase();
                  return options.filter(option => 
                    option.name.toLowerCase().includes(inputValue) || 
                    (option.branchName && option.branchName.toLowerCase().includes(inputValue))
                  );
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl fullWidth variant="outlined" size="small">
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
                    {filteredTaskGroups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CategoryIcon fontSize="small" sx={{ mr: 1, color: 'primary.main', fontSize: '0.875rem' }} />
                          {group.name}
                          {group.branchesId && (
                            <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                              ({getBranchName(group.branchesId)})
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleOpenTaskGroupsModal}
                  sx={{ minWidth: '40px', px: 0 }}
                  size="small"
                >
                  <AddIcon fontSize="small" />
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    color="primary"
                    size="small"
                  />
                }
                label={
                  <Typography variant="subtitle2" fontWeight="medium">
                    Tekrarlı Görev
                  </Typography>
                }
              />
              
              <Alert severity="info" sx={{ mt: 1 }} variant="outlined">
                <Typography variant="body2">
                  Tüm görevler QR kod tarama yöntemi ile tamamlanacak şekilde kaydedilecektir.
                </Typography>
              </Alert>
            </Grid>

            {isRecurring && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                    Tekrar Tipi
                  </Typography>
                  <Tabs
                    value={repeatType}
                    onChange={(e, newValue) => setRepeatType(newValue)}
                    variant="fullWidth"
                    sx={{ mb: 1, borderBottom: 1, borderColor: 'divider' }}
                  >
                    <Tab 
                      value="daily" 
                      label="Günlük" 
                      icon={<TodayIcon fontSize="small" />} 
                      iconPosition="start"
                      sx={{ minHeight: '40px', py: 0.5 }}
                    />
                    <Tab 
                      value="weekly" 
                      label="Haftalık" 
                      icon={<WeekIcon fontSize="small" />} 
                      iconPosition="start"
                      sx={{ minHeight: '40px', py: 0.5 }}
                    />
                    <Tab 
                      value="monthly" 
                      label="Aylık" 
                      icon={<MonthIcon fontSize="small" />} 
                      iconPosition="start"
                      sx={{ minHeight: '40px', py: 0.5 }}
                    />
                    <Tab 
                      value="yearly" 
                      label="Yıllık" 
                      icon={<YearIcon fontSize="small" />} 
                      iconPosition="start"
                      sx={{ minHeight: '40px', py: 0.5 }}
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
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {weeklyTaskDays.map((day, index) => (
                          <Button
                            key={day.day}
                            variant={day.selected ? "contained" : "outlined"}
                            color="primary"
                            onClick={() => handleWeeklyDayToggle(index)}
                            sx={{ minWidth: '100px', py: 0.3, px: 1, fontSize: '0.75rem' }}
                            size="small"
                          >
                            {day.dayName}
                          </Button>
                        ))}
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth variant="outlined" size="small">
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
                        <Grid item xs={12} key={day.day} sx={{ mt: 1 }}>
                          <Paper 
                            variant="outlined" 
                            sx={{ p: 1.5, borderRadius: 1, borderColor: 'primary.light' }}
                          >
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                              {day.dayName} Tekrar Ayarları
                            </Typography>
                            
                            <Grid container spacing={1}>
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
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                      <FormControl fullWidth variant="outlined" size="small">
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
                      <FormControl fullWidth variant="outlined" size="small">
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
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0.5 }}>
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
                      <FormControl fullWidth variant="outlined" size="small">
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
                      <FormControl fullWidth variant="outlined" size="small">
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
                        size="small"
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
                        size="small"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth variant="outlined" size="small">
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
                        size="small"
                      />
                    </Grid>
                  </>
                )}
              </>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 2, pb: 2, pt: 0 }}>
          <Button onClick={onClose} disabled={isSubmitting} size="small">
            İptal
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : undefined}
            size="small"
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