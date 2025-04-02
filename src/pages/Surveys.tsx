import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  TextField,
  Stack,
  Card,
  CardContent,
  Tooltip,
  Checkbox,
  ListItemSecondaryAction
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuestionModal from './components/QuestionModal';
import { useAuth } from '../contexts/AuthContext';
import { ref, get, onValue, remove, update, set, push } from 'firebase/database';
import { database } from '../firebase';

interface Survey {
  id: string;
  title: string;
  questions: {
    [key: string]: {
      title: string;
      answers: string[];
      createdAt: number;
      createdBy: string;
    };
  };
  createdAt: number;
  tasks?: string[];
}

interface EditingQuestion {
  id: string;
  title: string;
  answers: string[];
}

interface Task {
  id: string;
  name: string;
  description: string;
  createdAt: number;
}

const Surveys: React.FC = () => {
  const { currentUser } = useAuth();
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingQuestions, setEditingQuestions] = useState<EditingQuestion[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  // Anketleri realtime olarak yükle
  useEffect(() => {
    if (!currentUser) return;

    const fetchUserData = async () => {
      try {
        const userSnapshot = await get(ref(database, `users/${currentUser.uid}`));
        if (!userSnapshot.exists()) return;

        const userData = userSnapshot.val();
        const companyId = userData.companyId;
        if (!companyId) return;

        // Realtime listener ekle
        const surveysRef = ref(database, `companies/${companyId}/surveys`);
        const unsubscribe = onValue(surveysRef, (snapshot) => {
          if (snapshot.exists()) {
            const surveysData = snapshot.val();
            const surveysList = Object.entries(surveysData).map(([id, data]: [string, any]) => ({
              id,
              ...data
            }));
            
            // En son oluşturulan anketler başta olacak şekilde sırala (en yeniden en eskiye)
            surveysList.sort((a, b) => {
              const dateA = a.createdAt || 0;
              const dateB = b.createdAt || 0;
              return dateB - dateA;
            });
            setSurveys(surveysList);
          } else {
            setSurveys([]);
          }
          setLoading(false);
        });

        // Cleanup function
        return () => unsubscribe();
      } catch (error) {
        console.error('Anketler yüklenirken hata:', error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser]);

  // Görevleri yükle
  useEffect(() => {
    if (!currentUser) return;

    const fetchUserData = async () => {
      try {
        const userSnapshot = await get(ref(database, `users/${currentUser.uid}`));
        if (!userSnapshot.exists()) return;

        const userData = userSnapshot.val();
        const companyId = userData.companyId;
        if (!companyId) return;

        // Görevleri yükle
        const tasksRef = ref(database, `companies/${companyId}/tasks`);
        const unsubscribe = onValue(tasksRef, (snapshot) => {
          const tasksData = snapshot.val();
          if (tasksData) {
            const tasksArray = Object.entries(tasksData).map(([id, task]: [string, any]) => ({
              id,
              name: task.name,
              description: task.description,
              createdAt: task.createdAt
            }));
            setTasks(tasksArray);
          } else {
            setTasks([]);
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Görevler yüklenirken hata:', error);
      }
    };

    fetchUserData();
  }, [currentUser]);

  const handleOpenQuestionModal = () => {
    setIsQuestionModalOpen(true);
  };

  const handleCloseQuestionModal = () => {
    setIsQuestionModalOpen(false);
  };

  const handleRowClick = (survey: Survey) => {
    setSelectedSurvey(survey);
    setIsDetailModalOpen(true);
  };

  const handleEditMode = () => {
    if (selectedSurvey) {
      const questions = Object.entries(selectedSurvey.questions).map(([id, question]) => ({
        id,
        title: question.title,
        answers: [...question.answers]
      }));
      setEditingQuestions(questions);
      setIsEditing(true);
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedSurvey || !currentUser) return;

    try {
      const userSnapshot = await get(ref(database, `users/${currentUser.uid}`));
      if (!userSnapshot.exists()) return;

      const userData = userSnapshot.val();
      const companyId = userData.companyId;
      if (!companyId) return;

      const updates: { [key: string]: any } = {};
      editingQuestions.forEach(question => {
        updates[`companies/${companyId}/surveys/${selectedSurvey.id}/questions/${question.id}`] = {
          title: question.title,
          answers: question.answers,
          createdAt: selectedSurvey.questions[question.id].createdAt,
          createdBy: selectedSurvey.questions[question.id].createdBy
        };
      });

      await update(ref(database), updates);
      setIsEditing(false);
    } catch (error) {
      console.error('Değişiklikler kaydedilirken hata:', error);
    }
  };

  const handleQuestionChange = (questionId: string, newTitle: string) => {
    setEditingQuestions(prev => 
      prev.map(q => q.id === questionId ? { ...q, title: newTitle } : q)
    );
  };

  const handleAnswerChange = (questionId: string, answerIndex: number, newAnswer: string) => {
    setEditingQuestions(prev => 
      prev.map(q => {
        if (q.id === questionId) {
          const newAnswers = [...q.answers];
          newAnswers[answerIndex] = newAnswer;
          return { ...q, answers: newAnswers };
        }
        return q;
      })
    );
  };

  const handleAddAnswer = (questionId: string) => {
    setEditingQuestions(prev => 
      prev.map(q => q.id === questionId ? { ...q, answers: [...q.answers, ''] } : q)
    );
  };

  const handleRemoveAnswer = (questionId: string, answerIndex: number) => {
    setEditingQuestions(prev => 
      prev.map(q => {
        if (q.id === questionId) {
          const newAnswers = q.answers.filter((_, index) => index !== answerIndex);
          return { ...q, answers: newAnswers };
        }
        return q;
      })
    );
  };

  const handleCloseDetailModal = () => {
    setSelectedSurvey(null);
    setIsDetailModalOpen(false);
    setIsEditing(false);
    setEditingQuestions([]);
  };

  const handleDeleteSurvey = async () => {
    if (!selectedSurvey || !currentUser) return;

    try {
      setIsDeleting(true);
      const userSnapshot = await get(ref(database, `users/${currentUser.uid}`));
      if (!userSnapshot.exists()) return;

      const userData = userSnapshot.val();
      const companyId = userData.companyId;
      if (!companyId) return;

      const surveyRef = ref(database, `companies/${companyId}/surveys/${selectedSurvey.id}`);
      await remove(surveyRef);
      
      handleCloseDetailModal();
    } catch (error) {
      console.error('Anket silinirken hata:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Görev seçme modalını aç
  const handleOpenTaskModal = () => {
    if (selectedSurvey) {
      setSelectedTasks(selectedSurvey.tasks || []);
    }
    setIsTaskModalOpen(true);
  };

  // Görev seçme modalını kapat
  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTasks([]);
  };

  // Görev seçme/kaldırma
  const handleTaskToggle = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // Seçilen görevleri kaydet
  const handleSaveTasks = async () => {
    if (!currentUser || !selectedSurvey) return;

    try {
      // Önce kullanıcı bilgilerini al
      const userSnapshot = await get(ref(database, `users/${currentUser.uid}`));
      if (!userSnapshot.exists()) return;

      const userData = userSnapshot.val();
      const companyId = userData.companyId;
      if (!companyId) return;

      // Anketi güncelle
      const surveyRef = ref(database, `companies/${companyId}/surveys/${selectedSurvey.id}`);
      await update(surveyRef, {
        tasks: selectedTasks
      });

      // Seçili anketi güncelle
      setSelectedSurvey(prev => prev ? {
        ...prev,
        tasks: selectedTasks
      } : null);

      handleCloseTaskModal();
    } catch (error) {
      console.error('Görevler kaydedilirken hata oluştu:', error);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Sol Taraf - Anket Listesi */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" component="h2">
                Anketler
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenQuestionModal}
              >
                Yeni Anket Ekle
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Soru</TableCell>
                      <TableCell>Cevaplar</TableCell>
                      <TableCell>Görevler</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {surveys.map((survey) => (
                      <TableRow 
                        key={survey.id} 
                        hover 
                        onClick={() => handleRowClick(survey)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {survey.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {Object.values(survey.questions || {}).map((question: any, index: number) => (
                              <Chip
                                key={index}
                                label={`${question.answers.length} Cevap`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Sağ Taraf - Boş Alan */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Sağ Alan
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Bu alan şu an için boş bırakılmıştır.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Anket Ekleme Modalı */}
      <QuestionModal
        open={isQuestionModalOpen}
        onClose={handleCloseQuestionModal}
      />

      {/* Anket Detay Modalı */}
      <Dialog
        open={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">Anket Detayları</Typography>
            {selectedSurvey && (
              <Typography variant="body2" color="text.secondary">
                {new Date(selectedSurvey.createdAt).toLocaleDateString('tr-TR')}
              </Typography>
            )}
          </Box>
          <Box>
            <Tooltip title="Görev Ekle">
              <IconButton 
                onClick={handleOpenTaskModal}
                color="primary"
                sx={{ mr: 1 }}
              >
                <AssignmentIcon />
              </IconButton>
            </Tooltip>
            {!isEditing ? (
              <>
                <Tooltip title="Düzenle">
                  <IconButton 
                    color="primary" 
                    onClick={handleEditMode}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Sil">
                  <IconButton 
                    color="error" 
                    onClick={handleDeleteSurvey}
                    disabled={isDeleting}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip title="Kaydet">
                  <IconButton 
                    color="primary" 
                    onClick={handleSaveChanges}
                    sx={{ mr: 1 }}
                  >
                    <SaveIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="İptal">
                  <IconButton 
                    color="error" 
                    onClick={() => setIsEditing(false)}
                  >
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedSurvey && (
            <Stack spacing={3}>
              {/* Sorular Bölümü */}
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
                  Sorular
                </Typography>
                {isEditing ? (
                  // Düzenleme Modu
                  editingQuestions.map((question, index) => (
                    <Card key={question.id} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Stack spacing={2}>
                          <TextField
                            label={`Soru ${index + 1}`}
                            value={question.title}
                            onChange={(e) => handleQuestionChange(question.id, e.target.value)}
                            fullWidth
                            size="small"
                          />
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              Cevaplar:
                            </Typography>
                            <Stack spacing={1}>
                              {question.answers.map((answer, answerIndex) => (
                                <Box key={answerIndex} sx={{ display: 'flex', gap: 1 }}>
                                  <TextField
                                    value={answer}
                                    onChange={(e) => handleAnswerChange(question.id, answerIndex, e.target.value)}
                                    size="small"
                                    fullWidth
                                  />
                                  <IconButton 
                                    size="small" 
                                    color="error"
                                    onClick={() => handleRemoveAnswer(question.id, answerIndex)}
                                  >
                                    <CloseIcon />
                                  </IconButton>
                                </Box>
                              ))}
                              <Button
                                startIcon={<AddIcon />}
                                onClick={() => handleAddAnswer(question.id)}
                                size="small"
                              >
                                Cevap Ekle
                              </Button>
                            </Stack>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  // Görüntüleme Modu
                  Object.entries(selectedSurvey.questions).map(([questionId, question], index) => (
                    <Card key={questionId} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Stack spacing={2}>
                          <Typography variant="subtitle1">
                            Soru {index + 1}: {question.title}
                          </Typography>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              Cevaplar:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {question.answers.map((answer, answerIndex) => (
                                <Chip
                                  key={answerIndex}
                                  label={answer}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))
                )}
              </Box>

              {/* Görevler Bölümü */}
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
                  Görevler
                </Typography>
                {selectedSurvey.tasks && selectedSurvey.tasks.length > 0 ? (
                  <Stack spacing={1}>
                    {selectedSurvey.tasks.map((taskId) => {
                      const task = tasks.find(t => t.id === taskId);
                      return task ? (
                        <Card key={taskId} variant="outlined">
                          <CardContent>
                            <Stack spacing={1}>
                              <Typography variant="subtitle1">
                                {task.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {task.description}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      ) : null;
                    })}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Henüz görev eklenmemiş.
                  </Typography>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDetailModal} variant="outlined">
            Kapat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Görev Seçme Modalı */}
      <Dialog
        open={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Görev Seç
        </DialogTitle>
        <DialogContent>
          <List>
            {tasks.map((task) => (
              <React.Fragment key={task.id}>
                <ListItem>
                  <ListItemText
                    primary={task.name}
                    secondary={task.description}
                  />
                  <ListItemSecondaryAction>
                    <Checkbox
                      edge="end"
                      checked={selectedTasks.includes(task.id)}
                      onChange={() => handleTaskToggle(task.id)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTaskModal} variant="outlined">
            İptal
          </Button>
          <Button onClick={handleSaveTasks} variant="contained">
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Surveys; 