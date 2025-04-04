import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Autocomplete,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format, addDays, differenceInMinutes, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

interface Personnel {
  id: string;
  name: string;
}

interface ShiftRecord {
  date: string;
  girisZamani: number;
  cikisZamani: number | null;
  vardiyaAdi: string;
  totalWorkMinutes: number;
}

interface PersonnelWorkData {
  id: string;
  name: string;
  records: ShiftRecord[];
  totals: {
    entriesCount: number;
    exitsCount: number;
    totalWorkMinutes: number;
  };
}

const ToplamSure: React.FC = () => {
  const { userDetails } = useAuth();
  const [loading, setLoading] = useState(false);
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(addDays(new Date(), 7));
  const [workData, setWorkData] = useState<PersonnelWorkData[]>([]);
  const [isFiltered, setIsFiltered] = useState(false);
  const [selectAllPersonnel, setSelectAllPersonnel] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Personel listesini yükle
  useEffect(() => {
    const fetchPersonnel = async () => {
      if (!userDetails?.companyId) return;

      try {
        const personnelRef = ref(database, `companies/${userDetails.companyId}/personnel`);
        const snapshot = await get(personnelRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const personnelArray: Personnel[] = Object.keys(data).map(id => ({
            id,
            name: data[id].name || `${data[id].firstName || ''} ${data[id].lastName || ''}`.trim() || id
          }));
          
          setPersonnelList(personnelArray);
        }
      } catch (error) {
        console.error("Personel listesi yüklenirken hata:", error);
      }
    };

    fetchPersonnel();
  }, [userDetails]);

  // Tüm personeli seç
  const handleSelectAllPersonnel = (checked: boolean) => {
    setSelectAllPersonnel(checked);
    if (checked) {
      setSelectedPersonnel([...personnelList]);
    } else {
      setSelectedPersonnel([]);
    }
  };

  // Personel çalışma verilerini getir
  const fetchWorkData = async () => {
    if (!userDetails?.companyId || !startDate || !endDate || selectedPersonnel.length === 0) {
      return;
    }

    setLoading(true);
    setIsFiltered(true);

    try {
      const startDateStr = format(startDate, 'dd-MM-yyyy');
      const endDateStr = format(endDate, 'dd-MM-yyyy');
      
      // Tarih karşılaştırması için tarih nesneleri oluştur
      const startDateObj = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDateObj = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      const personnelWorkData: PersonnelWorkData[] = [];
      
      // Her personel için verileri çek
      for (const personnel of selectedPersonnel) {
        const vardiyaListesiRef = ref(database, `companies/${userDetails.companyId}/vardiyaListesi`);
        const snapshot = await get(vardiyaListesiRef);
        
        if (snapshot.exists()) {
          const allShiftData = snapshot.val();
          const personnelRecords: ShiftRecord[] = [];
          let entriesCount = 0;
          let exitsCount = 0;
          let totalWorkMinutes = 0;
          
          // Tarih bazlı kayıtları işle
          Object.keys(allShiftData).forEach(date => {
            // Tarih string'ini Date nesnesine çevir (dd-MM-yyyy)
            const dateParts = date.split('-');
            if (dateParts.length !== 3) return; // Geçersiz tarih formatı
            
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1; // JavaScript ayları 0'dan başlar
            const year = parseInt(dateParts[2], 10);
            
            const currentDateObj = new Date(year, month, day);
            
            // Tarih filtreleme (Date nesneleri ile karşılaştırma)
            if (currentDateObj >= startDateObj && currentDateObj <= endDateObj) {
              const dateData = allShiftData[date];
              
              // Personele ait kayıt varsa
              if (dateData[personnel.id]) {
                const record = dateData[personnel.id];
                
                // Toplam çalışma süresini hesapla (dakika cinsinden)
                let workMinutes = 0;
                if (record.girisZamani && record.cikisZamani) {
                  workMinutes = differenceInMinutes(
                    new Date(record.cikisZamani),
                    new Date(record.girisZamani)
                  );
                  
                  // Negatif değerleri önle
                  workMinutes = workMinutes < 0 ? 0 : workMinutes;
                }
                
                // Giriş/çıkış sayacını güncelle
                if (record.girisZamani) entriesCount++;
                if (record.cikisZamani) exitsCount++;
                
                // Toplam süreyi güncelle
                totalWorkMinutes += workMinutes;
                
                // Kayıt ekle
                personnelRecords.push({
                  date,
                  girisZamani: record.girisZamani,
                  cikisZamani: record.cikisZamani,
                  vardiyaAdi: record.vardiyaAdi || 'Bilinmeyen Vardiya',
                  totalWorkMinutes: workMinutes
                });
              }
            }
          });
          
          // Tarihe göre sırala
          personnelRecords.sort((a, b) => {
            // Tarihleri parçalara ayır ve tarih nesneleri oluştur
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
            
            // Tarih nesneleri ile karşılaştır
            return aDate.getTime() - bDate.getTime();
          });
          
          // Personel veri nesnesini ekle
          personnelWorkData.push({
            id: personnel.id,
            name: personnel.name,
            records: personnelRecords,
            totals: {
              entriesCount,
              exitsCount,
              totalWorkMinutes
            }
          });
        }
      }
      
      setWorkData(personnelWorkData);
    } catch (error) {
      console.error("Çalışma verileri yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  // Dakikayı saat:dakika formatına dönüştür
  const formatMinutesToHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  // Unix timestamp'i saat:dakika formatına dönüştür
  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // Excel'e veri aktarma olayını dinle
  useEffect(() => {
    const handleExportToExcel = (event: CustomEvent) => {
      const { worksheet } = event.detail;
      
      // Excel stil tanımlamaları
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4F81BD' } },
        border: {
          top: { style: 'thin' as const },
          left: { style: 'thin' as const },
          bottom: { style: 'thin' as const },
          right: { style: 'thin' as const }
        },
        alignment: { horizontal: 'center' as const }
      };
      
      const totalRowStyle = {
        font: { bold: true },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF5F5F5' } },
        border: {
          top: { style: 'thin' as const },
          left: { style: 'thin' as const },
          bottom: { style: 'thin' as const },
          right: { style: 'thin' as const }
        }
      };
      
      const normalCellStyle = {
        border: {
          top: { style: 'thin' as const },
          left: { style: 'thin' as const },
          bottom: { style: 'thin' as const },
          right: { style: 'thin' as const }
        }
      };
      
      const titleStyle = {
        font: { bold: true, size: 14 }
      };
      
      // Başlık satırını ekle
      worksheet.addRow(['Personel Çalışma Süreleri Raporu']);
      worksheet.mergeCells('A1:E1');
      const titleRow = worksheet.getRow(1);
      titleRow.font = { bold: true, size: 16 };
      titleRow.alignment = { horizontal: 'center' };
      
      // Tarih bilgisi
      const today = new Date();
      const dateStr = format(today, 'dd.MM.yyyy');
      worksheet.addRow([`Rapor Tarihi: ${dateStr}`]);
      worksheet.mergeCells('A2:E2');
      
      // İlk iki satıra boşluk bırak
      worksheet.addRow([]);
      
      // Her personel için ayrı tablo oluştur
      let currentRow = 4;
      
      workData.forEach((personnel, index) => {
        // Personel başlığı ekle
        worksheet.addRow([personnel.name]);
        worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
        const personelRow = worksheet.getRow(currentRow);
        personelRow.font = titleStyle.font;
        personelRow.height = 30;
        personelRow.alignment = { vertical: 'middle' };
        currentRow++;
        
        // Tablo sütun başlıkları
        const headerRow = worksheet.addRow(['Tarih', 'Giriş Saati', 'Çıkış Saati', 'Toplam Çalışma', 'Vardiya']);
        
        // Başlık stilini uygula
        headerRow.eachCell((cell: any) => {
          cell.style = headerStyle;
          cell.alignment = { horizontal: 'center' };
        });
        headerRow.height = 25;
        currentRow++;
        
        // Sütun genişliklerini ayarla
        worksheet.getColumn('A').width = 15;
        worksheet.getColumn('B').width = 15;
        worksheet.getColumn('C').width = 15;
        worksheet.getColumn('D').width = 18;
        worksheet.getColumn('E').width = 20;
        
        if (personnel.records.length === 0) {
          // Kayıt yoksa bilgi mesajı
          const noDataRow = worksheet.addRow(['Bu personel için kayıt bulunamadı']);
          worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
          noDataRow.alignment = { horizontal: 'center' };
          currentRow++;
        } else {
          // Personel kayıtlarını ekle
          personnel.records.forEach(record => {
            const dataRow = worksheet.addRow([
              record.date,
              formatTime(record.girisZamani),
              formatTime(record.cikisZamani),
              formatMinutesToHours(record.totalWorkMinutes),
              record.vardiyaAdi
            ]);
            
            // Hücre stillerini uygula
            dataRow.eachCell((cell: any) => {
              cell.style = normalCellStyle;
              cell.alignment = { horizontal: 'center' };
            });
            
            currentRow++;
          });
          
          // Toplam satırı ekle
          const totalRow = worksheet.addRow([
            'TOPLAM',
            `${personnel.totals.entriesCount} Giriş`,
            `${personnel.totals.exitsCount} Çıkış`,
            formatMinutesToHours(personnel.totals.totalWorkMinutes),
            ''
          ]);
          
          // Toplam satırı stilini uygula
          totalRow.eachCell((cell: any) => {
            cell.style = totalRowStyle;
            cell.alignment = { horizontal: 'center' };
          });
          totalRow.height = 25;
          currentRow++;
        }
        
        // Tablolar arasında boşluk bırak
        worksheet.addRow([]);
        currentRow++;
      });
    };
    
    // Event listener'ı ekle
    window.addEventListener('export-toplamsure-to-excel', handleExportToExcel as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('export-toplamsure-to-excel', handleExportToExcel as EventListener);
    };
  }, [workData]);

  // Scroll olayını dinle
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen]);

  return (
    <Box>
      <Typography variant="h6" component="h2" gutterBottom>
        Personel Çalışma Süreleri
      </Typography>
      
      {/* Filtreleme Alanı */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Personel Seçimi */}
          <Grid item xs={12} md={4}>
            <Autocomplete
              multiple
              id="personnel-filter"
              options={personnelList}
              getOptionLabel={(option) => option.name}
              value={selectedPersonnel}
              onChange={(_, newValue) => {
                setSelectedPersonnel(newValue);
                setSelectAllPersonnel(newValue.length === personnelList.length);
              }}
              disablePortal={true}
              open={isOpen}
              onOpen={() => setIsOpen(true)}
              onClose={() => setIsOpen(false)}
              ref={autocompleteRef}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Personel Seçin"
                  placeholder="Personel seçin..."
                  size="small"
                />
              )}
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Checkbox
                    style={{ marginRight: 8 }}
                    checked={selected}
                  />
                  {option.name}
                </li>
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip 
                    label={option.name} 
                    {...getTagProps({ index })} 
                    size="small"
                  />
                ))
              }
              ListboxProps={{
                style: { paddingTop: 0 }
              }}
              ListboxComponent={(props) => (
                <ul {...props}>
                  <li style={{ 
                    padding: '8px 16px', 
                    borderBottom: '1px solid #eee', 
                    backgroundColor: '#f5f5f5'
                  }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectAllPersonnel}
                          onChange={(e) => handleSelectAllPersonnel(e.target.checked)}
                        />
                      }
                      label="Tüm Personel"
                      style={{ width: '100%' }}
                    />
                  </li>
                  {props.children}
                </ul>
              )}
              disableCloseOnSelect
            />
          </Grid>
          
          {/* Tarih Aralığı */}
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Başlangıç Tarihi"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{ 
                  textField: { 
                    size: 'small',
                    fullWidth: true
                  } 
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Bitiş Tarihi"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{ 
                  textField: { 
                    size: 'small',
                    fullWidth: true
                  } 
                }}
              />
            </Grid>
          </LocalizationProvider>
          
          {/* Filtrele Butonu */}
          <Grid item xs={12} md={2}>
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth
              onClick={fetchWorkData}
              disabled={loading || selectedPersonnel.length === 0 || !startDate || !endDate}
            >
              {loading ? <CircularProgress size={24} /> : 'Filtrele'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Veri Yükleniyor Göstergesi */}
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Henüz Filtrelenmemiş Durumda Mesaj */}
      {!isFiltered && !loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, bgcolor: '#f8f9fa', borderRadius: 2 }}>
          <Typography variant="body1" color="text.secondary">
            Lütfen personel seçip tarih aralığı belirleyin, ardından "Filtrele" butonuna tıklayın
          </Typography>
        </Box>
      )}
      
      {/* Veri Yok Mesajı */}
      {isFiltered && !loading && workData.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, bgcolor: '#f8f9fa', borderRadius: 2 }}>
          <Typography variant="body1" color="text.secondary">
            Seçilen kriterlere uygun veri bulunamadı
          </Typography>
        </Box>
      )}
      
      {/* Personel Tabloları */}
      {!loading && workData.map((personnel) => (
        <Box key={personnel.id} mb={4}>
          <Typography variant="h6" component="h3" gutterBottom>
            {personnel.name}
          </Typography>
          
          {personnel.records.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Bu personel için seçilen tarih aralığında kayıt bulunamadı
            </Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tarih</TableCell>
                    <TableCell>Giriş Saati</TableCell>
                    <TableCell>Çıkış Saati</TableCell>
                    <TableCell>Toplam Çalışma</TableCell>
                    <TableCell>Vardiya</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Personel Kayıtları */}
                  {personnel.records.map((record) => (
                    <TableRow key={record.date}>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{formatTime(record.girisZamani)}</TableCell>
                      <TableCell>{formatTime(record.cikisZamani)}</TableCell>
                      <TableCell>{formatMinutesToHours(record.totalWorkMinutes)}</TableCell>
                      <TableCell>{record.vardiyaAdi}</TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Toplam Satırı */}
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell colSpan={1} sx={{ fontWeight: 'bold' }}>
                      TOPLAM
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {personnel.totals.entriesCount} Giriş
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {personnel.totals.exitsCount} Çıkış
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {formatMinutesToHours(personnel.totals.totalWorkMinutes)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          <Divider sx={{ mt: 4 }} />
        </Box>
      ))}
    </Box>
  );
};

export default ToplamSure; 