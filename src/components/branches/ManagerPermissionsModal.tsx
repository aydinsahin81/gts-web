import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Divider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  Snackbar,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Close as CloseIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Check as CheckIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { ref, get, set, update } from 'firebase/database';
import { database } from '../../firebase';

interface Permission {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  subPermissions?: Permission[];
}

interface BranchManager {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ManagerPermissionsModalProps {
  open: boolean;
  onClose: () => void;
  branchId: string;
  branchName: string;
  companyId: string;
}

const ManagerPermissionsModal: React.FC<ManagerPermissionsModalProps> = ({
  open,
  onClose,
  branchId,
  branchName,
  companyId
}) => {
  const [managers, setManagers] = useState<BranchManager[]>([]);
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Kullanılabilir modüller (izinler)
  const [modules, setModules] = useState<Permission[]>([
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Ana ekran ve özet bilgiler',
      enabled: false,
      subPermissions: [
        { id: 'dashboard_stat_cards', name: 'İstatistik Kartları', description: 'Personel, görev, ilerleme istatistikleri', enabled: false },
        { id: 'dashboard_task_status', name: 'Günlük Görev Durumu Dağılımı', description: 'Günlük görevlerin durum dağılımı grafiği', enabled: false },
        { id: 'dashboard_weekly_task_status', name: 'Haftalık Görev Durumu Dağılımı', description: 'Haftalık görevlerin durum dağılımı grafiği', enabled: false },
        { id: 'dashboard_monthly_task_status', name: 'Aylık Görev Durumu Dağılımı', description: 'Aylık görevlerin durum dağılımı grafiği', enabled: false },
        { id: 'dashboard_personnel_performance', name: 'Personel Performansı - Günlük Görevler', description: 'Personellerin günlük görev performans grafiği', enabled: false },
        { id: 'dashboard_weekly_personnel_performance', name: 'Personel Performansı - Haftalık Görevler', description: 'Personellerin haftalık görev performans grafiği', enabled: false },
        { id: 'dashboard_monthly_personnel_performance', name: 'Personel Performansı - Aylık Görevler', description: 'Personellerin aylık görev performans grafiği', enabled: false },
        { id: 'dashboard_survey_charts', name: 'Anket Grafikleri', description: 'Anket sonuçları grafikleri', enabled: false },
        { id: 'dashboard_missed_tasks', name: 'Geciken Son 10 Görev', description: 'Geciken görevler listesi', enabled: false },
        { id: 'dashboard_completed_tasks', name: 'Tamamlanan Son 10 Görev', description: 'Tamamlanan görevler listesi', enabled: false },
        { id: 'dashboard_worst_performers', name: 'En Çok Görev Geciktiren Personeller', description: 'Geciken görevleri olan personeller', enabled: false },
        { id: 'dashboard_best_performers', name: 'En Çok Görev Yapan Personeller', description: 'Tamamlanan görevleri olan personeller', enabled: false },
        { id: 'dashboard_task_locations', name: 'Görev Tamamlama Konumları (Harita)', description: 'Görev tamamlama konumları haritası', enabled: false }
      ]
    },
    {
      id: 'tasks',
      name: 'Görevler',
      description: 'Görev yönetimi ve takibi',
      enabled: false,
      subPermissions: [
        { id: 'tasks_view', name: 'Görüntüleme', description: 'Görevleri görüntüleme', enabled: false },
        { id: 'tasks_create', name: 'Oluşturma', description: 'Yeni görev oluşturma', enabled: false },
        { id: 'tasks_edit', name: 'Düzenleme', description: 'Görevleri düzenleme', enabled: false },
        { id: 'tasks_delete', name: 'Silme', description: 'Görevleri silme', enabled: false }
      ]
    },
    {
      id: 'personnel',
      name: 'Personel',
      description: 'Personel yönetimi',
      enabled: false,
      subPermissions: [
        { id: 'personnel_view', name: 'Görüntüleme', description: 'Personelleri görüntüleme', enabled: false },
        { id: 'personnel_create', name: 'Oluşturma', description: 'Yeni personel ekleme', enabled: false },
        { id: 'personnel_edit', name: 'Düzenleme', description: 'Personel bilgilerini düzenleme', enabled: false }
      ]
    },
    {
      id: 'shifts',
      name: 'Vardiya',
      description: 'Vardiya planlaması ve yönetimi',
      enabled: false,
      subPermissions: [
        { id: 'shifts_view', name: 'Görüntüleme', description: 'Vardiyaları görüntüleme', enabled: false },
        { id: 'shifts_create', name: 'Oluşturma', description: 'Yeni vardiya oluşturma', enabled: false },
        { id: 'shifts_edit', name: 'Düzenleme', description: 'Vardiyaları düzenleme', enabled: false }
      ]
    },
    {
      id: 'reports',
      name: 'Raporlar',
      description: 'Raporlar ve analizler',
      enabled: false,
      subPermissions: [
        { id: 'reports_performance', name: 'Performans', description: 'Performans raporları', enabled: false },
        { id: 'reports_tasks', name: 'Görev Raporları', description: 'Görev istatistikleri', enabled: false },
        { id: 'reports_export', name: 'Dışa Aktarma', description: 'Rapor dışa aktarma', enabled: false }
      ]
    },
    {
      id: 'messages',
      name: 'Mesajlar',
      description: 'Mesajlaşma sistemi',
      enabled: false,
      subPermissions: [
        { id: 'messages_send', name: 'Mesaj Gönderme', description: 'Mesaj gönderme yetkisi', enabled: false },
        { id: 'messages_receive', name: 'Mesaj Alma', description: 'Mesaj alma yetkisi', enabled: false }
      ]
    },
    {
      id: 'surveys',
      name: 'Anketler',
      description: 'Anket yönetimi',
      enabled: false,
      subPermissions: [
        { id: 'surveys_view', name: 'Görüntüleme', description: 'Anketleri görüntüleme', enabled: false },
        { id: 'surveys_create', name: 'Oluşturma', description: 'Anket oluşturma', enabled: false },
        { id: 'surveys_results', name: 'Sonuçlar', description: 'Anket sonuçlarını görme', enabled: false }
      ]
    }
  ]);

