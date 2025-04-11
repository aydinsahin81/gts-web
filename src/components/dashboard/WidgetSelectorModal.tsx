import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Typography,
  Box,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface Widget {
  id: string;
  title: string;
  description: string;
}

interface WidgetSelectorModalProps {
  open: boolean;
  onClose: () => void;
  selectedWidgets: string[];
  onWidgetSelectionChange: (widgetId: string) => void;
  widgets: Widget[];
}

const WidgetSelectorModal: React.FC<WidgetSelectorModalProps> = ({
  open,
  onClose,
  selectedWidgets,
  onWidgetSelectionChange,
  widgets
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '60vh'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            Widget'ları Yönet
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Gösterilmesini istediğiniz widget'ları seçin. Seçtiğiniz widget'lar dashboard'da görüntülenecektir.
        </Typography>
        
        <List>
          {widgets.map((widget) => (
            <ListItem 
              key={widget.id}
              button
              onClick={() => onWidgetSelectionChange(widget.id)}
              sx={{
                borderRadius: 1,
                mb: 1,
                '&:hover': {
                  backgroundColor: 'action.hover',
                }
              }}
            >
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={selectedWidgets.includes(widget.id)}
                  tabIndex={-1}
                  disableRipple
                />
              </ListItemIcon>
              <ListItemText
                primary={widget.title}
                secondary={widget.description}
                primaryTypographyProps={{
                  fontWeight: 'medium'
                }}
                secondaryTypographyProps={{
                  variant: 'body2',
                  color: 'text.secondary'
                }}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Kapat
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WidgetSelectorModal; 