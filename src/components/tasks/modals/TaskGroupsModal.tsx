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
  Collapse
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { ref, push, set, remove } from 'firebase/database';
import { database } from '../../../firebase';

interface TaskGroupsModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  taskGroups: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
}

const TaskGroupsModal: React.FC<TaskGroupsModalProps> = ({
  open,
  onClose,
  companyId,
  taskGroups = []
}) => {
  const [groupName, setGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form sıfırlama
  const resetForm = () => {
    setGroupName('');
    setError(null);
  };

  // Modal kapandığında formu sıfırla
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

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

  // Grup silme işlemi
  const handleDeleteGroup = async (groupId: string) => {
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
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
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
            <Button
              variant="contained"
              color="primary"
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
              onClick={handleAddGroup}
              disabled={isSubmitting}
              sx={{ height: 56, minWidth: 120 }}
            >
              Ekle
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Grup listesi */}
        <Typography variant="h6" color="primary" fontWeight="medium" gutterBottom>
          Mevcut Gruplar
        </Typography>
        
        {taskGroups.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
            <CategoryIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
            <Typography>Henüz hiç grup eklenmemiş</Typography>
          </Box>
        ) : (
          <List sx={{ 
            maxHeight: 300, 
            overflow: 'auto',
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider'
          }}>
            {taskGroups.map((group) => (
              <React.Fragment key={group.id}>
                <ListItem>
                  <ListItemText
                    primary={group.name}
                    secondary={`Oluşturulma: ${new Date(group.createdAt).toLocaleString()}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      aria-label="delete"
                      onClick={() => handleDeleteGroup(group.id)}
                      disabled={isSubmitting}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
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