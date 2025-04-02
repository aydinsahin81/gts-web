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
  TextField
} from '@mui/material';
import { ref, onValue, get } from 'firebase/database';
import { database } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

interface Task {
  id: string;
  name: string;
  description: string;
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
}

const SurveyReports: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [surveys, setSurveys] = useState<Record<string, Survey>>({});
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

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
                description: data.description || ''
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

                // Her anket cevabı için
                Object.entries(response.answers).forEach(([surveyId, answerData]: [string, any]) => {
                  // Veriler yüklenirken task veya survey henüz mevcut olmayabilir
                  const taskName = tasks[taskId]?.name || 'Yükleniyor...';
                  const surveyTitle = surveys[surveyId]?.title || 'Yükleniyor...';
                  
                  reportItemsList.push({
                    taskId,
                    taskName,
                    surveyId,
                    surveyTitle,
                    answer: answerData.selectedAnswer,
                    answerType: answerData.answerType,
                    createdAt: response.createdAt || 0,
                    responseId,
                    questionTitle: answerData.questionTitle || ''
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

  // Tasks ve Surveys yüklendiğinde ReportItems'ları güncelle
  useEffect(() => {
    if (reportItems.length > 0 && (Object.keys(tasks).length > 0 || Object.keys(surveys).length > 0)) {
      setReportItems(prevItems => 
        prevItems.map(item => ({
          ...item,
          taskName: tasks[item.taskId]?.name || item.taskName,
          surveyTitle: surveys[item.surveyId]?.title || item.surveyTitle
        }))
      );
    }
  }, [tasks, surveys]);

  // Filtreleme fonksiyonu
  const filteredReportItems = reportItems.filter(item => {
    let matchesTask = true;
    let matchesSurvey = true;
    let matchesDateRange = true;

    if (selectedTaskId) {
      matchesTask = item.taskId === selectedTaskId;
    }

    if (selectedSurveyId) {
      matchesSurvey = item.surveyId === selectedSurveyId;
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

    return matchesTask && matchesSurvey && matchesDateRange;
  });

  // Anket cevaplarını göreve ve yanıt ID'sine göre grupla
  const groupedReports: { [key: string]: ReportItem[] } = {};
  filteredReportItems.forEach(item => {
    const key = `${item.taskId}-${item.responseId}`;
    if (!groupedReports[key]) {
      groupedReports[key] = [];
    }
    groupedReports[key].push(item);
  });

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Anket Raporları
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* Filtre Bölümü */}
      <Box sx={{ mb: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Görev Filtrele</InputLabel>
            <Select
              value={selectedTaskId}
              label="Görev Filtrele"
              onChange={(e) => setSelectedTaskId(e.target.value as string)}
            >
              <MenuItem value="">Tümü</MenuItem>
              {Object.values(tasks).map(task => (
                <MenuItem key={task.id} value={task.id}>{task.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth size="small">
            <InputLabel>Anket Filtrele</InputLabel>
            <Select
              value={selectedSurveyId}
              label="Anket Filtrele"
              onChange={(e) => setSelectedSurveyId(e.target.value as string)}
            >
              <MenuItem value="">Tümü</MenuItem>
              {Object.values(surveys).map(survey => (
                <MenuItem key={survey.id} value={survey.id}>{survey.title}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Başlangıç Tarihi"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={startDate ? startDate.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              if (e.target.value) {
                setStartDate(new Date(e.target.value));
              } else {
                setStartDate(null);
              }
            }}
          />
          
          <TextField
            label="Bitiş Tarihi"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={endDate ? endDate.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              if (e.target.value) {
                setEndDate(new Date(e.target.value));
              } else {
                setEndDate(null);
              }
            }}
          />
        </Stack>
      </Box>

      {/* Rapor Tablosu */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : Object.keys(groupedReports).length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          Seçilen kriterlere uygun anket yanıtı bulunamadı.
        </Typography>
      ) : (
        <TableContainer sx={{ maxHeight: 400, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Görev Adı</TableCell>
                <TableCell>Anket Sorusu</TableCell>
                <TableCell>Anket Cevabı</TableCell>
                <TableCell>Cevap Tarihi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.values(groupedReports).map((group, groupIndex) => (
                <React.Fragment key={`group-${groupIndex}`}>
                  {group.map((item, itemIndex) => (
                    <TableRow key={`${item.responseId}-${item.surveyId}`}>
                      {itemIndex === 0 && (
                        <TableCell rowSpan={group.length}>
                          <Typography variant="body2">
                            {item.taskName}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        <Typography variant="body2">
                          {item.questionTitle}
                        </Typography>
                      </TableCell>
                      <TableCell>
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
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
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
      )}
    </Paper>
  );
};

export default SurveyReports; 