  // Şubedeki yöneticileri getir
  useEffect(() => {
    if (open && companyId && branchId) {
      fetchBranchManagers();
    }
  }, [open, companyId, branchId]);

  // Seçilen yöneticiye ait izinleri getir
  useEffect(() => {
    if (selectedManager) {
      fetchManagerPermissions();
    } else {
      // Seçilen yönetici yoksa tüm izinleri devre dışı bırak
      resetPermissions();
    }
  }, [selectedManager]);

  // Alt modül genişletme/daraltma işleyicisi
  const handleExpandModule = (moduleId: string) => {
    // Sadece dashboard modülü için alt izinleri göster
    if (moduleId === 'dashboard') {
      if (expandedModules.includes(moduleId)) {
        setExpandedModules(expandedModules.filter(id => id !== moduleId));
      } else {
        setExpandedModules([...expandedModules, moduleId]);
      }
    }
  };

  // Modül ve alt izinleri değiştirme işleyicisi
  const handleModuleChange = (moduleId: string, checked: boolean) => {
    setModules(prevModules => {
      return prevModules.map(module => {
        if (module.id === moduleId) {
          // Ana modülü güncelle
          const updatedModule = { ...module, enabled: checked };
          
          // Eğer ana modül devre dışı bırakıldıysa tüm alt izinleri de devre dışı bırak
          if (!checked && moduleId === 'dashboard' && module.subPermissions) {
            updatedModule.subPermissions = module.subPermissions.map(subPerm => ({
              ...subPerm,
              enabled: false
            }));
          }
          
          // Dashboard modülü için alt izinleri otomatik olarak toggle et
          if (moduleId === 'dashboard') {
            if (expandedModules.includes(moduleId)) {
              setExpandedModules(prev => prev.filter(id => id !== moduleId));
            } else {
              setExpandedModules(prev => [...prev, moduleId]);
            }
          }
          
          return updatedModule;
        }
        return module;
      });
    });
  };

