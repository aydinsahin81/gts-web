import React, { useState } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Paper,
  Avatar,
  Chip,
  Divider,
  Alert,
  AlertTitle,
  Collapse
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Person as PersonIcon
} from '@mui/icons-material';

interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  task: any;
  onDelete: (taskId: string, personnelId: string) => Promise<void>;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusLabel: (status: string) => string;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ 
  open, 
  onClose, 
  task, 
  onDelete,
  getStatusColor,
  getStatusIcon,
  getStatusLabel 
}) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!task) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      await onDelete(task.id, task.personnelId);
      onClose();
    } catch (err) {
      setError('Görev silinirken bir hata oluştu. Lütfen tekrar deneyin.');
      console.error('Görev silme hatası:', err);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  if (!task) return null;

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
        <Typography variant="h6" fontWeight="bold">Görev Detayları</Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 3 }}>
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
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Avatar
                sx={{
                  bgcolor: `${getStatusColor(task.status)}20`,
                  color: getStatusColor(task.status),
                  mr: 2
                }}
              >
                {getStatusIcon(task.status)}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="bold">{task.name}</Typography>
                <Chip
                  label={getStatusLabel(task.status)}
                  size="small"
                  sx={{
                    bgcolor: `${getStatusColor(task.status)}20`,
                    color: getStatusColor(task.status),
                    fontWeight: 'medium',
                    mt: 0.5
                  }}
                />
              </Box>
            </Box>
          </Paper>
        </Box>

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Açıklama
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            mb: 3
          }}
        >
          <Typography variant="body2">
            {task.description || 'Açıklama yok'}
          </Typography>
        </Paper>

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Detaylar
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            mb: 3
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PersonIcon fontSize="small" sx={{ color: 'primary.main', mr: 1 }} />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Atanan Personel
              </Typography>
              <Typography variant="body2">
                {task.personnelName}
              </Typography>
            </Box>
          </Box>

          {task.isRecurring && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Tekrarlı Görev Bilgileri
              </Typography>
              
              {task.repetitionTimes && task.repetitionTimes.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Tekrar saatleri:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {task.repetitionTimes.slice(0, 3).map((time: string, index: number) => (
                      <Chip
                        key={index}
                        label={time}
                        size="small"
                        sx={{
                          bgcolor: '#03A9F420',
                          color: '#03A9F4',
                          fontSize: '0.7rem',
                          height: 20
                        }}
                      />
                    ))}
                    {task.repetitionTimes.length > 3 && (
                      <Chip
                        label={`+${task.repetitionTimes.length - 3}`}
                        size="small"
                        sx={{
                          bgcolor: '#03A9F420',
                          color: '#03A9F4',
                          fontSize: '0.7rem',
                          height: 20
                        }}
                      />
                    )}
                  </Box>
                </Box>
              )}
            </>
          )}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteConfirmOpen(true)}
          disabled={isDeleting}
        >
          {isDeleting ? 'Siliniyor...' : 'Görevi Sil'}
        </Button>
      </DialogActions>

      {/* Silme Onay Diyaloğu */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
          Dikkat: Görevi Sil
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography>
            <strong>{task.name}</strong> görevini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)} 
            disabled={isDeleting}
          >
            İptal
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default TaskDetailModal; 