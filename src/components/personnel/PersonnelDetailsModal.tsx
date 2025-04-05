import React from 'react';
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
} from '@mui/material';
import {
  Person as PersonIcon,
  EmailOutlined as EmailIcon,
  PhoneAndroid as PhoneIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

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
          </>
        )}
      </ModalContent>
    </StyledModal>
  );
};

export default PersonnelDetailsModal; 