import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Modal,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Radio,
  Alert,
  CircularProgress,
  styled,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  Business as BusinessIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { ref, get, update } from 'firebase/database';
import { database, auth } from '../../firebase';

// Modal için styled component
const StyledModal = styled(Modal)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const ModalContent = styled(Paper)(({ theme }) => ({
  position: 'relative',
  width: '90%',
  maxWidth: 500,
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

interface PersonnelBranchTransferModalProps {
  open: boolean;
  onClose: () => void;
  personnelId: string;
  personnelName: string;
  currentBranchId: string | null;
}

const PersonnelBranchTransferModal: React.FC<PersonnelBranchTransferModalProps> = ({
  open,
  onClose,
  personnelId,
  personnelName,
  currentBranchId
}) => {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(currentBranchId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [currentBranchName, setCurrentBranchName] = useState<string>('');
  const [confirmRemoveDialogOpen, setConfirmRemoveDialogOpen] = useState(false);

  // Şube verilerini yükle
  useEffect(() => {
    if (open) {
      loadBranches();
    }
  }, [open]);

  const loadBranches = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Kullanıcı oturumu bulunamadı');
      }
      
      // Şirket ID'sini al
      const userRef = ref(database, `users/${user.uid}`);
      const userSnapshot = await get(userRef);
      
      if (!userSnapshot.exists()) {
        throw new Error('Kullanıcı verileri bulunamadı');
      }
      
      const userData = userSnapshot.val();
      const userCompanyId = userData.companyId;
      setCompanyId(userCompanyId);
      
      if (!userCompanyId) {
        throw new Error('Şirket bilgisi bulunamadı');
      }
      
      // Şubeleri al
      const branchesRef = ref(database, `companies/${userCompanyId}/branches`);
      const branchesSnapshot = await get(branchesRef);
      
      if (!branchesSnapshot.exists()) {
        setBranches([]);
        return;
      }
      
      const branchesData = branchesSnapshot.val();
      const branchesList = Object.entries(branchesData).map(([id, data]: [string, any]) => ({
        id,
        name: data.name,
        address: data.address,
        phone: data.phone
      }));
      
      // Şubeleri isme göre sırala
      setBranches(branchesList.sort((a, b) => a.name.localeCompare(b.name)));
      
      // Mevcut şube ID'si varsa seçili yap ve şube adını bul
      if (currentBranchId) {
        setSelectedBranch(currentBranchId);
        const currentBranch = branchesList.find(branch => branch.id === currentBranchId);
        if (currentBranch) {
          setCurrentBranchName(currentBranch.name);
        }
      }
    } catch (error) {
      console.error('Şubeler yüklenirken hata:', error);
      setError('Şubeler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Şube seçme işlemi
  const handleSelectBranch = (branchId: string) => {
    setSelectedBranch(branchId);
  };

  // Şube aktarma işlemi
  const handleTransferToBranch = async () => {
    if (!selectedBranch || !personnelId || !companyId) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Personel verisini güncelle
      const personnelRef = ref(database, `companies/${companyId}/personnel/${personnelId}`);
      await update(personnelRef, {
        branchesId: selectedBranch
      });
      
      // Kullanıcı verisini güncelle
      const userRef = ref(database, `users/${personnelId}`);
      await update(userRef, {
        branchesId: selectedBranch
      });
      
      // Mevcut şube adını bul
      const selectedBranchObj = branches.find(branch => branch.id === selectedBranch);
      const branchName = selectedBranchObj ? selectedBranchObj.name : 'Seçilen şube';
      
      setSuccess(`Personel "${branchName}" şubesine başarıyla aktarıldı`);
      
      // 2 saniye sonra modalı kapat
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Şubeye aktarma hatası:', error);
      setError('Personel şubeye aktarılırken bir hata oluştu');
    } finally {
      setSaving(false);
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
    if (!personnelId || !companyId) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    setConfirmRemoveDialogOpen(false);
    
    try {
      // Personel verisini güncelle
      const personnelRef = ref(database, `companies/${companyId}/personnel/${personnelId}`);
      await update(personnelRef, {
        branchesId: null
      });
      
      // Kullanıcı verisini güncelle
      const userRef = ref(database, `users/${personnelId}`);
      await update(userRef, {
        branchesId: null
      });
      
      setSelectedBranch(null);
      setSuccess(`Personelin "${currentBranchName}" şubesinden ataması kaldırıldı`);
      
      // 2 saniye sonra modalı kapat
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Şube ataması kaldırma hatası:', error);
      setError('Şube ataması kaldırılırken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <StyledModal
        open={open}
        onClose={onClose}
        aria-labelledby="şube-aktarma-modal"
      >
        <ModalContent>
          <ModalHeader>
            <Typography variant="h6" fontWeight="bold">
              Personeli Şubeye Aktar
            </Typography>
            <IconButton onClick={onClose} disabled={saving}>
              <CloseIcon />
            </IconButton>
          </ModalHeader>
          
          <Typography variant="subtitle1" gutterBottom>
            <strong>{personnelName}</strong> adlı personelin çalışacağı şubeyi seçin.
          </Typography>
          
          {currentBranchId && (
            <Alert 
              severity="info" 
              sx={{ mb: 2 }}
            >
              Bu personel şu anda <strong>{currentBranchName}</strong> şubesinde çalışıyor.
            </Alert>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : branches.length === 0 ? (
            <Alert severity="info" sx={{ my: 2 }}>
              Kayıtlı şube bulunamadı. Önce şube eklemelisiniz.
            </Alert>
          ) : (
            <List
              sx={{
                maxHeight: 300,
                overflow: 'auto',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mt: 2
              }}
            >
              {branches.map((branch) => (
                <React.Fragment key={branch.id}>
                  <ListItem disablePadding>
                    <ListItemButton 
                      onClick={() => handleSelectBranch(branch.id)}
                      selected={selectedBranch === branch.id}
                    >
                      <ListItemIcon>
                        <Radio 
                          checked={selectedBranch === branch.id} 
                          onChange={() => handleSelectBranch(branch.id)}
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={branch.name} 
                        secondary={
                          <>
                            <Typography variant="body2" component="span">{branch.address}</Typography>
                            {branch.id === currentBranchId && (
                              <Typography 
                                variant="body2" 
                                component="span" 
                                sx={{ 
                                  color: 'success.main',
                                  fontWeight: 'bold',
                                  display: 'block'
                                }}
                              >
                                (Mevcut şube)
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={onClose}
              disabled={saving}
            >
              {currentBranchId ? 'Vazgeç' : 'İptal'}
            </Button>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              {currentBranchId && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleOpenRemoveDialog}
                  disabled={saving}
                  startIcon={<DeleteIcon />}
                >
                  Şubeden Çıkar
                </Button>
              )}
              <Button
                variant="contained"
                color="primary"
                onClick={handleTransferToBranch}
                disabled={!selectedBranch || saving || loading || (selectedBranch === currentBranchId)}
                startIcon={<BusinessIcon />}
              >
                {saving ? <CircularProgress size={24} /> : 'Şubeye Aktar'}
              </Button>
            </Box>
          </Box>
        </ModalContent>
      </StyledModal>
      
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
            <strong>{personnelName}</strong> adlı personelin <strong>{currentBranchName}</strong> şubesindeki atamasını kaldırmak istediğinize emin misiniz?
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
  );
};

export default PersonnelBranchTransferModal; 