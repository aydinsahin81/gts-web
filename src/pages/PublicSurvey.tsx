import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  List,
  ListItem,
  ListItemText,
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  FormControl, 
  FormLabel,
  Button,
  CircularProgress,
  Divider,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { ref, get, push, set } from 'firebase/database';
import { database } from '../firebase';

interface AnswerItem {
  text: string;
  type: 'positive' | 'negative' | 'neutral';
}

interface Survey {
  id: string;
  title: string;
  answers: AnswerItem[];
  createdAt: number;
  createdBy: string;
  tasks?: string[];
}

interface SurveyResponse {
  surveyId: string;
  questionTitle: string;
  selectedAnswer: string;
  answerType: string;
  taskId: string;
  createdAt: number;
}

const PublicSurvey: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSurveys = async () => {
      if (!taskId) {
        setError('Görev bilgisi bulunamadı.');
        setLoading(false);
        return;
      }

      try {
        // Önce görevi bulmak için tüm şirketlerin tasks koleksiyonlarını kontrol et
        let taskCompanyId = null;
        
        // Herkesin erişebileceği bir yolu kontrol edelim - hem tasks hem de surveys erişimi var mı?
        const allUsersRef = ref(database, 'users');
        await get(allUsersRef); // Bu işlem çalışırsa, kullanıcılar koleksiyonuna en azından okuma erişimimiz var
        
        // Her bir şirket için taskId'yi arayalım
        // Not: Güvenlik kuralları nedeniyle, bu kısım auth olmayan kullanıcılar için çalışmayabilir
        const companiesRef = ref(database, 'companies');
        
        try {
          const companiesSnapshot = await get(companiesRef);
          
          if (companiesSnapshot.exists()) {
            const companies = companiesSnapshot.val();
            // Her şirketi dolaş ve task'ı bul
            for (const companyId in companies) {
              const tasksRef = ref(database, `companies/${companyId}/tasks/${taskId}`);
              
              try {
                const taskSnapshot = await get(tasksRef);
                if (taskSnapshot.exists()) {
                  // Task bulundu, şirket ID'sini kaydet
                  taskCompanyId = companyId;
                  setCompanyId(companyId);
                  break;
                }
              } catch (err) {
                // Bu şirkette task bulunamadı veya erişim engellendi, diğer şirketlere bakalım
                console.log(`${companyId} şirketinde task aranırken erişim hatası:`, err);
              }
            }
          }
        } catch (err) {
          console.error('Şirketlere erişim hatası:', err);
          // Şirketlere erişemiyoruz, başka bir yöntem deneyelim
        }

        // Eğer şirket bulunamadıysa, doğrudan her şirketin survey koleksiyonuna tek tek bakalım
        if (!taskCompanyId) {
          console.log('Task ID ile ilişkili şirket bulunamadı, doğrudan anketleri kontrol ediyoruz...');
          
          const relevantSurveys: Survey[] = [];
          
          try {
            const companiesSnapshot = await get(companiesRef);
            
            if (companiesSnapshot.exists()) {
              const companies = companiesSnapshot.val();
              
              for (const companyId in companies) {
                try {
                  // Her şirketin anketlerini kontrol edelim
                  const surveysRef = ref(database, `companies/${companyId}/surveys`);
                  const surveysSnapshot = await get(surveysRef);
                  
                  if (surveysSnapshot.exists()) {
                    const surveysData = surveysSnapshot.val();
                    
                    // Her anketi kontrol et
                    for (const surveyId in surveysData) {
                      const survey = surveysData[surveyId];
                      
                      if (survey.tasks && Array.isArray(survey.tasks) && survey.tasks.includes(taskId)) {
                        relevantSurveys.push({
                          id: surveyId,
                          title: survey.title,
                          answers: survey.answers || [],
                          createdAt: survey.createdAt,
                          createdBy: survey.createdBy,
                          tasks: survey.tasks
                        });
                        
                        // İlgili anket bulundu, şirket ID'sini kaydet
                        setCompanyId(companyId);
                      }
                    }
                  }
                } catch (err) {
                  console.log(`${companyId} şirketinin anketlerine erişim hatası:`, err);
                  // Bu şirkete erişim yok, diğer şirketlere bakalım
                }
              }
            }
          } catch (err) {
            console.error('Şirketlere erişim hatası:', err);
          }
          
          console.log('Bulunan anketler:', relevantSurveys);
          setSurveys(relevantSurveys);
          setLoading(false);
          return;
        }
        
        // Şirket bulunduysa, sadece o şirketin anketlerini kontrol et
        console.log('Task ID ile ilişkili şirket bulundu:', taskCompanyId);
        const relevantSurveys: Survey[] = [];
        const surveysRef = ref(database, `companies/${taskCompanyId}/surveys`);
        
        try {
          const surveysSnapshot = await get(surveysRef);
          
          if (surveysSnapshot.exists()) {
            const surveysData = surveysSnapshot.val();
            
            // Her anketi kontrol et
            for (const surveyId in surveysData) {
              const survey = surveysData[surveyId];
              
              // Anketin tasks dizisinde aranan taskId varsa listeye ekle
              if (survey.tasks && Array.isArray(survey.tasks) && survey.tasks.includes(taskId)) {
                relevantSurveys.push({
                  id: surveyId,
                  title: survey.title,
                  answers: survey.answers || [],
                  createdAt: survey.createdAt,
                  createdBy: survey.createdBy,
                  tasks: survey.tasks
                });
              }
            }
          }
        } catch (err) {
          console.error(`${taskCompanyId} şirketinin anketlerine erişim hatası:`, err);
        }
        
        console.log('Bulunan anketler:', relevantSurveys);
        setSurveys(relevantSurveys);
        setLoading(false);
      } catch (error) {
        console.error('Anketler yüklenirken hata:', error);
        setError('Anketler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        setLoading(false);
      }
    };

    fetchSurveys();
  }, [taskId]);

  const handleResponseChange = (surveyId: string, answer: string) => {
    setResponses(prev => ({
      ...prev,
      [surveyId]: answer
    }));
  };

  const handleSubmit = async () => {
    if (!taskId || !companyId) return;
    
    // Tüm anketlerin yanıtlandığını kontrol et
    const allAnswered = surveys.every(survey => responses[survey.id]);
    
    if (!allAnswered) {
      setError('Lütfen tüm soruları cevaplayınız.');
      return;
    }
    
    setSubmitting(true);
    setError(null);

    try {
      const responseData: { [key: string]: any } = {
        createdAt: Date.now(),
        taskId: taskId,
        answers: {} 
      };
      
      // Tüm cevapları responseData'ya ekle
      for (const survey of surveys) {
        const selectedAnswer = survey.answers.find(a => a.text === responses[survey.id]);
        
        if (!selectedAnswer) {
          throw new Error(`${survey.title} sorusu için seçilen cevap bulunamadı.`);
        }
        
        responseData.answers[survey.id] = {
          questionTitle: survey.title,
          selectedAnswer: selectedAnswer.text,
          answerType: selectedAnswer.type
        };
      }

      // Yanıtları veritabanına kaydet
      const answeredSurveysRef = ref(database, `companies/${companyId}/answeredSurveys/${taskId}`);
      const newResponseRef = push(answeredSurveysRef);
      await set(newResponseRef, responseData);

      setSubmitted(true);
    } catch (error) {
      console.error('Cevaplar gönderilirken hata:', error);
      setError('Cevaplarınız gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (surveys.length === 0) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Müşteri Memnuniyet Anketi
          </Typography>
          <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
              Bu görev için henüz anket tanımlanmamış.
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Görev ID: {taskId}
            </Typography>
          </Box>
          <Box sx={{ mt: 4 }}>
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} MT Teknoloji. Tüm hakları saklıdır.
            </Typography>
          </Box>
        </Paper>
      </Container>
    );
  }

  if (submitted) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" component="h1" gutterBottom color="success.main">
            Teşekkürler!
          </Typography>
          <Box sx={{ my: 4 }}>
            <Typography variant="body1">
              Değerlendirmeniz için teşekkür ederiz. Görüşleriniz bizim için önemli.
            </Typography>
          </Box>
          <Box sx={{ mt: 4 }}>
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} MT Teknoloji. Tüm hakları saklıdır.
            </Typography>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
          Müşteri Memnuniyet Anketi
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
          Hizmetimizi değerlendirmeniz için aşağıdaki soruları cevaplayınız.
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Box sx={{ 
          maxHeight: '60vh', 
          overflow: 'auto', 
          mb: 4,
          pr: 1,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '10px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '10px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#666',
          }
        }}>
          <List>
            {surveys.map((survey, index) => (
              <ListItem key={survey.id} sx={{ display: 'block', mb: 3, p: 0 }}>
                <Card variant="outlined" sx={{ mb: 1 }}>
                  <CardContent>
                    <FormControl component="fieldset" fullWidth>
                      <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'medium' }}>
                        {index + 1}. {survey.title}
                      </FormLabel>
                      <RadioGroup
                        value={responses[survey.id] || ''}
                        onChange={(e) => handleResponseChange(survey.id, e.target.value)}
                      >
                        {survey.answers.map((answer, ansIndex) => (
                          <FormControlLabel
                            key={ansIndex}
                            value={answer.text}
                            control={<Radio />}
                            label={answer.text}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </CardContent>
                </Card>
                {index < surveys.length - 1 && <Divider />}
              </ListItem>
            ))}
          </List>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={submitting}
            sx={{ px: 4, py: 1 }}
          >
            {submitting ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Gönderiliyor...
              </>
            ) : (
              'Anketi Gönder'
            )}
          </Button>
        </Box>
      </Paper>
      
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} MT Teknoloji. Tüm hakları saklıdır.
        </Typography>
      </Box>
    </Container>
  );
};

export default PublicSurvey; 