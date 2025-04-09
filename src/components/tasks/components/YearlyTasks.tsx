import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Info as InfoIcon,
  Print as PrintIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { ref, get } from 'firebase/database';
import { database } from '../../../firebase';

interface YearlyTasksProps {
  companyId: string | null;
  statusFilter: string;
  personnelFilter: string;
  taskSearchTerm: string;
  viewMode: 'card' | 'list';
  personnel: any[];
  onShowTaskDetail: (task: any) => void;
  onOpenQrPrintModal: (task: any, event: React.MouseEvent) => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusLabel: (status: string) => string;
  getTaskTimeColor: (task: any, timeString: string) => string;
  onDeleteTask?: (taskId: string, personnelId: string) => Promise<void>;
}

const YearlyTasks: React.FC<YearlyTasksProps> = ({
  companyId,
  statusFilter,
  personnelFilter,
  taskSearchTerm,
  viewMode,
  personnel,
  onShowTaskDetail,
  onOpenQrPrintModal,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  getTaskTimeColor,
  onDeleteTask
}) => {
  const [yearlyTasks, setYearlyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<{[key: string]: string}>({});
  
  // Şubeleri yükle
  useEffect(() => {
    const loadBranches = async () => {
      if (!companyId) return;
      
      try {
        const branchesRef = ref(database, `companies/${companyId}/branches`);
        const branchesSnapshot = await get(branchesRef);
        
        if (branchesSnapshot.exists()) {
          const branchesData = branchesSnapshot.val();
          const branchesMap: {[key: string]: string} = {};
          
          Object.entries(branchesData).forEach(([id, data]: [string, any]) => {
            branchesMap[id] = data.name || 'İsimsiz Şube';
          });
          
          setBranches(branchesMap);
        }
      } catch (error) {
        console.error('Şubeler yüklenirken hata:', error);
      }
    };
    
    loadBranches();
  }, [companyId]);

  // Verileri yükle
  useEffect(() => {
    const loadYearlyTasks = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Yıllık görevleri al
        const yearlyTasksRef = ref(database, `companies/${companyId}/yearlyTasks`);
        const yearlyTasksSnapshot = await get(yearlyTasksRef);
        
        if (yearlyTasksSnapshot.exists()) {
          const yearlyTasksData = yearlyTasksSnapshot.val();
          
          // Veriyi diziye dönüştür ve ID ekle
          const yearlyTasksArray = Object.entries(yearlyTasksData).map(([id, data]: [string, any]) => ({
            id,
            ...data,
            status: data.status || 'pending' // Varsayılan durum
          }));
          
          setYearlyTasks(yearlyTasksArray);
        } else {
          setYearlyTasks([]);
        }
      } catch (error) {
        console.error('Yıllık görevler yüklenirken hata:', error);
        setError('Yıllık görevler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    
    loadYearlyTasks();
  }, [companyId]);

  // Görevleri filtrele
  const filteredTasks = yearlyTasks.filter(task => {
    // Durum filtreleme
    if (statusFilter !== 'all' && task.status !== statusFilter) {
      return false;
    }
    
    // Personel filtreleme
    if (personnelFilter !== 'all' && task.personnelId !== personnelFilter) {
      return false;
    }
    
    // Metin araması
    const searchTerm = taskSearchTerm.toLowerCase();
    if (searchTerm) {
      const taskName = task.name?.toLowerCase() || '';
      const taskDesc = task.description?.toLowerCase() || '';
      const taskPersonnelName = task.personnelName?.toLowerCase() || '';
      const taskGroupName = task.groupName?.toLowerCase() || '';
      
      return (
        taskName.includes(searchTerm) ||
        taskDesc.includes(searchTerm) ||
        taskPersonnelName.includes(searchTerm) ||
        taskGroupName.includes(searchTerm)
      );
    }
    
    return true;
  });

  // Planlanma tarihine göre görevleri sırala
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Önce planlama tarihine göre sırala
    const dateA = new Date(a.planDate || 0);
    const dateB = new Date(b.planDate || 0);
    return dateA.getTime() - dateB.getTime();
  });

  // Şube adını getir
  const getBranchName = (branchId: string) => {
    if (!branchId) return '-';
    return branches[branchId] || 'Bilinmeyen Şube';
  };

  // Yükleniyor durumunda
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Hata durumunda
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  // Hiç görev yoksa
  if (sortedTasks.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Kriterlere uygun yıllık görev planı bulunamadı.
      </Alert>
    );
  }

  return (
    <>
      {viewMode === 'card' ? (
        <Grid container spacing={2}>
          {sortedTasks.map((task) => (
            <Grid item xs={12} sm={6} md={4} key={task.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  borderRadius: 2,
                  position: 'relative',
                  overflow: 'visible',
                  '&:hover': {
                    boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
                  }
                }}
              >
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: -10, 
                    right: 16,
                    zIndex: 1
                  }}
                >
                  <Chip
                    label="Yıllık Plan"
                    color="info"
                    size="small"
                    icon={<AssignmentIcon sx={{ fontSize: '1rem !important' }} />}
                    sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                  />
                </Box>
                <CardContent sx={{ flexGrow: 1, pt: 3 }}>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {task.name}
                  </Typography>
                  
                  <Grid container spacing={1} sx={{ mb: 1 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" component="div">
                        Personel
                      </Typography>
                      <Typography variant="body2" component="div">
                        {task.personnelName || '-'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" component="div">
                        Planlama Tarihi
                      </Typography>
                      <Typography variant="body2" component="div">
                        {task.planDate ? new Date(task.planDate).toLocaleDateString('tr-TR') : '-'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" component="div">
                        Şube
                      </Typography>
                      <Typography variant="body2" component="div">
                        {task.branchName || getBranchName(task.branchesId) || '-'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" component="div">
                        Görev Grubu
                      </Typography>
                      <Typography variant="body2" component="div">
                        {task.groupName || '-'}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" component="div">
                      Görev Açıklaması
                    </Typography>
                    <Typography variant="body2" component="div" noWrap sx={{ mb: 1 }}>
                      {task.description || '-'}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary" component="div">
                      Plan Detayları
                    </Typography>
                    <Typography 
                      variant="body2" 
                      component="div" 
                      sx={{
                        maxHeight: '60px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {task.yearlyPlanDetails || '-'}
                    </Typography>
                  </Box>
                </CardContent>
                
                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    alignItems: 'center',
                    p: 1,
                    borderTop: '1px solid rgba(0,0,0,0.05)'
                  }}
                >
                  <Tooltip title="Detayları Görüntüle">
                    <IconButton
                      size="small"
                      onClick={() => onShowTaskDetail(task)}
                      sx={{ color: 'primary.main' }}
                    >
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  {onDeleteTask && (
                    <Tooltip title="Görevi Sil">
                      <IconButton
                        size="small"
                        onClick={() => onDeleteTask(task.id, task.personnelId)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: '0 4px 8px rgba(0,0,0,0.1)', borderRadius: 2 }}>
          <Table sx={{ minWidth: 650 }} size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.light' }}>
                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Durum</TableCell>
                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Görev Adı</TableCell>
                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Görev Açıklaması</TableCell>
                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Planlama Tarihi</TableCell>
                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Personel</TableCell>
                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Şube</TableCell>
                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Görev Grubu</TableCell>
                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Yıllık Plan Görev Detayları</TableCell>
                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedTasks.map((task) => (
                <TableRow
                  key={task.id}
                  hover
                  onClick={() => onShowTaskDetail(task)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                  }}
                >
                  <TableCell>
                    <Chip
                      label="Yıllık Plan"
                      color="info"
                      size="small"
                      icon={<AssignmentIcon sx={{ fontSize: '0.7rem !important' }} />}
                      sx={{ fontWeight: 'medium', fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell>{task.name}</TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}
                    >
                      {task.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {task.planDate ? new Date(task.planDate).toLocaleDateString('tr-TR') : '-'}
                  </TableCell>
                  <TableCell>{task.personnelName || '-'}</TableCell>
                  <TableCell>{task.branchName || getBranchName(task.branchesId) || '-'}</TableCell>
                  <TableCell>{task.groupName || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 250 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        maxWidth: '250px' 
                      }}
                    >
                      {task.yearlyPlanDetails || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex' }}>
                      <Tooltip title="Detayları Görüntüle">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShowTaskDetail(task);
                          }}
                          sx={{ color: 'primary.main' }}
                        >
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      {onDeleteTask && (
                        <Tooltip title="Görevi Sil">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTask(task.id, task.personnelId);
                            }}
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
};

export default YearlyTasks; 