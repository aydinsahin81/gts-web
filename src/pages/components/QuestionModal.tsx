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
  Alert
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

const QuestionModal: React.FC<QuestionModalProps> = ({ open, onClose }) => {
  const { currentUser } = useAuth();
  const [questionTitle, setQuestionTitle] = useState('');
  const [answers, setAnswers] = useState<string[]>(['']);
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
    setAnswers([...answers, '']);
  };

  const handleRemoveAnswer = (index: number) => {
    const newAnswers = answers.filter((_, i) => i !== index);
    setAnswers(newAnswers);
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (!companyId) {
      setError('Şirket bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const surveyRef = ref(database, `companies/${companyId}/surveys`);
      const newSurveyRef = push(surveyRef);
      
      const surveyData = {
        title: questionTitle,
        createdAt: Date.now(),
        questions: {
          [Date.now()]: {
            title: questionTitle,
            answers: answers.filter(answer => answer.trim() !== ''),
            createdAt: Date.now(),
            createdBy: currentUser?.uid
          }
        }
      };

      await set(newSurveyRef, surveyData);
      onClose();
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
              <TextField
                fullWidth
                label={`Cevap ${index + 1}`}
                value={answer}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
              />
              <IconButton 
                color="error" 
                onClick={() => handleRemoveAnswer(index)}
                disabled={answers.length === 1}
              >
                <DeleteIcon />
              </IconButton>
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
          disabled={isSubmitting || !questionTitle.trim() || answers.every(answer => !answer.trim())}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : undefined}
        >
          {isSubmitting ? 'Ekleniyor...' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuestionModal; 