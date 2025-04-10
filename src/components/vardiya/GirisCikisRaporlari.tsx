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
  Collapse,
  Button,
  Autocomplete,
  TablePagination
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { tr } from 'date-fns/locale';
import { format, isWithinInterval, parseISO, addDays, subDays } from 'date-fns';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FilterListIcon from '@mui/icons-material/FilterList';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ClearIcon from '@mui/icons-material/Clear';
import DateRangeIcon from '@mui/icons-material/DateRange';
import { ref, get, onValue } from 'firebase/database';
import { database } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import VardiyaZamanDuzenleModal from './VardiyaZamanDuzenleModal';

interface GirisCikisRaporlariProps {
  branchId?: string;
  isManager?: boolean;
}

// Durum seçeneği tipi tanımı
interface StatusOption {
  value: string;
  label: string;
  color: string;
}

const GirisCikisRaporlari: React.FC<GirisCikisRaporlariProps> = ({ branchId, isManager = false }) => {
  const { currentUser, userDetails } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [personnelData, setPersonnelData] = useState<{[key: string]: any}>({});
  
  // Sayfalandırma için state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
  // Tarih filtresi için state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Datepicker açma fonksiyonları için state
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  
  // Durum listesi
  const statusOptions: StatusOption[] = [
    { value: 'all', label: 'Tüm Durumlar', color: 'default' },
    { value: 'devam-eden-personel', label: 'Devam Eden Personel', color: 'info' },
    { value: 'unutulanlar', label: 'Unutulanlar', color: 'error' },
    { value: 'elle-duzenlenenler', label: 'Elle Düzenlenenler', color: 'warning' },
    { value: 'Normal Giriş', label: 'Normal Giriş', color: 'success' },
    { value: 'Erken Geldi', label: 'Erken Geldi', color: 'info' },
    { value: 'Geç Geldi', label: 'Geç Geldi', color: 'warning' },
    { value: 'Normal Çıktı', label: 'Normal Çıktı', color: 'success' },
    { value: 'Vardiya Tamamlandı', label: 'Vardiya Tamamlandı', color: 'success' },
    { value: 'Erken Çıktı', label: 'Erken Çıktı', color: 'warning' },
    { value: 'Devam Ediyor', label: 'Devam Ediyor', color: 'info' },
    { value: 'Giriş Yapılmamış', label: 'Giriş Yapılmamış', color: 'error' },
    { value: 'Çıkış Yapılmamış', label: 'Çıkış Yapılmamış', color: 'error' }
  ];
  
  // Seçili durum
  const selectedStatus = statusOptions.find(option => option.value === statusFilter) || statusOptions[0];
  
  // Vardiya zaman düzenleme modalı için state
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filtre görünürlüğü için state
  const [showFilters, setShowFilters] = useState(true);

  // Takvim referansları
  const startDatePickerRef = React.useRef<any>(null);
  const endDatePickerRef = React.useRef<any>(null);

  // Hızlı tarih seçme
  const setQuickDateRange = (range: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch(range) {
      case 'today':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        setStartDate(yesterday);
        setEndDate(yesterday);
        break;
      case 'thisWeek':
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Pazartesi
        setStartDate(thisWeekStart);
        setEndDate(today);
        break;
      case 'lastWeek':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 6); // Geçen haftanın Pazartesi
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay()); // Geçen haftanın Pazar
        setStartDate(lastWeekStart);
        setEndDate(lastWeekEnd);
        break;
      case 'thisMonth':
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(thisMonthStart);
        setEndDate(today);
        break;
      case 'lastMonth':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(lastMonthStart);
        setEndDate(lastMonthEnd);
        break;
      case 'last30Days':
        setStartDate(subDays(today, 30));
        setEndDate(today);
        break;
      default:
        break;
    }
  };
  
  // Tarih filtresini sıfırla
  const resetDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
  };

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
        
        // Rapor verisi ile ilgili bilgi yazdır
        console.log('Yüklenen rapor verileri:', reportsList);
        console.log('Örnek veri örüntüsü:', reportsList.length > 0 ? reportsList[0].originalRecord : 'Veri yok');
        
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
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'devam-eden-personel') {
        // Giriş yapmış fakat henüz çıkış yapmamış personelleri filtrele
        filtered = filtered.filter(report => 
          report.checkIn !== '--:--' && report.checkOut === '--:--' && report.statusInfo.exitStatus === 'Devam Ediyor'
        );
      } else if (statusFilter === 'unutulanlar') {
        // Bugünün tarihini al
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Geçmiş günlerde giriş veya çıkış yapılmamış kayıtları filtrele
        filtered = filtered.filter(report => {
          // Rapor tarihini Date nesnesine çevir
          const dateParts = report.date.split('-');
          const day = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1; // JavaScript ayları 0'dan başlar
          const year = parseInt(dateParts[2], 10);
          const reportDate = new Date(year, month, day);
          
          // Rapor bugünden önceki bir güne ait ve eksik giriş/çıkış var mı?
          return reportDate < today && (report.checkIn === '--:--' || report.checkOut === '--:--');
        });
      } else if (statusFilter === 'elle-duzenlenenler') {
        // Elle düzenlenmiş kayıtları filtrele
        filtered = filtered.filter(report => 
          report.originalRecord.girisElleDuzenlendi || report.originalRecord.cikisElleDuzenlendi
        );
      } else {
        // Diğer durum filtreleri
        filtered = filtered.filter(report => {
          const { entryStatus, exitStatus } = report.statusInfo;
          return entryStatus === statusFilter || exitStatus === statusFilter;
        });
      }
    }
    
    // Tarih aralığı filtresi
    if (startDate && endDate) {
      filtered = filtered.filter(report => {
        // Tarih string'ini Date nesnesine çevir (dd-MM-yyyy)
        const dateParts = report.date.split('-');
        if (dateParts.length !== 3) return false;
        
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // JavaScript ayları 0'dan başlar
        const year = parseInt(dateParts[2], 10);
        
        const reportDate = new Date(year, month, day);
        
        // Tarih aralığı içinde mi kontrol et
        return isWithinInterval(reportDate, { start: startDate, end: endDate });
      });
    }
    
    setFilteredReports(filtered);
  }, [searchTerm, statusFilter, reports, startDate, endDate]);

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

  // Sayfa değişimi
  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  // Sayfa başına satır sayısı değişimi
  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Sayfalandırılmış rapor verileri
  const paginatedReports = React.useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredReports.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredReports, page, rowsPerPage]);

  // Filtre değişikliklerinde sayfa numarasını sıfırla
  useEffect(() => {
    setPage(0);
  }, [searchTerm, statusFilter, startDate, endDate]);

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
            <Grid item xs={12} md={4}>
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
        
            {/* Durum Filtresi - Autocomplete */}
            <Grid item xs={12} md={4}>
              <Autocomplete
                value={selectedStatus}
                onChange={(_, newValue: StatusOption | null) => {
                  setStatusFilter(newValue ? newValue.value : 'all');
                }}
                options={statusOptions}
                getOptionLabel={(option) => option.label}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
              label="Durum Filtresi"
                    size="small"
                    placeholder="Durum seçin..."
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip 
                        label=" " 
                        size="small" 
                        sx={{ 
                          minWidth: 20, 
                          backgroundColor: 
                            option.color === 'default' ? 'grey.400' :
                            option.color === 'success' ? 'success.light' : 
                            option.color === 'warning' ? 'warning.light' : 
                            option.color === 'error' ? 'error.light' : 
                            'info.light'
                        }} 
                      />
                      <Typography 
                        variant="body2"
                        sx={{
                          fontWeight: option.value === 'devam-eden-personel' || 
                                     option.value === 'unutulanlar' ||
                                     option.value === 'elle-duzenlenenler'
                                     ? 'bold' : 'normal',
                          color: option.value === 'devam-eden-personel' 
                                  ? 'info.main' 
                                  : option.value === 'unutulanlar'
                                    ? 'error.main'
                                    : option.value === 'elle-duzenlenenler'
                                      ? 'warning.main'
                                      : 'inherit'
                        }}
                      >
                        {option.label}
                      </Typography>
                    </Stack>
                  </Box>
                )}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                disableClearable
              />
            </Grid>
            
            {/* Tarih Aralığı Filtresi */}
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ position: 'relative', width: '100%' }}>
                      <DatePicker 
                        label="Başlangıç"
                        value={startDate}
                        onChange={(newValue) => setStartDate(newValue)}
                        format="dd/MM/yyyy"
                        open={startPickerOpen}
                        onOpen={() => setStartPickerOpen(true)}
                        onClose={() => setStartPickerOpen(false)}
                        slotProps={{
                          textField: {
                            size: 'small',
                            fullWidth: true,
                            InputProps: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <IconButton 
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setStartPickerOpen(true);
                                    }}
                                  >
                                    <CalendarTodayIcon fontSize="small" />
                                  </IconButton>
                                </InputAdornment>
                              ),
                              endAdornment: startDate && (
                                <IconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStartDate(null);
                                  }}
                                  size="small"
                                >
                                  <ClearIcon fontSize="small" />
                                </IconButton>
                              )
                            }
                          }
                        }}
                      />
                    </Box>
                    <Box sx={{ position: 'relative', width: '100%' }}>
                      <DatePicker 
                        label="Bitiş"
                        value={endDate}
                        onChange={(newValue) => setEndDate(newValue)}
                        format="dd/MM/yyyy"
                        open={endPickerOpen}
                        onOpen={() => setEndPickerOpen(true)}
                        onClose={() => setEndPickerOpen(false)}
                        slotProps={{
                          textField: {
                            size: 'small',
                            fullWidth: true,
                            InputProps: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <IconButton 
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEndPickerOpen(true);
                                    }}
                                  >
                                    <CalendarTodayIcon fontSize="small" />
                                  </IconButton>
                                </InputAdornment>
                              ),
                              endAdornment: endDate && (
                                <IconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEndDate(null);
                                  }}
                                  size="small"
                                >
                                  <ClearIcon fontSize="small" />
                                </IconButton>
                              )
                            }
                          }
                        }}
                      />
                    </Box>
                  </Box>
                  
                  {/* Hızlı Tarih Seçimleri */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    <Tooltip title="Bugün">
                      <Button 
                        size="small" 
                        variant="outlined" 
                        sx={{ minWidth: 'auto', px: 1, py: 0.5, fontSize: '0.75rem' }}
                        onClick={() => setQuickDateRange('today')}
                      >
                        Bugün
                      </Button>
                    </Tooltip>
                    <Tooltip title="Dün">
                      <Button 
                        size="small" 
                        variant="outlined" 
                        sx={{ minWidth: 'auto', px: 1, py: 0.5, fontSize: '0.75rem' }}
                        onClick={() => setQuickDateRange('yesterday')}
                      >
                        Dün
                      </Button>
                    </Tooltip>
                    <Tooltip title="Bu Hafta">
                      <Button 
                        size="small" 
                        variant="outlined" 
                        sx={{ minWidth: 'auto', px: 1, py: 0.5, fontSize: '0.75rem' }}
                        onClick={() => setQuickDateRange('thisWeek')}
                      >
                        Bu Hafta
                      </Button>
                    </Tooltip>
                    <Tooltip title="Son 30 Gün">
                      <Button 
                        size="small" 
                        variant="outlined" 
                        sx={{ minWidth: 'auto', px: 1, py: 0.5, fontSize: '0.75rem' }}
                        onClick={() => setQuickDateRange('last30Days')}
                      >
                        Son 30
                      </Button>
                    </Tooltip>
                    {startDate && endDate && (
                      <Tooltip title="Tarihleri Temizle">
                        <Button 
                          size="small" 
                          color="error"
                          variant="outlined" 
                          sx={{ minWidth: 'auto', px: 1, py: 0.5, fontSize: '0.75rem' }}
                          onClick={resetDateFilter}
                        >
                          Temizle
                        </Button>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </LocalizationProvider>
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
            {searchTerm || statusFilter !== 'all' || (startDate && endDate) ? "Arama sonucu bulunamadı" : "Henüz rapor bulunmuyor"}
          </Typography>
        </Box>
      ) : (
        <Box>
          <Paper sx={{ 
            width: '100%', 
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
            borderRadius: 2,
            mb: 1
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
                {paginatedReports.map((report) => {
                  // Rapor tarihini Date nesnesine çevir
                  const dateParts = report.date.split('-');
                  const day = parseInt(dateParts[0], 10);
                  const month = parseInt(dateParts[1], 10) - 1; // JavaScript ayları 0'dan başlar
                  const year = parseInt(dateParts[2], 10);
                  const reportDate = new Date(year, month, day);
                  
                  // Bugünün tarihini saat 00:00:00'a ayarla
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  // Rapor bugünden önceki bir güne ait ve eksik giriş/çıkış var mı?
                  const isOldMissingEntry = reportDate < today && 
                    (report.checkIn === '--:--' || report.checkOut === '--:--');
                  
                  return (
                  <TableRow 
                    key={report.id} 
                    hover
                    onClick={() => handleOpenModal(report)}
                    sx={{ 
                      cursor: 'pointer',
                      backgroundColor: isOldMissingEntry ? 'rgba(229, 115, 115, 0.1)' : 'inherit',
                      '&:hover': { 
                        backgroundColor: isOldMissingEntry ? 'rgba(229, 115, 115, 0.2)' : 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                  >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar 
                        sx={{ 
                          width: 32, 
                          height: 32, 
                          bgcolor: isOldMissingEntry ? 'error.main' : 'primary.main',
                          mr: 1.5
                        }}
                      >
                        <PersonIcon fontSize="small" />
                      </Avatar>
                      <Typography 
                        variant="body2" 
                        fontWeight={isOldMissingEntry ? 'bold' : 'medium'}
                        color={isOldMissingEntry ? 'error.main' : 'inherit'}
                      >
                        {report.personnel}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2"
                      color={isOldMissingEntry ? 'error.main' : 'inherit'}
                    >
                      {report.shift}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarTodayIcon 
                        fontSize="small" 
                        sx={{ 
                          mr: 0.5, 
                          color: isOldMissingEntry ? 'error.main' : 'text.secondary' 
                        }} 
                      />
                      <Typography 
                        variant="body2"
                        color={isOldMissingEntry ? 'error.main' : 'inherit'}
                        fontWeight={isOldMissingEntry ? 'bold' : 'normal'}
                      >
                        {report.date}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2"
                      sx={{ 
                        color: isOldMissingEntry && report.checkIn === '--:--' 
                          ? 'error.main' 
                          : report.originalRecord.girisElleDuzenlendi 
                            ? 'error.main' 
                            : 'inherit',
                        fontWeight: (isOldMissingEntry && report.checkIn === '--:--') || 
                                   report.originalRecord.girisElleDuzenlendi 
                                   ? 'bold' 
                                   : 'normal'
                      }}
                    >
                      {report.checkIn}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2"
                      sx={{ 
                        color: isOldMissingEntry && report.checkOut === '--:--' 
                          ? 'error.main' 
                          : report.originalRecord.cikisElleDuzenlendi 
                            ? 'error.main' 
                            : 'inherit',
                        fontWeight: (isOldMissingEntry && report.checkOut === '--:--') || 
                                   report.originalRecord.cikisElleDuzenlendi 
                                   ? 'bold' 
                                   : 'normal'
                      }}
                    >
                      {report.checkOut}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {report.statusInfo.entryStatus && (
                        <Chip 
                          label={report.statusInfo.entryStatus}
                          size="small" 
                          color={isOldMissingEntry ? 'error' : getStatusColor(report.statusInfo.entryStatus)}
                          sx={{ fontSize: '11px', height: 24, mb: 0.5 }}
                        />
                      )}
                      {report.statusInfo.exitStatus && (
                        <Chip 
                          label={report.statusInfo.exitStatus}
                          size="small" 
                          color={isOldMissingEntry ? 'error' : getStatusColor(report.statusInfo.exitStatus)}
                          sx={{ fontSize: '11px', height: 24, mb: 0.5 }}
                        />
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </Paper>
          
          {/* Sayfalama */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <TablePagination
              component="div"
              count={filteredReports.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[25, 50, 100]}
              labelRowsPerPage="Sayfa başına satır:"
              labelDisplayedRows={({ from, to, count }) => `${count} kayıttan ${from}-${to} arası gösteriliyor`}
            />
          </Box>
        </Box>
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