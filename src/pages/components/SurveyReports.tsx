import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Divider,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Pagination,
  Button,
  InputAdornment
} from '@mui/material';
import { ref, onValue, get } from 'firebase/database';
import { database } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import Autocomplete from '@mui/material/Autocomplete';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Task {
  id: string;
  name: string;
  description: string;
  personnelId?: string;
}

interface Personnel {
  id: string;
  name: string;
}

interface Survey {
  id: string;
  title: string;
}

interface AnswerItem {
  questionTitle: string;
  selectedAnswer: string;
  answerType: 'positive' | 'negative' | 'neutral';
}

interface SurveyResponse {
  id: string;
  taskId: string;
  createdAt: number;
  answers: {
    [surveyId: string]: AnswerItem;
  };
}

interface ReportItem {
  taskId: string;
  taskName: string;
  surveyId: string;
  surveyTitle: string;
  answer: string;
  answerType: 'positive' | 'negative' | 'neutral';
  createdAt: number;
  responseId: string;
  questionTitle: string;
  personnelName: string;
}

const SurveyReports: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [surveys, setSurveys] = useState<Record<string, Survey>>({});
  const [personnelList, setPersonnelList] = useState<Record<string, Personnel>>({});
  const [completedTasks, setCompletedTasks] = useState<any>({});
  const [missedTasks, setMissedTasks] = useState<any>({});
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
  const [selectedAnswerType, setSelectedAnswerType] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 30;

  // Görevleri, anketleri ve cevapları yükle
  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      try {
        // Kullanıcı ve şirket bilgilerini al
        const userSnapshot = await get(ref(database, `users/${currentUser.uid}`));
        if (!userSnapshot.exists()) {
          setLoading(false);
          return;
        }

        const userData = userSnapshot.val();
        const companyId = userData.companyId;
        if (!companyId) {
          setLoading(false);
          return;
        }

        // Personel bilgilerini yükle
        const personnelRef = ref(database, `companies/${companyId}/personnel`);
        onValue(personnelRef, (snapshot) => {
          if (snapshot.exists()) {
            const personnelData = snapshot.val();
            const personnelObj: Record<string, Personnel> = {};
            
            Object.entries(personnelData).forEach(([id, data]: [string, any]) => {
              personnelObj[id] = {
                id,
                name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'İsimsiz Personel'
              };
            });
            
            setPersonnelList(personnelObj);
          }
        });

        // Tamamlanan görevleri yükle
        const completedTasksRef = ref(database, `companies/${companyId}/completedTasks`);
        onValue(completedTasksRef, (snapshot) => {
          if (snapshot.exists()) {
            setCompletedTasks(snapshot.val());
          }
        });

        // Tamamlanmayan görevleri yükle
        const missedTasksRef = ref(database, `companies/${companyId}/missedTasks`);
        onValue(missedTasksRef, (snapshot) => {
          if (snapshot.exists()) {
            setMissedTasks(snapshot.val());
          }
        });

        // Görevleri yükle ve nesne olarak sakla
        const tasksRef = ref(database, `companies/${companyId}/tasks`);
        onValue(tasksRef, (snapshot) => {
          if (snapshot.exists()) {
            const tasksData = snapshot.val();
            const tasksObject: Record<string, Task> = {};
            
            Object.entries(tasksData).forEach(([id, data]: [string, any]) => {
              tasksObject[id] = {
                id,
                name: data.name || 'İsimsiz Görev',
                description: data.description || '',
                personnelId: data.personnelId || ''
              };
            });
            
            setTasks(tasksObject);
          }
        });

        // Anketleri yükle ve nesne olarak sakla
        const surveysRef = ref(database, `companies/${companyId}/surveys`);
        onValue(surveysRef, (snapshot) => {
          if (snapshot.exists()) {
            const surveysData = snapshot.val();
            const surveysObject: Record<string, Survey> = {};
            
            Object.entries(surveysData).forEach(([id, data]: [string, any]) => {
              surveysObject[id] = {
                id,
                title: data.title || 'İsimsiz Anket'
              };
            });
            
            setSurveys(surveysObject);
          }
        });

        // Anket cevaplarını yükle
        const answeredSurveysRef = ref(database, `companies/${companyId}/answeredSurveys`);
        onValue(answeredSurveysRef, (snapshot) => {
          if (snapshot.exists()) {
            const answeredData = snapshot.val();
            const reportItemsList: ReportItem[] = [];

            // Her görev için cevapları kontrol et
            Object.entries(answeredData).forEach(([taskId, taskResponses]: [string, any]) => {
              // Her cevap için
              Object.entries(taskResponses).forEach(([responseId, response]: [string, any]) => {
                if (!response.answers) return;

                const responseDate = new Date(response.createdAt);
                let personnelName = '';
                
                // Her anket cevabı için
                Object.entries(response.answers).forEach(([surveyId, answerData]: [string, any]) => {
                  // Veriler yüklenirken task veya survey henüz mevcut olmayabilir
                  const taskName = tasks[taskId]?.name || 'Yükleniyor...';
                  const surveyTitle = surveys[surveyId]?.title || 'Yükleniyor...';
                  
                  // İlgili görevin sorumlu personelini bul
                  personnelName = findPersonnelName(taskId, responseDate, tasks, completedTasks, missedTasks, personnelList);
                  
                  reportItemsList.push({
                    taskId,
                    taskName,
                    surveyId,
                    surveyTitle,
                    answer: answerData.selectedAnswer,
                    answerType: answerData.answerType,
                    createdAt: response.createdAt || 0,
                    responseId,
                    questionTitle: answerData.questionTitle || '',
                    personnelName: personnelName
                  });
                });
              });
            });

            // Raporları tarihe göre sırala (en yeniden en eskiye)
            reportItemsList.sort((a, b) => b.createdAt - a.createdAt);
            setReportItems(reportItemsList);
          }
          
          setLoading(false);
        });

      } catch (error) {
        console.error('Rapor verileri yüklenirken hata:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // Personel adını bulma algoritması
  const findPersonnelName = (
    taskId: string, 
    responseDate: Date, 
    tasks: Record<string, Task>,
    completedTasks: any,
    missedTasks: any,
    personnelList: Record<string, Personnel>
  ): string => {
    // Varsayılan değer
    let personnelName = '';
    
    try {
      // 1. Anket tarihinden önceki en son kaydedilen görevi bul
      if (completedTasks[taskId]) {
        let latestCompletionTime = 0;
        let latestCompletionPersonnelId = '';

        for (const dateKey in completedTasks[taskId]) {
          for (const timeKey in completedTasks[taskId][dateKey]) {
            const completionData = completedTasks[taskId][dateKey][timeKey];
            const completionTime = completionData.completedAt;
            
            // Anket tarihinden önce ve şu ana kadar bulunan en son kayıttan daha yakın bir zaman ise
            if (completionTime < responseDate.getTime() && completionTime > latestCompletionTime) {
              latestCompletionTime = completionTime;
              // Tamamlanan görevdeki personel bilgisi, varsa kullan
              const task = tasks[taskId];
              if (task && task.personnelId) {
                latestCompletionPersonnelId = task.personnelId;
              }
            }
          }
        }

        // En son bulunan görev kaydındaki personel bilgisini kullan
        if (latestCompletionPersonnelId && personnelList[latestCompletionPersonnelId]) {
          return personnelList[latestCompletionPersonnelId].name;
        }
      }

      // 2. Tamamlanmayan görevlerde de kontrol et
      if (missedTasks[taskId]) {
        let latestMissedTime = 0;
        let latestMissedPersonnelId = '';

        for (const dateKey in missedTasks[taskId]) {
          for (const timeKey in missedTasks[taskId][dateKey]) {
            const missedData = missedTasks[taskId][dateKey][timeKey];
            const missedTime = missedData.missedAt;
            
            // Anket tarihinden önce ve şu ana kadar bulunan en son kayıttan daha yakın bir zaman ise
            if (missedTime < responseDate.getTime() && missedTime > latestMissedTime) {
              latestMissedTime = missedTime;
              // Tamamlanmayan görevdeki personel bilgisi, varsa kullan
              const task = tasks[taskId];
              if (task && task.personnelId) {
                latestMissedPersonnelId = task.personnelId;
              }
            }
          }
        }

        // En son bulunan görev kaydındaki personel bilgisini kullan
        if (latestMissedPersonnelId && personnelList[latestMissedPersonnelId]) {
          return personnelList[latestMissedPersonnelId].name;
        }
      }

      // 3. Hiç görev kaydı bulunamadıysa, görevin kendisinde tanımlı personeli kullan
      const task = tasks[taskId];
      if (task && task.personnelId && personnelList[task.personnelId]) {
        return personnelList[task.personnelId].name;
      }
      
    } catch (error) {
      console.error('Personel bilgisi bulunurken hata:', error);
    }
    
    return personnelName || 'Bilinmeyen';
  };

  // Tasks ve Surveys yüklendiğinde ReportItems'ları güncelle
  useEffect(() => {
    if (reportItems.length > 0 && 
        (Object.keys(tasks).length > 0 || 
         Object.keys(surveys).length > 0 || 
         Object.keys(personnelList).length > 0)) {
      
      setReportItems(prevItems => 
        prevItems.map(item => {
          const responseDate = new Date(item.createdAt);
          const personnelName = findPersonnelName(
            item.taskId, 
            responseDate, 
            tasks, 
            completedTasks, 
            missedTasks, 
            personnelList
          );
          
          return {
            ...item,
            taskName: tasks[item.taskId]?.name || item.taskName,
            surveyTitle: surveys[item.surveyId]?.title || item.surveyTitle,
            personnelName: personnelName
          };
        })
      );
    }
  }, [tasks, surveys, personnelList, completedTasks, missedTasks]);

  // Filtreleme fonksiyonu
  const filteredReportItems = reportItems.filter(item => {
    let matchesTask = true;
    let matchesSurvey = true;
    let matchesDateRange = true;
    let matchesAnswerType = true;

    if (selectedTaskId) {
      matchesTask = item.taskId === selectedTaskId;
    }

    if (selectedSurveyId) {
      matchesSurvey = item.surveyId === selectedSurveyId;
    }

    if (selectedAnswerType) {
      matchesAnswerType = item.answerType === selectedAnswerType;
    }

    if (startDate) {
      const itemDate = new Date(item.createdAt);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matchesDateRange = itemDate >= start;
    }

    if (endDate) {
      const itemDate = new Date(item.createdAt);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesDateRange = matchesDateRange && itemDate <= end;
    }

    return matchesTask && matchesSurvey && matchesAnswerType && matchesDateRange;
  });

  // Sayfa değiştirme işleyicisi
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  // Anket cevaplarını göreve ve yanıt ID'sine göre grupla
  const groupedReports: { [key: string]: ReportItem[] } = {};
  filteredReportItems.forEach(item => {
    const key = `${item.taskId}-${item.responseId}`;
    if (!groupedReports[key]) {
      groupedReports[key] = [];
    }
    groupedReports[key].push(item);
  });

  // Grupları listeye dönüştür
  const groupedReportsList = Object.values(groupedReports);
  
  // Toplam sayfa sayısını hesapla
  const totalPages = Math.max(1, Math.ceil(groupedReportsList.length / itemsPerPage));
  
  // Geçerli sayfayı sınırla
  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [totalPages, page]);
  
  // Sayfalandırılmış grupları al
  const paginatedGroups = groupedReportsList.slice(
    (page - 1) * itemsPerPage,
    Math.min(page * itemsPerPage, groupedReportsList.length)
  );

  // Excel dışa aktarma fonksiyonu
  const exportToExcel = async () => {
    try {
      // Excel workbook oluştur
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Anket Raporları');
      
      // Sütun başlıklarını tanımla
      worksheet.columns = [
        { header: 'Görev Adı', key: 'taskName', width: 30 },
        { header: 'Personel', key: 'personnelName', width: 20 },
        { header: 'Anket Sorusu', key: 'questionTitle', width: 40 },
        { header: 'Anket Cevabı', key: 'answer', width: 30 },
        { header: 'Cevap Tipi', key: 'answerType', width: 15 },
        { header: 'Cevap Tarihi', key: 'createdAt', width: 20 }
      ];
      
      // Stil tanımlamaları
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4F81BD' } },
        border: {
          top: { style: 'thin' as const },
          left: { style: 'thin' as const },
          bottom: { style: 'thin' as const },
          right: { style: 'thin' as const }
        }
      };
      
      // Başlık stilini uygula
      worksheet.getRow(1).eachCell(cell => {
        cell.style = headerStyle;
      });
      
      // Filtrelenmiş rapor verilerini ekle
      filteredReportItems.forEach(item => {
        // Cevap tipini Türkçe olarak belirle
        const answerTypeText = item.answerType === 'positive' 
          ? 'Olumlu' 
          : item.answerType === 'negative' 
            ? 'Olumsuz' 
            : 'Nötr';
        
        // Cevap tarihi
        const createdAtDate = new Date(item.createdAt).toLocaleString('tr-TR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        // Satır ekleme
        worksheet.addRow({
          taskName: item.taskName,
          personnelName: item.personnelName,
          questionTitle: item.questionTitle,
          answer: item.answer,
          answerType: answerTypeText,
          createdAt: createdAtDate
        });
      });
      
      // Zebrastripe (alternatif satır renklendirme)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // başlığı atla
          const fillColor = rowNumber % 2 === 0 ? 'FFF2F2F2' : 'FFFFFFFF';
          row.eachCell(cell => {
            cell.style = {
              fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: fillColor } },
              border: {
                top: { style: 'thin' as const },
                left: { style: 'thin' as const },
                bottom: { style: 'thin' as const },
                right: { style: 'thin' as const }
              }
            };
          });
        }
      });
      
      // Excel dosyasını oluştur ve indir
      const buffer = await workbook.xlsx.writeBuffer();
      const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      saveAs(new Blob([buffer]), `Anket_Raporları_${currentDate}.xlsx`);
      
    } catch (error) {
      console.error('Excel dışa aktarma hatası:', error);
      alert('Excel dosyası oluşturulurken bir hata oluştu.');
    }
  };

  return (
    <Paper sx={{ p: { xs: 1, sm: 2, md: 3 }, overflowX: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" component="h2">
          Anket Raporları
        </Typography>
        <Button
          variant="contained"
          color="info"
          startIcon={<DownloadIcon />}
          onClick={exportToExcel}
          disabled={loading || filteredReportItems.length === 0}
          size="small"
        >
          Excel İndir
        </Button>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {/* Filtre Bölümü */}
      <Box sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.5 }}>
          <FormControl fullWidth size="small">
            <Autocomplete
              size="small"
              options={Object.values(tasks)}
              getOptionLabel={(option) => option.name || ''}
              value={selectedTaskId ? tasks[selectedTaskId] || null : null}
              onChange={(event, newValue) => {
                setSelectedTaskId(newValue?.id || '');
                setPage(1); // Filtreleme değiştiğinde ilk sayfaya dön
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Görev Filtrele"
                  margin="dense"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <MenuItem {...props}>
                  {option.name}
                </MenuItem>
              )}
              isOptionEqualToValue={(option, value) => option.id === value?.id}
              noOptionsText="Görev bulunamadı"
              clearText="Tümünü Temizle"
              openText="Aç"
              closeText="Kapat"
            />
          </FormControl>
          
          <FormControl fullWidth size="small">
            <Autocomplete
              size="small"
              options={Object.values(surveys)}
              getOptionLabel={(option) => option.title || ''}
              value={selectedSurveyId ? surveys[selectedSurveyId] || null : null}
              onChange={(event, newValue) => {
                setSelectedSurveyId(newValue?.id || '');
                setPage(1); // Filtreleme değiştiğinde ilk sayfaya dön
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Anket Filtrele"
                  margin="dense"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <MenuItem {...props}>
                  {option.title}
                </MenuItem>
              )}
              isOptionEqualToValue={(option, value) => option.id === value?.id}
              noOptionsText="Anket bulunamadı"
              clearText="Tümünü Temizle"
              openText="Aç"
              closeText="Kapat"
            />
          </FormControl>
        </Stack>
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            label="Başlangıç Tarihi"
            type="date"
            size="small"
            margin="dense"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={startDate ? startDate.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              if (e.target.value) {
                setStartDate(new Date(e.target.value));
              } else {
                setStartDate(null);
              }
              setPage(1); // Filtreleme değiştiğinde ilk sayfaya dön
            }}
          />
          
          <TextField
            label="Bitiş Tarihi"
            type="date"
            size="small"
            margin="dense"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={endDate ? endDate.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              if (e.target.value) {
                setEndDate(new Date(e.target.value));
              } else {
                setEndDate(null);
              }
              setPage(1); // Filtreleme değiştiğinde ilk sayfaya dön
            }}
          />
          
          <FormControl fullWidth size="small">
            <InputLabel>Cevap Tipi</InputLabel>
            <Select
              margin="dense"
              value={selectedAnswerType}
              label="Cevap Tipi"
              onChange={(e) => {
                setSelectedAnswerType(e.target.value as string);
                setPage(1); // Filtreleme değiştiğinde ilk sayfaya dön
              }}
            >
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="positive">Olumlu</MenuItem>
              <MenuItem value="negative">Olumsuz</MenuItem>
              <MenuItem value="neutral">Nötr</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* Rapor Tablosu */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      ) : groupedReportsList.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
          Seçilen kriterlere uygun anket yanıtı bulunamadı.
        </Typography>
      ) : (
        <>
          <TableContainer sx={{ maxWidth: '100%' }}>
            <Table size="small" sx={{ minWidth: { xs: 500, sm: 650 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 100, fontSize: '0.75rem', padding: 0.5, fontWeight: 'bold' }}>Görev Adı</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 100, fontSize: '0.75rem', padding: 0.5, fontWeight: 'bold' }}>Personel</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 130, fontSize: '0.75rem', padding: 0.5, fontWeight: 'bold' }}>Anket Sorusu</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 80, fontSize: '0.75rem', padding: 0.5, fontWeight: 'bold' }}>Anket Cevabı</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 100, fontSize: '0.75rem', padding: 0.5, fontWeight: 'bold' }}>Cevap Tarihi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedGroups.map((group, groupIndex) => (
                  <React.Fragment key={`group-${groupIndex}`}>
                    {group.map((item, itemIndex) => (
                      <TableRow key={`${item.responseId}-${item.surveyId}`}>
                        {itemIndex === 0 && (
                          <TableCell rowSpan={group.length} sx={{ padding: 0.5 }}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 90, sm: 140 }, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.75rem' }}>
                              {item.taskName}
                            </Typography>
                          </TableCell>
                        )}
                        {itemIndex === 0 && (
                          <TableCell rowSpan={group.length} sx={{ padding: 0.5 }}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 90, sm: 140 }, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.75rem' }}>
                              {item.personnelName}
                            </Typography>
                          </TableCell>
                        )}
                        <TableCell sx={{ padding: 0.5 }}>
                          <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 90, sm: 170 }, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.75rem' }}>
                            {item.questionTitle}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ padding: 0.5 }}>
                          <Chip
                            label={item.answer}
                            size="small"
                            color={
                              item.answerType === 'positive' 
                                ? 'success' 
                                : item.answerType === 'negative' 
                                ? 'error' 
                                : 'default'
                            }
                            sx={{ 
                              maxWidth: { xs: 65, sm: 100 }, 
                              height: 20,
                              "& .MuiChip-label": { 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                fontSize: '0.65rem',
                                px: 0.75 
                              } 
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ padding: 0.5 }}>
                          <Typography variant="body2" noWrap sx={{ fontSize: '0.75rem' }}>
                            {new Date(item.createdAt).toLocaleString('tr-TR')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
              size="small"
              showFirstButton
              showLastButton
            />
          </Box>
        </>
      )}
    </Paper>
  );
};

export default SurveyReports;