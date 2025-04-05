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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  AlertTitle,
  Collapse,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Category as CategoryIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { ref, push, set, remove, get } from 'firebase/database';
import { database } from '../../../firebase';

interface TaskGroupsModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  taskGroups: Array<{
    id: string;
    name: string;
    createdAt: string;
    branchesId?: string;
  }>;
}

interface Branch {
  id: string;
  name: string;
}

const TaskGroupsModal: React.FC<TaskGroupsModalProps> = ({
  open,
  onClose,
  companyId,
  taskGroups = []
}) => {
  const [groupName, setGroupName] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const groupsPerPage = 5;
  const [usedGroupIds, setUsedGroupIds] = useState<string[]>([]);

  // Form sıfırlama
  const resetForm = () => {
    setGroupName('');
    setSelectedBranchId('');
    setError(null);
  };

  // Modal kapandığında formu sıfırla
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // Şubeleri yükle
  useEffect(() => {
    const loadBranches = async () => {
      if (!companyId) return;
      
      try {
        const branchesRef = ref(database, `companies/${companyId}/branches`);
        const branchesSnapshot = await get(branchesRef);
        
        if (branchesSnapshot.exists()) {
          const branchesData = branchesSnapshot.val();
          const branchesList: Branch[] = Object.entries(branchesData).map(([id, data]: [string, any]) => ({
            id,
            name: data.name || 'İsimsiz Şube',
          }));
          setBranches(branchesList);
        }
      } catch (error) {
        console.error('Şube verileri yüklenirken hata:', error);
      }
    };
    
    if (open) {
      loadBranches();
    }
  }, [companyId, open]);

  // Yeni grup eklendiğinde ilk sayfaya dön
  useEffect(() => {
    setPage(1);
  }, [taskGroups.length]);

  // Şube değişim işleyicisi
  const handleBranchChange = (event: SelectChangeEvent<string>) => {
    setSelectedBranchId(event.target.value);
  };

  // Grup ekleme işlemi
  const handleAddGroup = async () => {
    // Validation
    if (!groupName.trim()) {
      setError('Lütfen bir grup adı girin.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Grup verilerini hazırla
      const groupData = {
        name: groupName.trim(),
        createdAt: new Date().toISOString()
      };

      // Eğer şube seçildiyse, branchesId ekle
      if (selectedBranchId) {
        (groupData as any).branchesId = selectedBranchId;
      }

      // Firebase'e kaydet
      const newGroupRef = push(ref(database, `companies/${companyId}/taskGroups`));
      await set(newGroupRef, groupData);

      // Form temizle
      resetForm();
    } catch (err) {
      console.error('Grup eklenirken hata:', err);
      setError('Grup eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modal açıldığında görevlerde kullanılan grupları kontrol et
  useEffect(() => {
    const checkGroupUsage = async () => {
      if (!companyId || !open) return;
      
      try {
        setIsSubmitting(true);
        
        // Tüm görevleri al
        const tasksRef = ref(database, `companies/${companyId}/tasks`);
        const tasksSnapshot = await get(tasksRef);
        
        // Haftalık görevleri al
        const weeklyTasksRef = ref(database, `companies/${companyId}/weeklyTasks`);
        const weeklyTasksSnapshot = await get(weeklyTasksRef);
        
        const usedGroups: string[] = [];
        
        // Normal görevlerde kullanılan grupları kontrol et
        if (tasksSnapshot.exists()) {
          const tasksData = tasksSnapshot.val();
          
          Object.values(tasksData).forEach((task: any) => {
            if (task.groupId && !usedGroups.includes(task.groupId)) {
              usedGroups.push(task.groupId);
            }
          });
        }
        
        // Haftalık görevlerde kullanılan grupları kontrol et
        if (weeklyTasksSnapshot.exists()) {
          const weeklyTasksData = weeklyTasksSnapshot.val();
          
          Object.values(weeklyTasksData).forEach((task: any) => {
            if (task.groupId && !usedGroups.includes(task.groupId)) {
              usedGroups.push(task.groupId);
            }
          });
        }
        
        console.log('Görevlerde kullanılan gruplar:', usedGroups);
        setUsedGroupIds(usedGroups);
      } catch (error) {
        console.error('Grup kullanımları kontrol edilirken hata:', error);
      } finally {
        setIsSubmitting(false);
      }
    };
    
    checkGroupUsage();
  }, [companyId, open]);

  // Grup silme işlemi
  const handleDeleteGroup = async (groupId: string) => {
    // Önce grup bir görevde kullanılıyor mu kontrol et
    if (usedGroupIds.includes(groupId)) {
      alert('Bu grup en az bir görevde kullanılıyor ve silinemiyor. Önce bu gruba bağlı tüm görevleri silmelisiniz.');
      return;
    }
    
    if (!window.confirm('Bu grubu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Firebase'den sil
      await remove(ref(database, `companies/${companyId}/taskGroups/${groupId}`));
    } catch (err) {
      console.error('Grup silinirken hata:', err);
      setError('Grup silinirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Şube adını getir
  const getBranchName = (branchId: string | undefined) => {
    if (!branchId) return '-';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : '-';
  };

  // Grupları tarihe göre sırala (en son eklenen başta)
  const sortedGroups = [...taskGroups].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Mevcut sayfadaki grupları hesapla
  const totalPages = Math.ceil(sortedGroups.length / groupsPerPage);
  const currentGroups = sortedGroups.slice(
    (page - 1) * groupsPerPage,
    page * groupsPerPage
  );

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
        <Typography variant="h6" fontWeight="bold">Görev Grupları</Typography>
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

        {/* Yeni grup ekleme formu */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" color="primary" fontWeight="medium" gutterBottom>
            Yeni Grup Ekle
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Grup Adı"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              variant="outlined"
              disabled={isSubmitting}
              InputProps={{
                startAdornment: (
                  <CategoryIcon sx={{ mr: 1, color: 'text.secondary' }} />
                ),
              }}
            />
            
            <FormControl fullWidth variant="outlined">
              <InputLabel id="branch-select-label">Şube</InputLabel>
              <Select
                labelId="branch-select-label"
                value={selectedBranchId}
                onChange={handleBranchChange}
                label="Şube"
                disabled={isSubmitting || branches.length === 0}
                startAdornment={
                  <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }
              >
                <MenuItem value="">
                  <em>Şube seçiniz (opsiyonel)</em>
                </MenuItem>
                {branches.map((branch) => (
                  <MenuItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
              onClick={handleAddGroup}
              disabled={isSubmitting}
              sx={{ height: 48 }}
            >
              Ekle
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Grup listesi */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" color="primary" fontWeight="medium">
            Mevcut Gruplar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Toplam: {taskGroups.length} grup
          </Typography>
        </Box>
        
        {taskGroups.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
            <CategoryIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
            <Typography>Henüz hiç grup eklenmemiş</Typography>
          </Box>
        ) : (
          <>
            <Box 
              sx={{ 
                bgcolor: 'background.paper',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <List disablePadding>
                {currentGroups.map((group) => (
                  <React.Fragment key={group.id}>
                    <ListItem>
                      <ListItemText
                        primary={group.name}
                        secondary={
                          <>
                            <Typography variant="caption" component="span" display="block">
                              Oluşturulma: {new Date(group.createdAt).toLocaleString()}
                            </Typography>
                            {group.branchesId && (
                              <Typography variant="caption" component="span" display="block" sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                mt: 0.5
                              }}>
                                <BusinessIcon fontSize="small" sx={{ mr: 0.5, fontSize: 14, color: 'info.main' }} />
                                Şube: {getBranchName(group.branchesId)}
                              </Typography>
                            )}
                            {usedGroupIds.includes(group.id) && (
                              <Typography variant="caption" component="span" display="block" sx={{ 
                                mt: 0.5,
                                color: 'warning.main'
                              }}>
                                Bu grup görevlerde kullanılıyor
                              </Typography>
                            )}
                          </>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleDeleteGroup(group.id)}
                          disabled={isSubmitting || usedGroupIds.includes(group.id)}
                          color="error"
                          title={usedGroupIds.includes(group.id) ? "Bu grup görevlerde kullanıldığı için silinemez" : "Grubu sil"}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {/* Son öğe değilse ayırıcı göster */}
                    {group !== currentGroups[currentGroups.length - 1] && (
                      <Divider component="li" />
                    )}
                  </React.Fragment>
                ))}
              </List>
            </Box>
            
            {/* Sayfalama kontrolleri */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <IconButton 
                    color="primary" 
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  >
                    <PrevIcon />
                  </IconButton>
                  
                  <Typography variant="body2">
                    Sayfa {page} / {totalPages}
                  </Typography>
                  
                  <IconButton 
                    color="primary" 
                    disabled={page === totalPages}
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  >
                    <NextIcon />
                  </IconButton>
                </Stack>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Kapat
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskGroupsModal; 