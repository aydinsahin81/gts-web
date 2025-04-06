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
  branchId?: string;
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

// SurveyReports interface'i
interface SurveyReportsProps {
  isManager?: boolean;
  branchId?: string;
}

const SurveyReports: React.FC<SurveyReportsProps> = ({ isManager = false, branchId }) => {
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
    
    // Verilerin yüklenme durumunu takip eden state'ler
    let tasksLoaded = false;
    let personnelLoaded = false;
    let surveysLoaded = false;
    
    // Yüklenen veri nesneleri
    let tasksData: Record<string, Task> = {};
    let personnelData: Record<string, Personnel> = {};
    let surveysData: Record<string, Survey> = {};

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

        // Unsubscribe fonksiyonlarını saklayacak dizi
        const unsubscribes: (() => void)[] = [];
        
        // Görev verilerini yükle (önce)
        const tasksPromise = new Promise<void>((resolve) => {
          const tasksRef = ref(database, `companies/${companyId}/tasks`);
          const unsubscribe = onValue(tasksRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              tasksData = {};
              
              Object.entries(data).forEach(([id, data]: [string, any]) => {
                tasksData[id] = {
                  id,
                  name: data.name || 'İsimsiz Görev',
                  description: data.description || '',
                  personnelId: data.personnelId || '',
                  branchId: data.branchId || ''
                };
              });
              
              setTasks(tasksData);
              tasksLoaded = true;
              console.log("Görev verileri yüklendi");
            }
            resolve();
          });
          unsubscribes.push(unsubscribe);
        });
        
        // Personel verilerini yükle (önce)
        const personnelPromise = new Promise<void>((resolve) => {
        const personnelRef = ref(database, `companies/${companyId}/personnel`);
          const unsubscribe = onValue(personnelRef, (snapshot) => {
          if (snapshot.exists()) {
              const data = snapshot.val();
              personnelData = {};
            
              Object.entries(data).forEach(([id, data]: [string, any]) => {
                personnelData[id] = {
                id,
                name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'İsimsiz Personel'
              };
            });
            
              setPersonnelList(personnelData);
              personnelLoaded = true;
              console.log("Personel verileri yüklendi");
            }
            resolve();
          });
          unsubscribes.push(unsubscribe);
        });
        
        // Anket verilerini yükle (önce)
        const surveysPromise = new Promise<void>((resolve) => {
          const surveysRef = ref(database, `companies/${companyId}/surveys`);
          const unsubscribe = onValue(surveysRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              surveysData = {};
              
              Object.entries(data).forEach(([id, data]: [string, any]) => {
                surveysData[id] = {
                  id,
                  title: data.title || 'İsimsiz Anket'
                };
              });
              
              setSurveys(surveysData);
              surveysLoaded = true;
              console.log("Anket verileri yüklendi");
            }
            resolve();
          });
          unsubscribes.push(unsubscribe);
        });
        
        // Tüm ana veri yükleme işlemlerini tamamla
        await Promise.all([tasksPromise, personnelPromise, surveysPromise]);
        console.log("Tüm ana veriler yüklendi");
        
        // Yardımcı veriler (tamamlanmış ve tamamlanmamış görevler)
        const completedTasksRef = ref(database, `companies/${companyId}/completedTasks`);
        const unsubscribeCompleted = onValue(completedTasksRef, (snapshot) => {
          if (snapshot.exists()) {
            setCompletedTasks(snapshot.val());
          }
        });
        unsubscribes.push(unsubscribeCompleted);

        const missedTasksRef = ref(database, `companies/${companyId}/missedTasks`);
        const unsubscribeMissed = onValue(missedTasksRef, (snapshot) => {
          if (snapshot.exists()) {
            setMissedTasks(snapshot.val());
          }
        });
        unsubscribes.push(unsubscribeMissed);
        
        // Ana veriler hazır olduğunda anket cevaplarını yükle
        console.log("Anket cevapları yükleniyor...");
        const answeredSurveysRef = ref(database, `companies/${companyId}/answeredSurveys`);
        const unsubscribeAnswers = onValue(answeredSurveysRef, async (snapshot) => {
          try {
          if (snapshot.exists()) {
            const answeredData = snapshot.val();
            const reportItemsList: ReportItem[] = [];

            // Her görev için cevapları kontrol et
              for (const [taskId, taskResponses] of Object.entries<any>(answeredData)) {
                // Görev bilgisini al - önce local değişkenlerden
                let taskName = 'İsimsiz Görev';
                let task = tasksData[taskId];
                
                if (!task) {
                  // Eğer local değişkenlerde yoksa veritabanından al
                  try {
                    const taskSnapshot = await get(ref(database, `companies/${companyId}/tasks/${taskId}`));
                    if (taskSnapshot.exists()) {
                      const taskData = taskSnapshot.val();
                      taskName = taskData.name || 'İsimsiz Görev';
                      // Task nesnesini oluştur
                      task = {
                        id: taskId,
                        name: taskName,
                        description: taskData.description || '',
                        personnelId: taskData.personnelId || '',
                        branchId: taskData.branchId || ''
                      };
                      // Tasks dizisine ekle
                      tasksData[taskId] = task;
                      setTasks({...tasksData});
                    }
                  } catch (error) {
                    console.error('Görev bilgisi alınırken hata:', error);
                  }
                } else {
                  taskName = task.name;
                }
                
                // Şube bazlı filtreleme
                if (task && isManager && branchId && task.branchId && task.branchId !== branchId) {
                  // Bu görev yöneticinin şubesine ait değilse atla
                  continue;
                }
                
                // Her cevap için
                for (const [responseId, response] of Object.entries<any>(taskResponses)) {
                  if (!response.answers) continue;
                  
                  const responseDate = new Date(response.createdAt);
                  
                  // Her anket cevabı için
                  for (const [surveyId, answerData] of Object.entries<any>(response.answers)) {
                    // Anket başlığını al - önce local değişkenlerden
                    let surveyTitle = 'İsimsiz Anket';
                    const survey = surveysData[surveyId];
                    
                    if (!survey) {
                      // Eğer local değişkenlerde yoksa veritabanından al
                      try {
                        const surveySnapshot = await get(ref(database, `companies/${companyId}/surveys/${surveyId}`));
                        if (surveySnapshot.exists()) {
                          const surveyData = surveySnapshot.val();
                          surveyTitle = surveyData.title || 'İsimsiz Anket';
                          // Surveys dizisine ekle
                          surveysData[surveyId] = {
                            id: surveyId,
                            title: surveyTitle
                          };
                          setSurveys({...surveysData});
                        }
                      } catch (error) {
                        console.error('Anket bilgisi alınırken hata:', error);
                      }
                    } else {
                      surveyTitle = survey.title;
                    }
                    
                    // Personel bilgisini al
                    let personnelName = 'Bilinmeyen';
                    
                    if (task && task.personnelId) {
                      const personnel = personnelData[task.personnelId];
                      if (personnel) {
                        personnelName = personnel.name;
                      } else {
                        // Eğer local değişkenlerde yoksa veritabanından al
                        try {
                          const personnelSnapshot = await get(ref(database, `companies/${companyId}/personnel/${task.personnelId}`));
                          if (personnelSnapshot.exists()) {
                            const personnelData = personnelSnapshot.val();
                            personnelName = personnelData.name || `${personnelData.firstName || ''} ${personnelData.lastName || ''}`.trim() || 'İsimsiz Personel';
                          } else {
                            personnelName = 'Personel Bulunamadı';
                          }
                        } catch (error) {
                          console.error('Personel bilgisi alınırken hata:', error);
                        }
                      }
                    }
                  
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
                  }
                }
              }

            // Raporları tarihe göre sırala (en yeniden en eskiye)
            reportItemsList.sort((a, b) => b.createdAt - a.createdAt);
            setReportItems(reportItemsList);
          }
          } catch (error) {
            console.error('Anket cevapları işlenirken hata:', error);
          } finally {
          setLoading(false);
          }
        });
        unsubscribes.push(unsubscribeAnswers);

        // Temizleme fonksiyonu
        return () => {
          unsubscribes.forEach(unsubscribe => unsubscribe());
        };
      } catch (error) {
        console.error('Rapor verileri yüklenirken hata:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, isManager, branchId]);

  // Personel adını bulma algoritması - artık kullanılmıyor, doğrudan bağlantı kullanılıyor
  const findPersonnelName = (
    taskId: string, 
    responseDate: Date, 
    tasks: Record<string, Task>,
    completedTasks: any,
    missedTasks: any,
    personnelList: Record<string, Personnel>
  ): string => {
    // Basitleştirilmiş yöntem: Sadece görevin kendisindeki personnelId'yi kullan
    try {
      // Görevi bul
              const task = tasks[taskId];
              if (task && task.personnelId) {
        // Personel ID'si varsa ve personel listesinde bulunuyorsa
        if (personnelList[task.personnelId]) {
          return personnelList[task.personnelId].name;
        } else {
          return 'Personel Listede Yok';
        }
      }
    } catch (error) {
      console.error('Personel bilgisi bulunurken hata:', error);
    }
    
    return 'Bilinmeyen';
  };

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

  // Görevler içinden şube bazlı olanları filtreleme
  useEffect(() => {
    if (isManager && branchId && !loading) {
      console.log(`Şube ID'si için rapor filtreleniyor: ${branchId}`);
      
      // Şube görevlerini bul
      const branchTaskIds = Object.values(tasks)
        .filter(task => task.branchId === branchId)
        .map(task => task.id);
      
      console.log(`Şube görevleri: ${branchTaskIds.length} adet`);
      
      // Sadece bu şubeye ait görevlerin raporlarını filtrele
      const branchReports = reportItems.filter(item => 
        branchTaskIds.includes(item.taskId)
      );
      
      if (branchReports.length !== reportItems.length) {
        console.log(`Filtrelenmiş rapor sayısı: ${branchReports.length} / ${reportItems.length}`);
        setReportItems(branchReports);
      }
    }
  }, [isManager, branchId, tasks, reportItems.length, loading]);

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