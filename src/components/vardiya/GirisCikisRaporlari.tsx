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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Stack
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { ref, get, onValue } from 'firebase/database';
import { database } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const GirisCikisRaporlari: React.FC = () => {
  const { currentUser, userDetails } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [personnelData, setPersonnelData] = useState<{[key: string]: any}>({});

  // Veritabanından vardiya giriş/çıkış raporlarını real-time olarak çek
  useEffect(() => {
    if (!userDetails?.companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Son 30 günün tarihini hesapla
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    // Personel verilerini çek
    const personnelRef = ref(database, `companies/${userDetails.companyId}/personnel`);
    const personnelUnsubscribe = onValue(personnelRef, (personnelSnapshot) => {
      const personnelObj: {[key: string]: any} = {};
      
      if (personnelSnapshot.exists()) {
        const personnelData = personnelSnapshot.val();
        Object.keys(personnelData).forEach(id => {
          personnelObj[id] = personnelData[id];
        });
      }
      
      setPersonnelData(personnelObj);
      
      // Vardiya listesini çek
      const vardiyaListesiRef = ref(database, `companies/${userDetails.companyId}/vardiyaListesi`);
      const vardiyaUnsubscribe = onValue(vardiyaListesiRef, (vardiyaListesiSnapshot) => {
        if (!vardiyaListesiSnapshot.exists()) {
          setReports([]);
          setLoading(false);
          return;
        }
        
        const vardiyaListesi = vardiyaListesiSnapshot.val();
        const reportsList: any[] = [];
        
        // Tarih bazlı verileri işle
        Object.keys(vardiyaListesi).forEach(date => {
          // Tarih string'ini Date nesnesine çevir (dd-MM-yyyy)
          const dateParts = date.split('-');
          if (dateParts.length !== 3) return; // Geçersiz tarih formatı
          
          const day = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1; // JavaScript ayları 0'dan başlar
          const year = parseInt(dateParts[2], 10);
          
          const dateObj = new Date(year, month, day);
          
          // Son 30 gün kontrolü
          if (dateObj >= thirtyDaysAgo) {
            const dateData = vardiyaListesi[date];
            
            // Her tarih için personel bazlı verileri işle
            Object.keys(dateData).forEach(personelId => {
              const record = dateData[personelId];
              
              // Unix timestamp'i saat:dakika formatına dönüştür
              const formatTime = (timestamp: number) => {
                if (!timestamp) return '--:--';
                const date = new Date(timestamp);
                return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
              };
              
              // Durum bilgilerini belirle
              const statusInfo = {
                entryStatus: '',
                exitStatus: ''
              };
              
              // Giriş durumu kontrolü - veritabanından direkt olarak al
              if (record.girisDurumu) {
                // Veritabanındaki değeri görüntüleme için dönüştür
                switch (record.girisDurumu) {
                  case 'early':
                    statusInfo.entryStatus = 'Erken Geldi';
                    break;
                  case 'late':
                    statusInfo.entryStatus = 'Geç Geldi';
                    break;
                  case 'giriş yapılmamış':
                    statusInfo.entryStatus = 'Giriş Yapılmamış';
                    break;
                  case 'normal':
                    statusInfo.entryStatus = 'Normal Geldi';
                    break;
                  default:
                    // Diğer durumlarda doğrudan değeri al
                    statusInfo.entryStatus = record.girisDurumu;
                }
              } else {
                // Giriş durumu yoksa
                statusInfo.entryStatus = 'Giriş Durumu Belirsiz';
              }
              
              // Çıkış durumu kontrolü - veritabanından direkt olarak al
              if (record.cikisZamani) {
                if (record.cikisDurumu) {
                  // Veritabanındaki değeri görüntüleme için dönüştür
                  switch (record.cikisDurumu) {
                    case 'earlyExit':
                      statusInfo.exitStatus = 'Erken Çıktı';
                      break;
                    case 'çıkış yapılmamış':
                      statusInfo.exitStatus = 'Çıkış Yapılmamış';
                      break;
                    case 'normal':
                      statusInfo.exitStatus = 'Normal Çıktı';
                      break;
                    default:
                      // Diğer durumlarda doğrudan değeri al
                      statusInfo.exitStatus = record.cikisDurumu;
                  }
                } else {
                  statusInfo.exitStatus = 'Çıkış Durumu Belirsiz';
                }
              } else {
                // Çıkış kaydı yoksa
                statusInfo.exitStatus = 'Devam Ediyor';
              }
              
              // Personel bilgisini bul
              const personnel = personnelObj[personelId] || { name: '' };
              const personnelName = personnel.name || personelId;
              
              reportsList.push({
                id: `${date}_${personelId}`,
                personnel: personnelName,
                personnelId: personelId,
                shift: record.vardiyaAdi || 'Bilinmeyen Vardiya',
                date: date,
                checkIn: formatTime(record.girisZamani),
                checkOut: record.cikisZamani ? formatTime(record.cikisZamani) : '--:--',
                statusInfo: statusInfo,
                originalRecord: record
              });
            });
          }
        });
        
        // Tarihe göre sırala (en yeni en üstte)
        reportsList.sort((a, b) => {
          // Tarih string'ini Date nesnesine çevir (dd-MM-yyyy)
          const aDateParts = a.date.split('-');
          const bDateParts = b.date.split('-');
          
          const aDate = new Date(
            parseInt(aDateParts[2], 10),
            parseInt(aDateParts[1], 10) - 1,
            parseInt(aDateParts[0], 10)
          );
          
          const bDate = new Date(
            parseInt(bDateParts[2], 10),
            parseInt(bDateParts[1], 10) - 1,
            parseInt(bDateParts[0], 10)
          );
          
          // Daha yeni tarihler önce gösterilecek
          return bDate.getTime() - aDate.getTime();
        });
        
        setReports(reportsList);
        setLoading(false);
      }, (error) => {
        console.error("Vardiya raporları yüklenirken hata:", error);
        setLoading(false);
      });
      
      return () => vardiyaUnsubscribe();
    }, (error) => {
      console.error("Personel verileri yüklenirken hata:", error);
      setLoading(false);
    });
    
    return () => personnelUnsubscribe();
  }, [userDetails]);

  // Filtreleme işlemi
  useEffect(() => {
    let filtered = [...reports];
    
    // Personel veya vardiya araması
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(report => 
        report.personnel.toLowerCase().includes(term) || 
        report.shift.toLowerCase().includes(term)
      );
    }
    
    // Durum filtresi
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => {
        const { entryStatus, exitStatus } = report.statusInfo;
        return entryStatus === statusFilter || exitStatus === statusFilter;
      });
    }
    
    setFilteredReports(filtered);
  }, [searchTerm, statusFilter, reports]);

  // Excel'e veri aktarma olayını dinle
  useEffect(() => {
    const handleExportToExcel = (event: CustomEvent) => {
      const { worksheet } = event.detail;
      
      // Filtrelenmiş rapor verilerini Excel'e ekle
      filteredReports.forEach(report => {
        // Durum bilgisini oluştur
        let statusText = '';
        const { entryStatus, exitStatus } = report.statusInfo;
        
        if (entryStatus) statusText = entryStatus;
        if (exitStatus) {
          statusText = statusText ? `${statusText} & ${exitStatus}` : exitStatus;
        }
        
        worksheet.addRow({
          personnel: report.personnel,
          shift: report.shift,
          date: report.date,
          checkIn: report.checkIn,
          checkOut: report.checkOut,
          status: statusText
        });
      });
    };
    
    // Event listener'ı ekle
    window.addEventListener('export-report-to-excel', handleExportToExcel as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('export-report-to-excel', handleExportToExcel as EventListener);
    };
  }, [filteredReports]);

  // Durum rengini belirle
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Normal Geldi':
      case 'Normal Çıktı':
        return 'success';
      case 'Erken Geldi':
        return 'info';
      case 'Geç Geldi':
        return 'warning';
      case 'Erken Çıktı':
        return 'warning';
      case 'Devam Ediyor':
        return 'info';
      case 'Giriş Yapılmamış':
      case 'Çıkış Yapılmamış':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Giriş Çıkış Raporları
        </Typography>
      </Box>
      
      {/* Filtreleme Alanı */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Personel/Vardiya Arama */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            placeholder="Personel veya Vardiya Ara..."
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
        
        {/* Durum Filtresi */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="status-filter-label">Durum Filtresi</InputLabel>
            <Select
              labelId="status-filter-label"
              id="status-filter"
              value={statusFilter}
              label="Durum Filtresi"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">Tüm Durumlar</MenuItem>
              <MenuItem value="Normal Geldi">Normal Geldi</MenuItem>
              <MenuItem value="Erken Geldi">Erken Geldi</MenuItem>
              <MenuItem value="Geç Geldi">Geç Geldi</MenuItem>
              <MenuItem value="Normal Çıktı">Normal Çıktı</MenuItem>
              <MenuItem value="Erken Çıktı">Erken Çıktı</MenuItem>
              <MenuItem value="Devam Ediyor">Devam Ediyor</MenuItem>
              <MenuItem value="Giriş Yapılmamış">Giriş Yapılmamış</MenuItem>
              <MenuItem value="Çıkış Yapılmamış">Çıkış Yapılmamış</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {/* Rapor Tablosu */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredReports.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, bgcolor: '#f8f9fa', borderRadius: 2 }}>
          <Typography variant="body1" color="text.secondary">
            {searchTerm || statusFilter !== 'all' ? "Arama sonucu bulunamadı" : "Henüz rapor bulunmuyor"}
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ 
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
          borderRadius: 2
        }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width="25%">Personel</TableCell>
                <TableCell width="20%">Vardiya</TableCell>
                <TableCell width="15%">Tarih</TableCell>
                <TableCell width="10%">Giriş</TableCell>
                <TableCell width="10%">Çıkış</TableCell>
                <TableCell width="20%">Durum</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReports.map((report) => (
                <TableRow key={report.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar 
                        sx={{ 
                          width: 32, 
                          height: 32, 
                          bgcolor: 'primary.main',
                          mr: 1.5
                        }}
                      >
                        <PersonIcon fontSize="small" />
                      </Avatar>
                      <Typography variant="body2" fontWeight="medium">
                        {report.personnel}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {report.shift}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {report.date}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {report.checkIn}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {report.checkOut}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {report.statusInfo.entryStatus && (
                        <Chip 
                          label={report.statusInfo.entryStatus}
                          size="small" 
                          color={getStatusColor(report.statusInfo.entryStatus)}
                          sx={{ fontSize: '11px', height: 24, mb: 0.5 }}
                        />
                      )}
                      {report.statusInfo.exitStatus && (
                        <Chip 
                          label={report.statusInfo.exitStatus}
                          size="small" 
                          color={getStatusColor(report.statusInfo.exitStatus)}
                          sx={{ fontSize: '11px', height: 24, mb: 0.5 }}
                        />
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default GirisCikisRaporlari; 