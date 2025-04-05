import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Divider,
  Button,
  CircularProgress,
  styled,
  Chip,
  Modal,
  IconButton,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Person as PersonIcon,
  EmailOutlined as EmailIcon,
  PhoneAndroid as PhoneIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  DeleteForever as DeleteForeverIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import PersonnelBranchTransferModal from './PersonnelBranchTransferModal';
import { ref, get, update } from 'firebase/database';
import { database } from '../../firebase';

// Modal için styled component
const StyledModal = styled(Modal)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const ModalContent = styled(Paper)(({ theme }) => ({
  position: 'relative',
  width: '80%',
  maxWidth: 600,
  maxHeight: '80vh',
  overflow: 'auto',
  padding: theme.spacing(3),
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
}));

const ModalHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
}));

const ModalSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.grey[200]}`,
}));

// Görev durumuna göre renk döndür
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success.main';
    case 'started':
      return 'info.main';
    case 'accepted':
      return 'secondary.main';
    case 'pending':
    default:
      return 'warning.main';
  }
};

// Görev durumuna göre metin döndür
const getStatusText = (status: string) => {
  switch (status) {
    case 'completed':
      return 'Tamamlandı';
    case 'started':
      return 'Görev Başladı';
    case 'accepted':
      return 'Kabul Edildi';
    case 'pending':
    default:
      return 'Beklemede';
  }
};

interface PersonnelDetailsModalProps {
  open: boolean;
  onClose: () => void;
  selectedPersonnel: any;
  personnelTasks: any[];
  loadingTasks: boolean;
  showDeleted: boolean;
  confirmDelete: boolean;
  onDeleteConfirm: () => void;
  onCancelDelete: () => void;
  onDeletePersonnel: () => void;
}

const PersonnelDetailsModal: React.FC<PersonnelDetailsModalProps> = ({
  open,
  onClose,
  selectedPersonnel,
  personnelTasks,
  loadingTasks,
  showDeleted,
  confirmDelete,
  onDeleteConfirm,
  onCancelDelete,
  onDeletePersonnel
}) => {
  const [branchTransferModalOpen, setBranchTransferModalOpen] = useState(false);
  const [branchName, setBranchName] = useState<string>('');
  const [loadingBranch, setLoadingBranch] = useState(false);
  const [confirmRemoveDialogOpen, setConfirmRemoveDialogOpen] = useState(false);
  const [removingFromBranch, setRemovingFromBranch] = useState(false);
  const [branchRemoveSuccess, setBranchRemoveSuccess] = useState<string | null>(null);
  const [branchRemoveError, setBranchRemoveError] = useState<string | null>(null);

  const handleOpenBranchTransferModal = () => {
    setBranchTransferModalOpen(true);
  };

  const handleCloseBranchTransferModal = () => {
    setBranchTransferModalOpen(false);
    // Modal kapandığında şube adını tekrar yükle (şube değişmiş olabilir)
    if (selectedPersonnel?.branchesId) {
      loadBranchName(selectedPersonnel.branchesId);
    }
  };

  // Silme onay diyaloğunu aç
  const handleOpenRemoveDialog = () => {
    setConfirmRemoveDialogOpen(true);
  };

  // Silme onay diyaloğunu kapat
  const handleCloseRemoveDialog = () => {
    setConfirmRemoveDialogOpen(false);
  };

  // Şube atamasını kaldırma işlemi
  const handleRemoveBranchAssignment = async () => {
    if (!selectedPersonnel || !selectedPersonnel.id || !selectedPersonnel.companyId) return;
    
    setRemovingFromBranch(true);
    setBranchRemoveError(null);
    setBranchRemoveSuccess(null);
    setConfirmRemoveDialogOpen(false);
    
    try {
      // Personel verisini güncelle
      const personnelRef = ref(database, `companies/${selectedPersonnel.companyId}/personnel/${selectedPersonnel.id}`);
      await update(personnelRef, {
        branchesId: null
      });
      
      // Kullanıcı verisini güncelle
      const userRef = ref(database, `users/${selectedPersonnel.id}`);
      await update(userRef, {
        branchesId: null
      });
      
      // State'i güncelle
      setBranchRemoveSuccess(`Personelin "${branchName}" şubesinden ataması kaldırıldı`);
      
      // Personel nesnesini güncelle
      selectedPersonnel.branchesId = null;
      
      // Şube adını temizle
      setBranchName('');
      
      // 2 saniye sonra başarı mesajını temizle
      setTimeout(() => {
        setBranchRemoveSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Şube ataması kaldırma hatası:', error);
      setBranchRemoveError('Şube ataması kaldırılırken bir hata oluştu');
    } finally {
      setRemovingFromBranch(false);
    }
  };

  // Modal açılınca personel bilgilerini ve şube adını kontrol et/yükle
  useEffect(() => {
    const loadPersonnelData = async () => {
      if (!selectedPersonnel || !open) return;
      
      console.log("PersonnelDetailsModal - selectedPersonnel:", selectedPersonnel);
      
      // 1. Önce personel nesnesinde şube adı varsa kullan
      if (selectedPersonnel.branchName && selectedPersonnel.branchesId) {
        console.log("Personel nesnesinden şube adı kullanılıyor:", selectedPersonnel.branchName);
        setBranchName(selectedPersonnel.branchName);
        return; // Şube adı zaten var, işlemi sonlandır
      }
      
      // 2. Eğer personelde branchesId varsa ve şube adı yoksa veritabanından yükle
      if (selectedPersonnel.branchesId) {
        console.log("branchesId var, şube adı yükleniyor:", selectedPersonnel.branchesId);
        await loadBranchName(selectedPersonnel.branchesId);
        return; // Şube ID'si kullanılarak yükleme yapıldı
      }
      
      // 3. Eğer personelde branchesId yoksa, users veritabanında kontrol et
      try {
        const userRef = ref(database, `users/${selectedPersonnel.id}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          console.log("Users veritabanı verileri:", userData);
          
          if (userData.branchesId) {
            console.log("Users veritabanında branchesId bulundu:", userData.branchesId);
            
            // selectedPersonnel nesnesine branchesId ekle
            selectedPersonnel.branchesId = userData.branchesId;
            
            // Şube adını yükle
            await loadBranchName(userData.branchesId);
          } else {
            // Hiçbir şube ID'si bulunamadı
            setBranchName('');
          }
        }
      } catch (error) {
        console.error("Kullanıcı/şube bilgisi kontrol hatası:", error);
        setBranchName('');
      }
    };
    
    loadPersonnelData();
  }, [open, selectedPersonnel]);

  const loadBranchName = async (branchId: string) => {
    if (!branchId || !selectedPersonnel?.companyId) return;
    
    setLoadingBranch(true);
    try {
      const branchRef = ref(database, `companies/${selectedPersonnel.companyId}/branches/${branchId}`);
      const snapshot = await get(branchRef);
      
      if (snapshot.exists()) {
        const branchData = snapshot.val();
        
        // Kontrol et: Şube verisi direkt name içeriyor mu yoksa basicInfo yapısında mı
        if (branchData.name) {
          setBranchName(branchData.name);
        } else if (branchData.basicInfo && branchData.basicInfo.name) {
          setBranchName(branchData.basicInfo.name);
        } else {
          // Eğer selectedPersonnel'da branchName varsa onu kullan
          if (selectedPersonnel.branchName) {
            setBranchName(selectedPersonnel.branchName);
          } else {
            setBranchName('Bilinmeyen Şube');
            console.log('Şube adı veritabanında bulunamadı:', branchData);
          }
        }
      } else {
        // Veritabanında şube bulunamadıysa ama personelde branchName varsa onu kullan
        if (selectedPersonnel.branchName) {
          setBranchName(selectedPersonnel.branchName);
        } else {
          setBranchName('Şube bulunamadı');
          console.log('Şube veritabanında bulunamadı, branchId:', branchId);
        }
      }
    } catch (error) {
      console.error('Şube bilgisi yüklenirken hata:', error);
      
      // Hata durumunda bile personeldeki branchName varsa kullan
      if (selectedPersonnel.branchName) {
        setBranchName(selectedPersonnel.branchName);
      } else {
        setBranchName('Şube bilgisi yüklenemedi');
      }
    } finally {
      setLoadingBranch(false);
    }
  };

  return (
    <StyledModal
      open={open}
      onClose={onClose}
      aria-labelledby="personel-detay-modal"
    >
      <ModalContent>
        {selectedPersonnel && (
          <>
            <ModalHeader>
              <Typography variant="h5" fontWeight="bold">
                Personel Ayrıntıları
              </Typography>
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </ModalHeader>
            
            {/* Profil Bilgileri */}
            <ModalSection>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar 
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    bgcolor: 'primary.main',
                    fontSize: 36,
                    mr: 2
                  }}
                >
                  {selectedPersonnel.name.substring(0, 1).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {selectedPersonnel.name}
                  </Typography>
                  {!showDeleted && (
                    <Chip
                      label={selectedPersonnel.hasTask ? 'Görev Atanmış' : 'Müsait'}
                      size="small"
                      color={selectedPersonnel.hasTask ? 'primary' : 'success'}
                      sx={{ fontWeight: 'medium', mt: 0.5 }}
                    />
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    ID: {selectedPersonnel.id}
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              {/* İletişim Bilgileri */}
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
                İletişim Bilgileri
              </Typography>
              
              {selectedPersonnel.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    {selectedPersonnel.email}
                  </Typography>
                </Box>
              )}
              
              {selectedPersonnel.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    {selectedPersonnel.phone}
                  </Typography>
                </Box>
              )}
            </ModalSection>
            
            {/* Şubeye Aktar Butonu */}
            {!showDeleted && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<BusinessIcon />}
                  onClick={handleOpenBranchTransferModal}
                  sx={{ borderRadius: 2 }}
                >
                  Şubeye Aktar
                </Button>
              </Box>
            )}
            
            {/* Başarı veya Hata Mesajları */}
            {branchRemoveSuccess && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {branchRemoveSuccess}
              </Alert>
            )}

            {branchRemoveError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {branchRemoveError}
              </Alert>
            )}
            
            {/* Şube Bilgisi ve Şubeden Çıkar Butonu */}
            {!showDeleted && selectedPersonnel.branchesId && (
              <ModalSection>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  Şube Bilgisi
                </Typography>
                
                {loadingBranch ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    p: 2,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body1" fontWeight="medium">
                        {branchName}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteForeverIcon />}
                      onClick={handleOpenRemoveDialog}
                      disabled={removingFromBranch}
                    >
                      {removingFromBranch ? (
                        <CircularProgress size={16} color="error" />
                      ) : (
                        'Şubeden Çıkar'
                      )}
                    </Button>
                  </Box>
                )}
              </ModalSection>
            )}
            
            {/* Görev Bilgileri */}
            <ModalSection>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                Atanmış Görevler
              </Typography>
              
              {loadingTasks ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                  <CircularProgress size={30} />
                </Box>
              ) : personnelTasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ my: 2, textAlign: 'center' }}>
                  Bu personele henüz görev atanmamış.
                </Typography>
              ) : (
                personnelTasks.map((task) => (
                  <Card 
                    key={task.id} 
                    sx={{ 
                      mb: 1.5, 
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      border: `1px solid`,
                      borderColor: 'grey.200',
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {task.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {task.description ? task.description.substring(0, 100) + (task.description.length > 100 ? '...' : '') : 'Açıklama yok'}
                          </Typography>
                        </Box>
                        <Chip 
                          label={getStatusText(task.status)}
                          size="small"
                          sx={{ 
                            bgcolor: `${getStatusColor(task.status)}20`, 
                            color: getStatusColor(task.status),
                            fontWeight: 'medium' 
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))
              )}
            </ModalSection>
            
            {/* İşlem Butonları */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={onClose}
              >
                Kapat
              </Button>
              {!confirmDelete ? (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={onDeleteConfirm}
                >
                  Personeli Sil
                </Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    onClick={onCancelDelete}
                  >
                    İptal
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    onClick={onDeletePersonnel}
                  >
                    Silmeyi Onayla
                  </Button>
                </Box>
              )}
            </Box>
            
            {/* Şubeye Aktar Modalı */}
            <PersonnelBranchTransferModal
              open={branchTransferModalOpen}
              onClose={handleCloseBranchTransferModal}
              personnelId={selectedPersonnel.id}
              personnelName={selectedPersonnel.name}
              currentBranchId={selectedPersonnel.branchesId}
            />

            {/* Şube atamasını kaldırma onay diyaloğu */}
            <Dialog
              open={confirmRemoveDialogOpen}
              onClose={handleCloseRemoveDialog}
            >
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon color="warning" />
                Şube atamasını kaldır
              </DialogTitle>
              <DialogContent>
                <DialogContentText>
                  <strong>{selectedPersonnel.name}</strong> adlı personelin <strong>{branchName}</strong> şubesindeki atamasını kaldırmak istediğinize emin misiniz?
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseRemoveDialog} color="inherit">
                  İptal
                </Button>
                <Button onClick={handleRemoveBranchAssignment} color="error" variant="contained" autoFocus>
                  Şubeden Çıkar
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </ModalContent>
    </StyledModal>
  );
};

export default PersonnelDetailsModal; 