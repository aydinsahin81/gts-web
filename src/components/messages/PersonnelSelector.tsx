import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Checkbox,
  TextField,
  InputAdornment,
  CircularProgress,
  styled,
  Chip
} from '@mui/material';
import { Personnel, getPersonFullName } from '../../services/NotificationService';
import SearchIcon from '@mui/icons-material/Search';
import FaceIcon from '@mui/icons-material/Face';
import FilterListIcon from '@mui/icons-material/FilterList';

// Özelleştirilmiş bileşenler
const StyledPaper = styled(Paper)(({ theme }) => ({
  height: '100%',
  borderRadius: theme.spacing(1),
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}));

const ScrollableList = styled(List)(({ theme }) => ({
  overflow: 'auto',
  flexGrow: 1,
  maxHeight: '450px',
  padding: 0,
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '8px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#bbb',
    borderRadius: '8px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#888',
  },
}));

const HeaderArea = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const FilterArea = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
}));

// Props türü
interface PersonnelSelectorProps {
  personnel: Personnel[];
  loading: boolean;
  onSelectionChange: (selectedIds: string[]) => void;
  selectedIds: string[];
}

const PersonnelSelector: React.FC<PersonnelSelectorProps> = ({
  personnel,
  loading,
  onSelectionChange,
  selectedIds
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [filteredPersonnel, setFilteredPersonnel] = useState<Personnel[]>([]);
  
  // Mevcut roller listesini oluştur
  const roles = Array.from(new Set(personnel.map(p => p.role).filter(Boolean) as string[]));
  
  // Personel listesini filtrele
  useEffect(() => {
    let result = [...personnel];
    
    // Arama terimini uygula
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        getPersonFullName(p).toLowerCase().includes(term) || 
        (p.email && p.email.toLowerCase().includes(term))
      );
    }
    
    // Rol filtresini uygula
    if (selectedRole) {
      result = result.filter(p => p.role === selectedRole);
    }
    
    setFilteredPersonnel(result);
  }, [personnel, searchTerm, selectedRole]);
  
  // Tüm personel seçme/seçimi kaldırma
  const handleToggleAll = () => {
    if (selectedIds.length === filteredPersonnel.length) {
      // Tüm seçimleri kaldır
      onSelectionChange([]);
    } else {
      // Tümünü seç
      onSelectionChange(filteredPersonnel.map(p => p.id));
    }
  };
  
  // Tek personel seçme/seçimi kaldırma
  const handleToggle = (id: string) => {
    const selectedIndex = selectedIds.indexOf(id);
    let newSelected = [...selectedIds];
    
    if (selectedIndex === -1) {
      newSelected.push(id);
    } else {
      newSelected.splice(selectedIndex, 1);
    }
    
    onSelectionChange(newSelected);
  };
  
  // Rol filtresini temizle
  const clearRoleFilter = () => {
    setSelectedRole(null);
  };
  
  return (
    <StyledPaper elevation={0}>
      <HeaderArea>
        <Typography variant="h6" gutterBottom>
          Alıcı Personel
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {selectedIds.length > 0 
            ? `${selectedIds.length} personel seçildi` 
            : 'Mesaj göndermek için personel seçin'}
        </Typography>
      </HeaderArea>
      
      <Box sx={{ px: 2, pt: 2 }}>
        <TextField 
          fullWidth
          placeholder="İsim veya e-posta ile ara"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
      </Box>
      
      {roles.length > 0 && (
        <FilterArea>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterListIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">Filtrele:</Typography>
          </Box>
          
          {roles.map(role => (
            <Chip 
              key={role}
              label={role}
              size="small"
              onClick={() => setSelectedRole(role === selectedRole ? null : role)}
              color={role === selectedRole ? "primary" : "default"}
              variant={role === selectedRole ? "filled" : "outlined"}
            />
          ))}
          
          {selectedRole && (
            <Chip 
              label="Filtreyi Temizle"
              size="small"
              onDelete={clearRoleFilter}
              color="default"
            />
          )}
        </FilterArea>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredPersonnel.length > 0 ? (
        <>
          <ListItem disablePadding>
            <ListItemButton role={undefined} onClick={handleToggleAll} dense>
              <ListItemAvatar>
                <Checkbox
                  edge="start"
                  checked={selectedIds.length === filteredPersonnel.length && filteredPersonnel.length > 0}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < filteredPersonnel.length}
                  tabIndex={-1}
                  disableRipple
                  inputProps={{ 'aria-labelledby': 'select-all-personnel' }}
                />
              </ListItemAvatar>
              <ListItemText 
                id="select-all-personnel"
                primary="Tümünü Seç"
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>
          
          <ScrollableList>
            {filteredPersonnel.map((person) => {
              const isSelected = selectedIds.indexOf(person.id) !== -1;
              const labelId = `personnel-list-item-${person.id}`;
              const fullName = getPersonFullName(person);
              
              return (
                <ListItem 
                  key={person.id} 
                  disablePadding
                >
                  <ListItemButton 
                    role={undefined} 
                    onClick={() => handleToggle(person.id)} 
                    dense
                  >
                    <ListItemAvatar>
                      <Checkbox
                        edge="start"
                        checked={isSelected}
                        tabIndex={-1}
                        disableRipple
                        inputProps={{ 'aria-labelledby': labelId }}
                      />
                    </ListItemAvatar>
                    <ListItemAvatar>
                      <Avatar>
                        {person.firstName[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      id={labelId}
                      primary={fullName}
                      secondary={
                        <React.Fragment>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {person.role || ''}
                          </Typography>
                          {person.email && ` — ${person.email}`}
                        </React.Fragment>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </ScrollableList>
        </>
      ) : (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {searchTerm || selectedRole 
              ? 'Aramanızla eşleşen personel bulunamadı.' 
              : 'Hiç personel bulunamadı.'}
          </Typography>
        </Box>
      )}
    </StyledPaper>
  );
};

export default PersonnelSelector; 