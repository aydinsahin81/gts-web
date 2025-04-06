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
  isManager?: boolean;
  branchId?: string;
}

interface AnswerItem {
  text: string;
  type: 'positive' | 'negative' | 'neutral';
}

const QuestionModal: React.FC<QuestionModalProps> = ({ open, onClose, isManager = false, branchId }) => {
  const { currentUser } = useAuth();
  const [questionTitle, setQuestionTitle] = useState('');
  const [answers, setAnswers] = useState<AnswerItem[]>([{ text: '', type: 'neutral' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleSaveQuestion = async () => {
    if (!questionTitle.trim()) {
      setError('Lütfen bir soru başlığı girin.');
      return;
    }

    if (answers.length === 0) {
      setError('En az bir cevap ekleyin.');
      return;
    }

    if (answers.some(answer => !answer.text.trim())) {
      setError('Boş cevap seçeneği bırakmayın.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (!currentUser) {
        setError('Kullanıcı oturumu bulunamadı.');
        return;
      }

      // Kullanıcının şirket bilgisini al
      const userSnapshot = await get(ref(database, `users/${currentUser.uid}`));
      if (!userSnapshot.exists()) {
        setError('Kullanıcı bilgisi bulunamadı.');
        return;
      }

      const userData = userSnapshot.val();
      const companyId = userData.companyId;
      if (!companyId) {
        setError('Şirket bilgisi bulunamadı.');
        return;
      }

      // Yeni bir anket oluştur
      const newSurveyRef = push(ref(database, `companies/${companyId}/surveys`));
      
      // Anket verisi (yönetici modunda şube ID'si ekle)
      const surveyData = {
        title: questionTitle,
        answers,
        createdAt: Date.now(),
        createdBy: currentUser.uid,
        ...(isManager && branchId && { branchId }) // Şube yöneticisi ise şube ID'sini ekle
      };
      
      // Anketi database'e kaydet
      await set(newSurveyRef, surveyData);

      // Başarılı mesajı göster ve modalı kapat
      setSuccess('Anket başarıyla eklendi.');
      setTimeout(() => {
        resetForm();
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Anket eklenirken hata:', error);
      setError('Anket eklenirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setQuestionTitle('');
    setAnswers([{ text: '', type: 'neutral' }]);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {isManager && branchId ? 'Şubeye Yeni Anket Ekle' : 'Yeni Anket Ekle'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
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
          onClick={handleSaveQuestion}
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