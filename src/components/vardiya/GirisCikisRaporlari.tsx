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
  Stack,
  Tooltip,
  IconButton,
  Collapse
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FilterListIcon from '@mui/icons-material/FilterList';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { ref, get, onValue } from 'firebase/database';
import { database } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import VardiyaZamanDuzenleModal from './VardiyaZamanDuzenleModal';

interface GirisCikisRaporlariProps {
  branchId?: string;
  isManager?: boolean;
}

const GirisCikisRaporlari: React.FC<GirisCikisRaporlariProps> = ({ branchId, isManager = false }) => {
  const { currentUser, userDetails } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [personnelData, setPersonnelData] = useState<{[key: string]: any}>({});
  
  // Vardiya zaman düzenleme modalı için state
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filtre görünürlüğü için state
  const [showFilters, setShowFilters] = useState(true);

  // Modal işlemleri
  const handleOpenModal = (report: any) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };

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
              
              // Personel bilgisini bul
              const personnel = personnelObj[personelId] || { name: '' };
              
              // Şube yöneticisi için sadece kendi şubesindeki personelin kayıtlarını göster
              if (isManager && branchId) {
                const personBranchId = personnel.branchesId || personnel.branchId || personnel.branch;
                
                let isPersonInBranch = false;
                
                if (typeof personBranchId === 'string') {
                  isPersonInBranch = personBranchId === branchId;
                } else if (personBranchId && typeof personBranchId === 'object') {
                  // 'id' özelliği var mı kontrol et
                  if ('id' in personBranchId && personBranchId.id === branchId) {
                    isPersonInBranch = true;
                  } 
                  // Veya objenin kendisi branchId'yi içeriyor olabilir
                  else if (Object.keys(personBranchId).includes(branchId)) {
                    isPersonInBranch = true;
                  }
                }
                
                // Eğer personel bu şubede değilse, bu kaydı atla
                if (!isPersonInBranch) {
                  return;
                }
              }
              
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
                // Büyük/küçük harf duyarsız kontrol için değeri küçük harfe çevirelim
                const girisDurumuLower = record.girisDurumu.toLowerCase();
                
                // Veritabanındaki değeri görüntüleme için dönüştür
                if (girisDurumuLower === 'early') {
                  statusInfo.entryStatus = 'Erken Geldi';
                } else if (girisDurumuLower === 'late') {
                  statusInfo.entryStatus = 'Geç Geldi';
                } else if (girisDurumuLower === 'giriş yapılmamış') {
                  statusInfo.entryStatus = 'Giriş Yapılmamış';
                } else if (girisDurumuLower === 'normal') {
                  statusInfo.entryStatus = 'Normal Geldi';
                } else if (girisDurumuLower === 'ontime' || girisDurumuLower === 'on-time' || girisDurumuLower === 'on_time') {
                  statusInfo.entryStatus = 'Normal Giriş';
                } else {
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
                  // Büyük/küçük harf duyarsız kontrol için değeri küçük harfe çevirelim
                  const cikisDurumuLower = record.cikisDurumu.toLowerCase();
                  
                  // Veritabanındaki değeri görüntüleme için dönüştür
                  if (cikisDurumuLower === 'earlyexit' || cikisDurumuLower === 'early-exit' || cikisDurumuLower === 'early_exit') {
                    statusInfo.exitStatus = 'Erken Çıktı';
                  } else if (cikisDurumuLower === 'çıkış yapılmamış') {
                    statusInfo.exitStatus = 'Çıkış Yapılmamış';
                  } else if (cikisDurumuLower === 'normal') {
                    statusInfo.exitStatus = 'Normal Çıktı';
                  } else if (cikisDurumuLower === 'complete' || cikisDurumuLower === 'completed') {
                    statusInfo.exitStatus = 'Vardiya Tamamlandı';
                  } else {
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
  }, [userDetails, isManager, branchId]);

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
      case 'Normal Giriş':
      case 'Vardiya Tamamlandı':
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom sx={{ mb: 0 }}>
          Giriş Çıkış Raporları
        </Typography>
        
        {/* Filtre göster/gizle butonu */}
        <Tooltip title={showFilters ? "Filtreleri Gizle" : "Filtreleri Göster"}>
          <IconButton 
            onClick={() => setShowFilters(!showFilters)}
            color="primary"
            size="small"
            sx={{ 
              bgcolor: showFilters ? 'primary.light' : 'transparent',
              color: showFilters ? 'white' : 'primary.main',
              '&:hover': { 
                bgcolor: showFilters ? 'primary.main' : 'rgba(0, 0, 0, 0.04)' 
              } 
            }}
          >
            <FilterListIcon fontSize="small" sx={{ mr: 0.5 }} />
            {showFilters ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Filtreleme Alanı */}
      <Collapse in={showFilters} timeout="auto">
        <Paper 
          elevation={1} 
          sx={{ 
            p: 2, 
            mb: 2, 
            borderRadius: 1,
            borderLeft: '4px solid',
            borderColor: 'primary.main',
            bgcolor: 'background.default'
          }}
        >
          <Grid container spacing={2}>
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
                  <MenuItem value="Normal Giriş">Normal Giriş</MenuItem>
                  <MenuItem value="Erken Geldi">Erken Geldi</MenuItem>
                  <MenuItem value="Geç Geldi">Geç Geldi</MenuItem>
                  <MenuItem value="Normal Çıktı">Normal Çıktı</MenuItem>
                  <MenuItem value="Vardiya Tamamlandı">Vardiya Tamamlandı</MenuItem>
                  <MenuItem value="Erken Çıktı">Erken Çıktı</MenuItem>
                  <MenuItem value="Devam Ediyor">Devam Ediyor</MenuItem>
                  <MenuItem value="Giriş Yapılmamış">Giriş Yapılmamış</MenuItem>
                  <MenuItem value="Çıkış Yapılmamış">Çıkış Yapılmamış</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>
      
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
                <TableRow 
                  key={report.id} 
                  hover
                  onClick={() => handleOpenModal(report)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { 
                      backgroundColor: 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
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
      
      {/* Vardiya Zaman Düzenleme Modalı */}
      <VardiyaZamanDuzenleModal
        open={isModalOpen}
        onClose={handleCloseModal}
        report={selectedReport}
      />
    </Box>
  );
};

export default GirisCikisRaporlari;