  // Alt izinleri değiştirme işleyicisi
  const handleSubPermissionChange = (moduleId: string, permissionId: string, checked: boolean) => {
    // Sadece dashboard modülü için alt izinleri değiştir
    if (moduleId === 'dashboard') {
      setModules(prevModules => {
        return prevModules.map(module => {
          if (module.id === moduleId && module.subPermissions) {
            // Alt izni güncelle
            const updatedSubPermissions = module.subPermissions.map(subPerm => {
              if (subPerm.id === permissionId) {
                return { ...subPerm, enabled: checked };
              }
              return subPerm;
            });
            
            // Eğer herhangi bir alt izin etkinleştirilirse ana modülü de etkinleştir
            const shouldEnableModule = updatedSubPermissions.some(p => p.enabled);
            
            return {
              ...module,
              enabled: shouldEnableModule || module.enabled,
              subPermissions: updatedSubPermissions
            };
          }
          return module;
        });
      });
    }
  };

  // Bir modülün tüm alt izinlerini seç/temizle
  const handleSelectAllSubPermissions = (moduleId: string, select: boolean) => {
    // Sadece dashboard modülü için tüm alt izinleri seç/temizle
    if (moduleId === 'dashboard') {
      setModules(prevModules => {
        return prevModules.map(module => {
          if (module.id === moduleId && module.subPermissions) {
            // Tüm alt izinleri güncelle
            const updatedSubPermissions = module.subPermissions.map(subPerm => ({
              ...subPerm,
              enabled: select
            }));
            
            return {
              ...module,
              enabled: select || module.enabled, // Ana modül en az bir alt izin seçiliyse aktif olmalı
              subPermissions: updatedSubPermissions
            };
          }
          return module;
        });
      });
    }
  };

