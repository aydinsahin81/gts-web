import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  IconButton,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { ref, set, push, get } from 'firebase/database';
import { database, auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

interface QuestionModalProps {
  open: boolean;
  onClose: () => void;
}

interface AnswerItem {
  text: string;
  type: 'positive' | 'negative' | 'neutral';
}

const QuestionModal: React.FC<QuestionModalProps> = ({ open, onClose }) => {
  const { currentUser } = useAuth();
  const [questionTitle, setQuestionTitle] = useState('');
  const [answers, setAnswers] = useState<AnswerItem[]>([{ text: '', type: 'neutral' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Şirket ID'sini al
  useEffect(() => {
    const getCompanyId = async () => {
      if (!currentUser) return;
      
      try {
        const userSnapshot = await get(ref(database, `users/${currentUser.uid}`));
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          setCompanyId(userData.companyId || null);
        }
      } catch (err) {
        console.error('Şirket bilgisi alınırken hata:', err);
        setError('Şirket bilgisi alınamadı.');
      }
    };

    getCompanyId();
  }, [currentUser]);

  const handleAddAnswer = () => {
    setAnswers([...answers, { text: '', type: 'neutral' }]);
  };

  const handleRemoveAnswer = (index: number) => {
    const newAnswers = answers.filter((_, i) => i !== index);
    setAnswers(newAnswers);
  };

  const handleAnswerTextChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = { ...newAnswers[index], text: value };
    setAnswers(newAnswers);
  };

  const handleAnswerTypeChange = (index: number, type: 'positive' | 'negative' | 'neutral') => {
    const newAnswers = [...answers];
    newAnswers[index] = { ...newAnswers[index], type };
    setAnswers(newAnswers);
  };

  const getTypeColor = (type: 'positive' | 'negative' | 'neutral') => {
    switch (type) {
      case 'positive': return 'success';
      case 'negative': return 'error';
      case 'neutral': return 'default';
    }
  };

  const getTypeLabel = (type: 'positive' | 'negative' | 'neutral') => {
    switch (type) {
      case 'positive': return 'Olumlu';
      case 'negative': return 'Olumsuz';
      case 'neutral': return 'Nötr';
    }
  };

  const handleSubmit = async () => {
    if (!companyId) {
      setError('Şirket bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    // Boş cevapları filtrele
    const filteredAnswers = answers.filter(answer => answer.text.trim() !== '');
    
    if (filteredAnswers.length === 0) {
      setError('En az bir cevap eklemelisiniz.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const surveyRef = ref(database, `companies/${companyId}/surveys`);
      const newSurveyRef = push(surveyRef);
      
      const surveyData = {
        title: questionTitle,
        answers: filteredAnswers,
        createdAt: Date.now(),
        createdBy: currentUser?.uid,
        tasks: [] // Boş tasks dizisi oluştur
      };

      console.log('Kaydedilecek veri:', surveyData);
      console.log('Kaydedileceği yol:', `companies/${companyId}/surveys/${newSurveyRef.key}`);

      await set(newSurveyRef, surveyData);
      onClose();
      setQuestionTitle('');
      setAnswers([{ text: '', type: 'neutral' }]);
    } catch (err) {
      console.error('Soru eklenirken hata:', err);
      setError('Soru eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Yeni Soru Ekle</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Soru Başlığı"
            value={questionTitle}
            onChange={(e) => setQuestionTitle(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Cevap Seçenekleri
          </Typography>

          {answers.map((answer, index) => (
            <Paper 
              key={index} 
              sx={{ 
                p: 2, 
                mb: 2, 
                display: 'flex', 
                alignItems: 'center',
                gap: 1
              }}
            >
              <Box sx={{ display: 'flex', gap: 2, width: '100%', alignItems: 'center' }}>
                <TextField
                  fullWidth
                  label={`Cevap ${index + 1}`}
                  value={answer.text}
                  onChange={(e) => handleAnswerTextChange(index, e.target.value)}
                />
                
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Durum</InputLabel>
                  <Select
                    value={answer.type}
                    label="Durum"
                    onChange={(e) => handleAnswerTypeChange(index, e.target.value as 'positive' | 'negative' | 'neutral')}
                    size="small"
                  >
                    <MenuItem value="positive">
                      <Chip label="Olumlu" color="success" size="small" />
                    </MenuItem>
                    <MenuItem value="negative">
                      <Chip label="Olumsuz" color="error" size="small" />
                    </MenuItem>
                    <MenuItem value="neutral">
                      <Chip label="Nötr" color="default" size="small" />
                    </MenuItem>
                  </Select>
                </FormControl>
                
                <Chip 
                  label={getTypeLabel(answer.type)} 
                  color={getTypeColor(answer.type) as any}
                  size="small"
                />
                
                <IconButton 
                  color="error" 
                  onClick={() => handleRemoveAnswer(index)}
                  disabled={answers.length === 1}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Paper>
          ))}

          <Button
            startIcon={<AddIcon />}
            onClick={handleAddAnswer}
            sx={{ mt: 1 }}
          >
            Cevap Seçeneği Ekle
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          İptal
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={isSubmitting || !questionTitle.trim() || answers.every(answer => !answer.text.trim())}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : undefined}
        >
          {isSubmitting ? 'Ekleniyor...' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuestionModal; 