import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Box,
  Pagination,
  useTheme,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  AssignmentOutlined as TaskIcon,
  Person as PersonIcon
} from '@mui/icons-material';

interface CompletedTasksModalProps {
  open: boolean;
  onClose: () => void;
  tasks: any[];
}

const CompletedTasksModal: React.FC<CompletedTasksModalProps> = ({ open, onClose, tasks }) => {
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const theme = useTheme();

  // Toplam sayfa sayısını hesapla
  const totalPages = Math.ceil(tasks.length / itemsPerPage);
  
  // Mevcut sayfadaki görevleri hesapla
  const currentTasks = tasks.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Sayfa değişikliği
  const handleChangePage = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Typography variant="h6" fontWeight="bold">
          Tamamlanan Tüm Görevler
        </Typography>
        <IconButton edge="end" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ pt: 2, minHeight: 400 }}>
        {tasks.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: 300 
          }}>
            <Typography color="textSecondary">
              Tamamlanan görev bulunmuyor
            </Typography>
          </Box>
        ) : (
          <>
            <List>
              {currentTasks.map((task) => (
                <ListItem key={task.id} divider>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#4CAF50' }}>
                      <TaskIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Typography fontWeight="medium">{task.name}</Typography>
                        <Chip 
                          icon={<PersonIcon fontSize="small" />} 
                          label={task.personnelName} 
                          size="small"
                          sx={{ 
                            bgcolor: theme.palette.grey[100],
                            '& .MuiChip-icon': { color: theme.palette.success.main }
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.secondary">
                          {`${task.time} - ${task.date}`}
                        </Typography>
                        {task.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                            {task.description}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              mt: 2, 
              pb: 2 
            }}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handleChangePage} 
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CompletedTasksModal; 