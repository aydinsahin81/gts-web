import React from 'react';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  IconButton,
  Chip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

// Geçici veri oluşturma
const createData = (
  id: number,
  name: string,
  date: string,
  timeRange: string,
  hall: string,
) => {
  return { id, name, date, timeRange, hall };
};

// Rastgele saat aralığı oluşturma fonksiyonu (2-8 saat arası)
const generateTimeRange = () => {
  // Saatler: 08:00-22:00 arası
  const startHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const startHour = startHours[Math.floor(Math.random() * startHours.length)];
  
  // 2-8 saat arası süre
  const duration = Math.floor(Math.random() * 7) + 2;
  
  // Bitiş saati
  const endHour = Math.min(startHour + duration, 22);
  
  // Zaman formatına çevirme
  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };
  
  return `${formatTime(startHour)} - ${formatTime(endHour)}`;
};

// Daha fazla veri ekledim, 50 kayıt
const rows = Array(50).fill(0).map((_, index) => {
  const id = 1001 + index;
  const names = ['Ahmet Yılmaz', 'Mehmet Kaya', 'Ayşe Demir', 'Fatma Çelik', 'Ali Öztürk', 
                'Zeynep Koç', 'Mustafa Şahin', 'Elif Yıldız', 'Can Aksoy', 'Selin Arslan'];
  const dates = ['12.04.2025', '13.04.2025', '14.04.2025', '15.04.2025', 
                '16.04.2025', '17.04.2025', '18.04.2025', '19.04.2025', 
                '20.04.2025', '21.04.2025'];
  const halls = ['Basketbol Salonu', 'Jimnastik Salonu', 'Yüzme Havuzu', 'Tenis Kortu', 
                'Futbol Sahası', 'Squash Salonu', 'Voleybol Sahası', 'Badminton Salonu', 
                'Fitness Salonu', 'Boks Salonu'];
  
  return createData(
    id, 
    names[index % names.length], 
    dates[index % dates.length],
    generateTimeRange(),
    halls[index % halls.length]
  );
});

const ReservationApplications: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Rezervasyon Başvuruları</Typography>
        <Chip 
          label={`Toplam: ${rows.length} başvuru`} 
          color="primary" 
          variant="outlined" 
        />
      </Box>
      
      <TableContainer>
        <Table stickyHeader aria-label="rezervasyon başvuruları tablosu">
          <TableHead>
            <TableRow>
              <TableCell sx={{ backgroundColor: '#f5f5f5' }}>Rezervasyon No</TableCell>
              <TableCell sx={{ backgroundColor: '#f5f5f5' }}>İsim</TableCell>
              <TableCell sx={{ backgroundColor: '#f5f5f5' }}>Rezervasyon Tarihi</TableCell>
              <TableCell sx={{ backgroundColor: '#f5f5f5' }}>Saat Aralığı</TableCell>
              <TableCell sx={{ backgroundColor: '#f5f5f5' }}>Rezervasyon Salonu</TableCell>
              <TableCell align="center" sx={{ backgroundColor: '#f5f5f5' }}>İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: '#f9f9f9' } }}
              >
                <TableCell component="th" scope="row">
                  #{row.id}
                </TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.timeRange}</TableCell>
                <TableCell>{row.hall}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                    <Button 
                      variant="contained" 
                      color="success" 
                      size="small"
                      startIcon={<CheckCircleIcon />}
                    >
                      Onayla
                    </Button>
                    <IconButton 
                      color="error" 
                      size="small"
                      aria-label="reddet"
                    >
                      <CancelIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ReservationApplications; 