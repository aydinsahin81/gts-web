import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  TextField,
  InputAdornment,
  Chip,
  Button,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { Personnel } from '../../services/NotificationService';

interface PersonnelSelectorProps {
  personnel: Personnel[];
  loading: boolean;
  error?: string;
  onSelectionChange: (selectedIds: string[]) => void;
  selectedIds?: string[];
}

const PersonnelSelector: React.FC<PersonnelSelectorProps> = ({
  personnel,
  loading,
  error,
  onSelectionChange,
  selectedIds = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<string[]>(selectedIds);

  // Seçilen personel listesi değiştiğinde dışarıdan bildirme
  useEffect(() => {
    onSelectionChange(selected);
  }, [selected, onSelectionChange]);

  // Dışarıdan gelen seçimler değiştiğinde state'i güncelleme
  useEffect(() => {
    setSelected(selectedIds);
  }, [selectedIds]);

  // Tüm personel seçme/kaldırma
  const handleToggleAll = () => {
    if (selected.length === filteredPersonnel.length) {
      setSelected([]);
    } else {
      setSelected(filteredPersonnel.map(person => person.id));
    }
  };

  // Tek personel seçme/kaldırma
  const handleToggle = (id: string) => {
    const currentIndex = selected.indexOf(id);
    const newSelected = [...selected];

    if (currentIndex === -1) {
      newSelected.push(id);
    } else {
      newSelected.splice(currentIndex, 1);
    }

    setSelected(newSelected);
  };

  // Arama terimlerine göre filtreleme
  const filteredPersonnel = personnel.filter(person => {
    const fullName = `${person.firstName} ${person.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  // Tüm personel seçili mi kontrolü
  const allSelected = filteredPersonnel.length > 0 && 
    filteredPersonnel.length === selected.filter(id => 
      filteredPersonnel.some(person => person.id === id)
    ).length;

  return (
    <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Personel Seçimi
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Bildirim göndermek istediğiniz personelleri seçin.
        </Typography>

        {/* Arama ve seçim araçları */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            placeholder="Personel ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button 
            variant="outlined"
            size="small"
            onClick={handleToggleAll}
            disabled={filteredPersonnel.length === 0}
          >
            {allSelected ? 'Tümünü Kaldır' : 'Tümünü Seç'}
          </Button>
        </Box>

        {/* Seçili personel sayısı */}
        {selected.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
            <NotificationsIcon color="primary" fontSize="small" sx={{ mr: 1 }} />
            <Chip 
              label={`${selected.length} Personel Seçildi`} 
              color="primary" 
              size="small" 
            />
          </Box>
        )}
      </Box>

      {/* Hata mesajı */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* Personel listesi */}
      <List 
        sx={{ 
          maxHeight: 400, 
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '4px',
          },
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={30} />
          </Box>
        ) : filteredPersonnel.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchTerm 
                ? 'Aramanızla eşleşen personel bulunamadı.' 
                : 'Henüz personel bulunmamaktadır.'}
            </Typography>
          </Box>
        ) : (
          filteredPersonnel.map((person) => {
            const isSelected = selected.indexOf(person.id) !== -1;
            
            return (
              <ListItem 
                key={person.id} 
                dense 
                onClick={() => handleToggle(person.id)}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: isSelected ? 'action.selected' : 'inherit',
                  cursor: 'pointer'
                }}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={isSelected}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: isSelected ? 'primary.main' : 'grey.400' }}>
                    {person.firstName[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${person.firstName} ${person.lastName}`}
                  secondary={person.role || person.department || person.email || ''}
                />
                {!person.fcmToken && (
                  <Chip
                    label="FCM yok"
                    size="small"
                    color="warning"
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                )}
              </ListItem>
            );
          })
        )}
      </List>
    </Paper>
  );
};

export default PersonnelSelector; 