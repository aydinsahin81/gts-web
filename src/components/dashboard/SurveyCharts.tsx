import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  CardHeader, 
  Divider, 
  Grid, 
  Typography, 
  IconButton,
  CircularProgress,
  styled,
  Avatar,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { ref, get, onValue } from 'firebase/database';
import { database } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbsUpDownIcon from '@mui/icons-material/ThumbsUpDown';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ShowChartIcon from '@mui/icons-material/ShowChart';

// Tema renkleri
const SURVEY_COLORS = {
  positive: '#4CAF50', // Yeşil
  neutral: '#9E9E9E',  // Gri
  negative: '#F44336', // Kırmızı
};

// Chart Container kullanımı Dashboard ile aynı olsun
const ChartContainer = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  borderRadius: 8,
  '& .MuiTypography-h6': {
    fontSize: '1rem',
    fontWeight: 'bold',
  },
}));

// Anket tipi için arayüz
interface SurveyResponseData {
  answerType: 'positive' | 'negative' | 'neutral';
  questionTitle: string;
  selectedAnswer: string;
}

interface SurveyResponse {
  answers: {
    [surveyId: string]: SurveyResponseData
  };
  createdAt: number;
  taskId: string;
}

// Son 1 ay için tarih hesaplama yardımcı fonksiyonu
const getLastMonthDate = (): Date => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date;
};

