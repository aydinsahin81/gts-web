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
  Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

// Basit örnek rapor verileri (gerçek veriler veritabanından gelecek)
const sampleReportData = [
  {
    id: '1',
    personnel: 'Ahmet Yılmaz',
    shift: 'Sabah Vardiyası',
    date: '2023-05-16',
    checkIn: '08:05',
    checkOut: '17:02',
    status: 'Normal'
  },
  {
    id: '2',
    personnel: 'Mehmet Kaya',
    shift: 'Sabah Vardiyası',
    date: '2023-05-16',
    checkIn: '08:15',
    checkOut: '17:00',
    status: 'Geç Geldi'
  },
  {
    id: '3',
    personnel: 'Ayşe Demir',
    shift: 'Öğle Vardiyası',
    date: '2023-05-16',
    checkIn: '12:00',
    checkOut: '20:00',
    status: 'Normal'
  },
  {
    id: '4',
    personnel: 'Fatma Şahin',
    shift: 'Gece Vardiyası',
    date: '2023-05-16',
    checkIn: '20:00',
    checkOut: '04:00',
    status: 'Normal'
  },
  {
    id: '5',
    personnel: 'Ali Yıldız',
    shift: 'Sabah Vardiyası',
    date: '2023-05-16',
    checkIn: '08:30',
    checkOut: '16:45',
    status: 'Geç Geldi'
  }
];

const GirisCikisRaporlari: React.FC = () => {
  const { currentUser, userDetails } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<any[]>(sampleReportData); // Örnek veri kullanıyoruz
  const [filteredReports, setFilteredReports] = useState<any[]>(sampleReportData);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Örnek olarak filtreleme işlemi (gerçek projede veritabanı sorguları kullanılacak)
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
      filtered = filtered.filter(report => report.status === statusFilter);
    }
    
    setFilteredReports(filtered);
  }, [searchTerm, statusFilter, reports]);

  // Excel'e veri aktarma olayını dinle
  useEffect(() => {
    const handleExportToExcel = (event: CustomEvent) => {
      const { worksheet } = event.detail;
      
      // Filtrelenmiş rapor verilerini Excel'e ekle
      filteredReports.forEach(report => {
        worksheet.addRow({
          personnel: report.personnel,
          shift: report.shift,
          date: report.date,
          checkIn: report.checkIn,
          checkOut: report.checkOut,
          status: report.status
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
      case 'Normal':
        return 'success';
      case 'Geç Geldi':
        return 'warning';
      case 'Erken Çıktı':
        return 'warning';
      case 'Eksik Vardiya':
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
              <MenuItem value="Normal">Normal</MenuItem>
              <MenuItem value="Geç Geldi">Geç Geldi</MenuItem>
              <MenuItem value="Erken Çıktı">Erken Çıktı</MenuItem>
              <MenuItem value="Eksik Vardiya">Eksik Vardiya</MenuItem>
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
                    <Chip 
                      label={report.status}
                      size="small" 
                      color={getStatusColor(report.status)}
                      sx={{ fontSize: '11px', height: 24 }}
                    />
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