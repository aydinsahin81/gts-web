import React, { useState, useEffect } from 'react';
import {
  Box, 
  Typography,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

// Personel tipi
interface Personnel {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  branchesId?: string | { id?: string } | Record<string, any> | null;
}

// Vardiya tipi
interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  personnel?: Record<string, boolean>;
}

interface PersonelListesiProps {
  branchId?: string;
  isManager?: boolean;
}

const PersonelListesi: React.FC<PersonelListesiProps> = ({ branchId, isManager = false }) => {
  const { currentUser, userDetails } = useAuth();
  const [loading, setLoading] = useState(true);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [filteredPersonnel, setFilteredPersonnel] = useState<Personnel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  
  // Sayfalama için state değişkenleri
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  
  // Verileri yükleme
  useEffect(() => {
    const fetchData = async () => {
      if (!userDetails?.companyId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Personel verilerini getir
        const personnelRef = ref(database, `companies/${userDetails.companyId}/personnel`);
        const personnelSnapshot = await get(personnelRef);
        
        // Vardiya verilerini getir
        const shiftsRef = ref(database, `companies/${userDetails.companyId}/shifts`);
        const shiftsSnapshot = await get(shiftsRef);
        
        if (personnelSnapshot.exists() && shiftsSnapshot.exists()) {
          const personnelData = personnelSnapshot.val();
          const shiftsData = shiftsSnapshot.val();
          
          // Vardiyaları işle
          const shiftsArray: Shift[] = Object.entries(shiftsData).map(([id, data]: [string, any]) => ({
            id,
            name: data.name || 'İsimsiz Vardiya',
            startTime: data.startTime || '',
            endTime: data.endTime || '',
            personnel: data.personnel || {}
          }));
          
          setShifts(shiftsArray);
          
          // Personel listesini hazırla (silinen personelleri filtrele)
          let personnelArray: Personnel[] = Object.entries(personnelData)
            .filter(([_, personData]: [string, any]) => !personData.isDeleted)
            .map(([id, personData]: [string, any]) => ({
              id,
              name: personData.name || 'İsimsiz Personel',
              email: personData.email || '',
              phone: personData.phone || '',
              branchesId: personData.branchesId || personData.branchId || personData.branch || null
            }));
          
          // Şube yöneticisi ise (isManager=true), sadece kendi şubesindeki personeli göster
          if (isManager && branchId) {
            console.log(`Sadece şube ID'si ${branchId} olan personel filtreleniyor`);
            personnelArray = personnelArray.filter(person => {
              // Personelin şube bilgisi veritabanında farklı alanlarda olabilir
              const personBranchId = person.branchesId;
              
              if (!personBranchId) {
                return false;
              }
              
              if (typeof personBranchId === 'string') {
                // Şube ID'si string ise doğrudan karşılaştır
                return personBranchId === branchId;
              } else if (typeof personBranchId === 'object') {
                // Şube ID'si obje içinde ID olarak saklanıyor olabilir
                if ('id' in personBranchId && personBranchId.id === branchId) {
                  return true;
                }
                
                // Veya objenin kendisi branchId'nin kendisi olabilir
                return Object.keys(personBranchId).includes(branchId);
              }
              
              return false;
            });
            
            console.log(`Filtrelenen personel sayısı: ${personnelArray.length}`);
          }
          
          setPersonnel(personnelArray);
          setFilteredPersonnel(personnelArray);
        } else {
          setPersonnel([]);
          setFilteredPersonnel([]);
          setShifts([]);
        }
      } catch (error) {
        console.error("Veri yüklenirken hata:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userDetails, branchId, isManager]);
  
  // Personelin vardiyasını bul
  const getPersonnelShift = (personnelId: string): Shift | null => {
    return shifts.find(shift => 
      shift.personnel && Object.keys(shift.personnel).includes(personnelId)
    ) || null;
  };
  
  // Arama ve vardiya filtreleme
  useEffect(() => {
    let filtered = [...personnel];
    
    // İsim, email veya telefon araması
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(person => 
        person.name.toLowerCase().includes(term) || 
        (person.email && person.email.toLowerCase().includes(term)) ||
        (person.phone && person.phone.includes(term))
      );
    }
    
    // Vardiya filtresi
    if (selectedShift !== 'all') {
      if (selectedShift === 'unassigned') {
        // Vardiyası olmayanları göster
        filtered = filtered.filter(person => !getPersonnelShift(person.id));
      } else {
        // Belirli vardiyaya atananları göster
        filtered = filtered.filter(person => {
          const shift = getPersonnelShift(person.id);
          return shift?.id === selectedShift;
        });
      }
    }
    
    setFilteredPersonnel(filtered);
    setPage(0); // Filtre değiştiğinde sayfa numarasını sıfırla
  }, [searchTerm, selectedShift, personnel]);
  
  // Sayfa değişimi işleyicisi
  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  // Sayfa başına satır sayısı değişimi işleyicisi
  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Geçerli sayfada gösterilecek personelleri hesapla
  const currentPersonnel = filteredPersonnel.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Excel'e veri aktarma olayını dinle
  useEffect(() => {
    const handleExportToExcel = (event: CustomEvent) => {
      const { worksheet } = event.detail;
      
      // Filtrelenmiş personel verisini Excel'e ekle
      filteredPersonnel.forEach(person => {
        const shift = getPersonnelShift(person.id);
        
        worksheet.addRow({
          name: person.name,
          phone: person.phone || '-',
          email: person.email || '-',
          shift: shift ? `${shift.name} (${shift.startTime}-${shift.endTime})` : 'Vardiya Atanmamış'
        });
      });
    };
    
    // Event listener'ı ekle
    window.addEventListener('export-personel-to-excel', handleExportToExcel as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('export-personel-to-excel', handleExportToExcel as EventListener);
    };
  }, [filteredPersonnel]);
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Personel Listesi
        </Typography>
      </Box>
      
      {/* Filtreleme Alanı */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Personel Arama */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            placeholder="Personel Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        {/* Vardiya Filtresi */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="shift-filter-label">Vardiya Filtresi</InputLabel>
            <Select
              labelId="shift-filter-label"
              id="shift-filter"
              value={selectedShift}
              label="Vardiya Filtresi"
              onChange={(e) => setSelectedShift(e.target.value)}
            >
              <MenuItem value="all">Tüm Vardiyalar</MenuItem>
              <MenuItem value="unassigned">Vardiya Atanmamış</MenuItem>
              {shifts.map((shift) => (
                <MenuItem key={shift.id} value={shift.id}>
                  {shift.name} ({shift.startTime}-{shift.endTime})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {/* Personel Tablosu */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredPersonnel.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, bgcolor: '#f8f9fa', borderRadius: 2 }}>
          <Typography variant="body1" color="text.secondary">
            {searchTerm || selectedShift !== 'all' ? "Arama sonucu bulunamadı" : "Henüz personel bulunmuyor"}
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ 
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
            borderRadius: 2,
            maxHeight: '65vh'
          }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell width="30%">Ad Soyad</TableCell>
                  <TableCell width="20%">Telefon</TableCell>
                  <TableCell width="25%">E-posta</TableCell>
                  <TableCell width="25%">Vardiya</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentPersonnel.map((person) => {
                  const shift = getPersonnelShift(person.id);
                  
                  return (
                    <TableRow key={person.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar 
                            sx={{ 
                              width: 32, 
                              height: 32, 
                              bgcolor: shift ? 'primary.main' : 'grey.400',
                              mr: 1.5
                            }}
                          >
                            {person.name?.charAt(0) || 'P'}
                          </Avatar>
                          <Typography variant="body2" fontWeight="medium">
                            {person.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {person.phone || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ 
                          maxWidth: '180px', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {person.email || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {shift ? (
                          <Chip 
                            icon={<AccessTimeIcon fontSize="small" />}
                            label={`${shift.name} (${shift.startTime}-${shift.endTime})`}
                            size="small" 
                            color="primary"
                            sx={{ fontSize: '11px', height: 24 }}
                          />
                        ) : (
                          <Chip 
                            label="Vardiya Atanmamış" 
                            size="small" 
                            color="default"
                            variant="outlined"
                            sx={{ fontSize: '11px', height: 24 }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredPersonnel.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">
                        Personel bulunamadı
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Sayfalama Bileşeni */}
          <TablePagination
            component="div"
            count={filteredPersonnel.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="Sayfada göster:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} / ${count !== -1 ? count : `${to}'den fazla`}`
            }
          />
        </>
      )}
    </Box>
  );
};

export default PersonelListesi; 