  // Şubedeki yöneticileri getirme
  const fetchBranchManagers = async () => {
    setLoadingManagers(true);
    
    try {
      const personnelRef = ref(database, `companies/${companyId}/personnel`);
      const snapshot = await get(personnelRef);
      
      if (snapshot.exists()) {
        const personnelData = snapshot.val();
        // Bu şubeye atanmış yöneticileri filtrele
        const managersList = Object.entries(personnelData)
          .filter(([_, data]: [string, any]) => {
            return data.branchesId === branchId && data.role === 'manager' && !data.isDeleted;
          })
          .map(([id, data]: [string, any]) => ({
            id,
            name: data.name || 'İsimsiz Yönetici',
            email: data.email || '',
            role: data.role || 'manager'
          }));
        
        setManagers(managersList);
        
        // Eğer hiç yönetici yoksa seçili olanı temizle
        if (managersList.length === 0) {
          setSelectedManager('');
        }
        // Eğer sadece bir yönetici varsa otomatik seç
        else if (managersList.length === 1) {
          setSelectedManager(managersList[0].id);
        }
      } else {
        setManagers([]);
        setSelectedManager('');
      }
    } catch (error) {
      console.error('Şube yöneticileri yüklenirken hata:', error);
      setSnackbarMessage('Şube yöneticileri yüklenirken bir hata oluştu.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoadingManagers(false);
    }
  };

  // Yönetici izinlerini getirme
  const fetchManagerPermissions = async () => {
    if (!selectedManager) return;
    
    setLoadingPermissions(true);
    
    try {
      const permissionsRef = ref(database, `companies/${companyId}/permissions/managers/${selectedManager}`);
      const snapshot = await get(permissionsRef);
      
      if (snapshot.exists()) {
        const permissionsData = snapshot.val();
        
        // Modülleri ve alt izinleri güncelle
        updateModulesFromPermissions(permissionsData);
        
        // Dashboard modülü aktifse otomatik genişlet
        if (permissionsData['dashboard'] === true && !expandedModules.includes('dashboard')) {
          setExpandedModules(prev => [...prev, 'dashboard']);
        }
      } else {
        // İzin bulunamadıysa tüm izinleri devre dışı bırak
        resetPermissions();
      }
    } catch (error) {
      console.error('Yönetici izinleri yüklenirken hata:', error);
      setSnackbarMessage('Yönetici izinleri yüklenirken bir hata oluştu.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      resetPermissions();
    } finally {
      setLoadingPermissions(false);
    }
  };

  // İzinleri modüllere uygulama
  const updateModulesFromPermissions = (permissionsData: any) => {
    setModules(prevModules => {
      return prevModules.map(module => {
        // Ana modül iznini kontrol et
        const moduleEnabled = permissionsData[module.id] === true;
        
        // Alt izinleri sadece dashboard için kontrol et
        let updatedSubPermissions = module.subPermissions;
        if (module.id === 'dashboard' && module.subPermissions && permissionsData[module.id + '_subPermissions']) {
          updatedSubPermissions = module.subPermissions.map(subPerm => {
            const subPermEnabled = permissionsData[module.id + '_subPermissions'][subPerm.id] === true;
            return { ...subPerm, enabled: subPermEnabled };
          });
        }
        
        return {
          ...module,
          enabled: moduleEnabled,
          subPermissions: updatedSubPermissions
        };
      });
    });
  };

  // Tüm izinleri sıfırlama
  const resetPermissions = () => {
    setModules(prevModules => {
      return prevModules.map(module => {
        if (module.id === 'dashboard') {
          return {
            ...module,
            enabled: false,
            subPermissions: module.subPermissions ? module.subPermissions.map(subPerm => ({
              ...subPerm,
              enabled: false
            })) : undefined
          };
        } else {
          return {
            ...module,
            enabled: false
          };
        }
      });
    });
  };

  // İzinleri kaydetme
  const handleSavePermissions = async () => {
    if (!selectedManager || !companyId) return;
    
    setSavingPermissions(true);
    
    try {
      // İzinleri formatla
      const formattedPermissions: any = {};
      
      modules.forEach(module => {
        // Ana modül iznini ekle
        formattedPermissions[module.id] = module.enabled;
        
        // Alt izinleri sadece dashboard için ekle
        if (module.id === 'dashboard' && module.subPermissions && module.subPermissions.length > 0) {
          formattedPermissions[module.id + '_subPermissions'] = {};
          
          module.subPermissions.forEach(subPerm => {
            formattedPermissions[module.id + '_subPermissions'][subPerm.id] = subPerm.enabled;
          });
        }
      });
      
      // Firebase'e kaydet
      const permissionsRef = ref(database, `companies/${companyId}/permissions/managers/${selectedManager}`);
      await set(permissionsRef, formattedPermissions);
      
      setSnackbarMessage('Yönetici izinleri başarıyla kaydedildi.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Yönetici izinleri kaydedilirken hata:', error);
      setSnackbarMessage('Yönetici izinleri kaydedilirken bir hata oluştu.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSavingPermissions(false);
    }
  };

  // Modal kapatma işleyicisi
  const handleClose = () => {
    setSelectedManager('');
    resetPermissions();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SecurityIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6">
              {`"${branchName}" Şubesi Yönetici İzinleri`}
            </Typography>
          </Box>
          <IconButton edge="end" color="inherit" onClick={handleClose} aria-label="kapat">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            Bu sayfada, seçtiğiniz şube yöneticisinin hangi modüllere ve özelliklere erişebileceğini belirleyebilirsiniz.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Yöneticiye izin vermediğiniz modüller ve özellikler yönetici panelinde görüntülenmeyecektir.
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* Yönetici Seçimi */}
        <FormControl fullWidth sx={{ mb: 4 }}>
          <InputLabel id="manager-select-label">Yönetici Seçin</InputLabel>
          <Select
            labelId="manager-select-label"
            value={selectedManager}
            label="Yönetici Seçin"
            onChange={(e) => setSelectedManager(e.target.value as string)}
            disabled={loadingManagers}
            displayEmpty={managers.length === 0}
            renderValue={(selected) => {
              if (selected === '') {
                return <Typography color="text.secondary">Lütfen bir yönetici seçin</Typography>;
              }
              
              const manager = managers.find(m => m.id === selected);
              return manager ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: 'primary.main' }}>
                    {manager.name.charAt(0)}
                  </Avatar>
                  <Typography>{manager.name}</Typography>
                  {manager.email && (
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      ({manager.email})
                    </Typography>
                  )}
                </Box>
              ) : '';
            }}
          >
            {loadingManagers ? (
              <MenuItem disabled>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Yöneticiler yükleniyor...
              </MenuItem>
            ) : managers.length === 0 ? (
              <MenuItem disabled>
                Şubede henüz yönetici bulunmuyor
              </MenuItem>
            ) : (
              managers.map((manager) => (
                <MenuItem key={manager.id} value={manager.id}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>{manager.name.charAt(0)}</Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={manager.name} 
                    secondary={manager.email}
                  />
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
        
        {/* İzin Modülleri */}
        {selectedManager ? (
          loadingPermissions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              <Typography variant="h6" gutterBottom>
                Modül İzinleri
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Yöneticinin erişebileceği modülleri ve bu modüllerdeki yetkileri seçin:
              </Typography>
              
              <List component="div" sx={{ width: '100%' }}>
                {modules.map((module) => (
                  <Box key={module.id} sx={{ mb: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <ListItem 
                      secondaryAction={
                        <Checkbox
                          checked={module.enabled}
                          onChange={(_, checked) => handleModuleChange(module.id, checked)}
                        />
                      }
                      sx={{ bgcolor: module.enabled ? 'rgba(25, 118, 210, 0.08)' : 'inherit' }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" fontWeight={500}>
                            {module.name}
                          </Typography>
                        }
                        secondary={module.description}
                      />
                      
                      {module.id === 'dashboard' && module.subPermissions && module.subPermissions.length > 0 && (
                        <IconButton
                          edge="end"
                          onClick={() => handleExpandModule(module.id)}
                          sx={{ ml: 1 }}
                        >
                          {expandedModules.includes(module.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      )}
                    </ListItem>
                    
                    {module.id === 'dashboard' && module.subPermissions && module.subPermissions.length > 0 && (
                      <Collapse in={expandedModules.includes(module.id)} timeout="auto" unmountOnExit>
                        <Box sx={{ pl: 4, pr: 2, py: 1, bgcolor: 'background.default' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle2">
                              Alt İzinler
                            </Typography>
                            {module.id === 'dashboard' && module.enabled && (
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button 
                                  size="small" 
                                  variant="outlined" 
                                  color="primary"
                                  onClick={() => handleSelectAllSubPermissions(module.id, true)}
                                >
                                  Tümünü Seç
                                </Button>
                                <Button 
                                  size="small" 
                                  variant="outlined" 
                                  color="error"
                                  onClick={() => handleSelectAllSubPermissions(module.id, false)}
                                >
                                  Tümünü Temizle
                                </Button>
                              </Box>
                            )}
                          </Box>
                          
                          <FormGroup>
                            {module.id === 'dashboard' && module.subPermissions.map((permission) => (
                              <FormControlLabel
                                key={permission.id}
                                control={
                                  <Checkbox
                                    checked={permission.enabled}
                                    onChange={(_, checked) => 
                                      handleSubPermissionChange(module.id, permission.id, checked)
                                    }
                                    disabled={!module.enabled}
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant="body2">{permission.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {permission.description}
                                    </Typography>
                                  </Box>
                                }
                              />
                            ))}
                          </FormGroup>
                        </Box>
                      </Collapse>
                    )}
                  </Box>
                ))}
              </List>
            </Box>
          )
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            Lütfen izinlerini düzenlemek istediğiniz bir yönetici seçin.
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit">
          İptal
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSavePermissions}
          disabled={!selectedManager || savingPermissions || loadingPermissions}
          startIcon={savingPermissions && <CircularProgress size={24} color="inherit" />}
        >
          {savingPermissions ? 'Kaydediliyor...' : 'İzinleri Kaydet'}
        </Button>
      </DialogActions>
      
      {/* Bildirim */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default ManagerPermissionsModal; 