// Tarih formatla yardımcı fonksiyonu (dd-MM-yyyy)
const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const SurveyCharts: React.FC = () => {
  const { currentUser, userDetails } = useAuth();
  const [loading, setLoading] = useState(true);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
  const [overallStatsData, setOverallStatsData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [overallInfoModalOpen, setOverallInfoModalOpen] = useState(false);
  const [trendInfoModalOpen, setTrendInfoModalOpen] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    if (!userDetails?.companyId) {
      setLoading(false);
      return;
    }

    // Son 1 ay için tarih hesapla
    const lastMonth = getLastMonthDate();
    
    // Anket cevaplarını çek
    const fetchSurveyData = async () => {
      setLoading(true);
      
      const answeredSurveysRef = ref(database, `companies/${userDetails.companyId}/answeredSurveys`);
      
      try {
        const unsubscribe = onValue(answeredSurveysRef, (snapshot) => {
          if (!snapshot.exists()) {
            setSurveyResponses([]);
            setLoading(false);
            return;
          }
          
          const surveysData = snapshot.val();
          const allResponses: SurveyResponse[] = [];
          
          // Her görev için anket cevaplarını al
          Object.entries(surveysData).forEach(([taskId, taskResponses]: [string, any]) => {
            // Her cevap için
            Object.entries(taskResponses).forEach(([responseId, response]: [string, any]) => {
              if (!response.answers || !response.createdAt) return;
              
              // Son 1 aylık cevapları filtrele
              const responseDate = new Date(response.createdAt);
              if (responseDate >= lastMonth) {
                allResponses.push({
                  answers: response.answers,
                  createdAt: response.createdAt,
                  taskId: taskId
                });
              }
            });
          });
          
          setSurveyResponses(allResponses);
          
          // İstatistikleri hesapla
          calculateStats(allResponses);
          
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error("Anket verileri yüklenirken hata:", error);
        setLoading(false);
      }
    };
    
    fetchSurveyData();
  }, [userDetails]);
  
  // İstatistikleri hesapla
  const calculateStats = (responses: SurveyResponse[]) => {
    if (responses.length === 0) {
      setOverallStatsData([]);
      setTrendData([]);
      return;
    }
    
    // Genel istatistikler için
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    
    // Trend istatistikleri için
    const trendMap: Record<string, { date: string, positive: number, neutral: number, negative: number, total: number }> = {};
    
    // Son 30 günün tarihlerini oluştur
    const today = new Date();
    const lastMonth = getLastMonthDate();
    
    // Tarih aralığını haftalık olarak böl
    const weeklyTrendMap: Record<string, { week: string, positive: number, neutral: number, negative: number, total: number }> = {};
    
    // Haftalık etiketleri oluştur
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (i * 7) - 6);
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() - (i * 7));
      
      const weekLabel = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
      weeklyTrendMap[i] = { 
        week: `${i+1}. Hafta`, 
        positive: 0, 
        neutral: 0, 
        negative: 0, 
        total: 0 
      };
    }
    
    // Tüm cevapları dolaş
    responses.forEach(response => {
      const responseDate = new Date(response.createdAt);
      
      // Hangi haftaya denk geldiğini hesapla
      const daysAgo = Math.floor((today.getTime() - responseDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.min(3, Math.floor(daysAgo / 7));
      
      // Her anket cevabı için
      Object.values(response.answers).forEach(answer => {
        // Genel istatistikler için say
        if (answer.answerType === 'positive') {
          positiveCount++;
          weeklyTrendMap[weekIndex].positive++;
        } else if (answer.answerType === 'neutral') {
          neutralCount++;
          weeklyTrendMap[weekIndex].neutral++;
        } else if (answer.answerType === 'negative') {
          negativeCount++;
          weeklyTrendMap[weekIndex].negative++;
        }
        
        weeklyTrendMap[weekIndex].total++;
      });
    });
    
    // Genel istatistik verisini ayarla
    setOverallStatsData([
      { name: 'Olumlu', value: positiveCount, color: SURVEY_COLORS.positive },
      { name: 'Nötr', value: neutralCount, color: SURVEY_COLORS.neutral },
      { name: 'Olumsuz', value: negativeCount, color: SURVEY_COLORS.negative }
    ]);
    
    // Haftalık trend verisini yüzdelere dönüştür ve ayarla
    const weeklyTrendData = Object.values(weeklyTrendMap)
      .map(week => ({
        week: week.week,
        positivePercent: week.total > 0 ? Math.round((week.positive / week.total) * 100) : 0,
        neutralPercent: week.total > 0 ? Math.round((week.neutral / week.total) * 100) : 0,
        negativePercent: week.total > 0 ? Math.round((week.negative / week.total) * 100) : 0,
        total: week.total
      }))
      .sort((a, b) => a.week.localeCompare(b.week)); // Haftaya göre sırala
    
    setTrendData(weeklyTrendData);
  };

  // Tooltip formatter - genel memnuniyet grafiği için
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: 'background.paper', p: 1, border: '1px solid #ccc', borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="bold">{`${payload[0].name}: ${payload[0].value}`}</Typography>
          <Typography variant="body2">
            {`Oran: %${((payload[0].value / overallStatsData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}`}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  // Tooltip formatter - trend grafiği için
  const renderTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: 'background.paper', p: 1, border: '1px solid #ccc', borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="bold">{label}</Typography>
          {payload.map((entry: any, index: number) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Box sx={{ width: 10, height: 10, bgcolor: entry.color, borderRadius: '50%' }} />
              <Typography variant="body2">
                {`${entry.name}: %${entry.value}`}
              </Typography>
            </Box>
          ))}
          <Typography variant="body2" fontSize="11px" color="text.secondary" mt={0.5}>
            {`Toplam: ${payload[0].payload.total} cevap`}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  // Modal açma/kapama fonksiyonları
  const handleOpenOverallInfoModal = () => {
    setOverallInfoModalOpen(true);
  };

  const handleCloseOverallInfoModal = () => {
    setOverallInfoModalOpen(false);
  };

  const handleOpenTrendInfoModal = () => {
    setTrendInfoModalOpen(true);
  };

  const handleCloseTrendInfoModal = () => {
    setTrendInfoModalOpen(false);
  };

  return (
    <Grid container spacing={1}>
      <Grid item xs={12} md={6}>
        <ChartContainer>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              Genel Anket Memnuniyet Oranı
            </Typography>
            <IconButton onClick={handleOpenOverallInfoModal} size="small" color="primary">
              <InfoOutlinedIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 1 }} />
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <CircularProgress />
            </Box>
          ) : overallStatsData.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <Typography variant="body2" color="textSecondary">Henüz anket verisi bulunmuyor</Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={overallStatsData}
                margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip content={renderCustomTooltip} />
                <Legend verticalAlign="bottom" height={36} />
                <Bar dataKey="value" name="Cevap Sayısı" barSize={30}>
                  {overallStatsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <ChartContainer>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              Son 1 Ay Memnuniyet Trendi
            </Typography>
            <IconButton onClick={handleOpenTrendInfoModal} size="small" color="primary">
              <InfoOutlinedIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 1 }} />
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <CircularProgress />
            </Box>
          ) : trendData.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <Typography variant="body2" color="textSecondary">Henüz anket verisi bulunmuyor</Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={trendData}
                margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" />
                <YAxis label={{ value: 'Yüzde (%)', angle: -90, position: 'insideLeft' }} />
                <RechartsTooltip content={renderTrendTooltip} />
                <Legend verticalAlign="bottom" height={36} />
                <Bar dataKey="positivePercent" name="Olumlu" fill={SURVEY_COLORS.positive} stackId="a" barSize={12} />
                <Bar dataKey="neutralPercent" name="Nötr" fill={SURVEY_COLORS.neutral} stackId="a" barSize={12} />
                <Bar dataKey="negativePercent" name="Olumsuz" fill={SURVEY_COLORS.negative} stackId="a" barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      </Grid>

      {/* Genel Memnuniyet İnfo Modalı */}
      <Dialog
        open={overallInfoModalOpen}
        onClose={handleCloseOverallInfoModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <AssessmentIcon sx={{ mr: 1, color: 'primary.main' }} />
            Genel Anket Memnuniyet Oranı Hakkında
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Bu grafik, müşteri memnuniyet anketlerindeki tüm cevapların dağılımını göstermektedir. 
            Her bir çubuk, anket cevap tiplerinin sayısını temsil eder:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <ThumbUpIcon sx={{ color: SURVEY_COLORS.positive }} />
              </ListItemIcon>
              <ListItemText 
                primary="Olumlu" 
                secondary="Müşterilerin olumlu değerlendirmeleri (örn. 'Evet', 'Memnunum', vb.)"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ThumbsUpDownIcon sx={{ color: SURVEY_COLORS.neutral }} />
              </ListItemIcon>
              <ListItemText 
                primary="Nötr" 
                secondary="Müşterilerin nötr değerlendirmeleri (örn. 'Kısmen', 'Orta', vb.)"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ThumbDownIcon sx={{ color: SURVEY_COLORS.negative }} />
              </ListItemIcon>
              <ListItemText 
                primary="Olumsuz" 
                secondary="Müşterilerin olumsuz değerlendirmeleri (örn. 'Hayır', 'Memnun değilim', vb.)"
              />
            </ListItem>
          </List>
          <Typography paragraph>
            Bu grafik sayesinde, müşteri memnuniyeti konusunda genel bir bakış açısı elde edebilir ve 
            hangi alanlarda iyileştirme yapmanız gerektiğini belirleyebilirsiniz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOverallInfoModal}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Trend İnfo Modalı */}
      <Dialog
        open={trendInfoModalOpen}
        onClose={handleCloseTrendInfoModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <ShowChartIcon sx={{ mr: 1, color: 'primary.main' }} />
            Son 1 Ay Memnuniyet Trendi Hakkında
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Bu grafik, son 1 ay içerisinde haftalık olarak müşteri memnuniyet anketlerindeki 
            cevapların dağılımını yüzde olarak göstermektedir.
          </Typography>
          <Typography paragraph>
            Her bir çubuk, ilgili haftadaki anket cevaplarının yüzdesel dağılımını gösterir:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <ThumbUpIcon sx={{ color: SURVEY_COLORS.positive }} />
              </ListItemIcon>
              <ListItemText 
                primary="Olumlu (Yeşil)" 
                secondary="Olumlu cevapların o haftadaki tüm cevaplara oranı"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ThumbsUpDownIcon sx={{ color: SURVEY_COLORS.neutral }} />
              </ListItemIcon>
              <ListItemText 
                primary="Nötr (Gri)" 
                secondary="Nötr cevapların o haftadaki tüm cevaplara oranı"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ThumbDownIcon sx={{ color: SURVEY_COLORS.negative }} />
              </ListItemIcon>
              <ListItemText 
                primary="Olumsuz (Kırmızı)" 
                secondary="Olumsuz cevapların o haftadaki tüm cevaplara oranı"
              />
            </ListItem>
          </List>
          <Typography paragraph>
            Bu trend grafiği sayesinde, müşteri memnuniyetinin zaman içerisindeki değişimini 
            takip edebilir ve aldığınız aksiyonların sonuçlarını gözlemleyebilirsiniz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTrendInfoModal}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default SurveyCharts; 