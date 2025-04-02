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
  ListItemSecondaryAction,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuestionModal from './components/QuestionModal';
import SurveyReports from './components/SurveyReports';
import { useAuth } from '../contexts/AuthContext';
import { ref, get, onValue, remove, update, set, push } from 'firebase/database';
import { database } from '../firebase';

// TabPanel fonksiyonu
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`survey-tabpanel-${index}`}
      aria-labelledby={`survey-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `survey-tab-${index}`,
    'aria-controls': `survey-tabpanel-${index}`,
  };
}

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

// Eski format için geriye uyumluluk interface'i
interface LegacySurvey {
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
  answers: AnswerItem[];
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
  
  // Tab state'i
  const [tabValue, setTabValue] = useState(0);

  // Tab değişimini yönet
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

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
            const surveysList = Object.entries(surveysData).map(([id, data]: [string, any]) => {
              // Yeni format mı eski format mı kontrol et
              if (data.answers) {
                // Yeni format
                return {
                  id,
                  ...data
                };
              } else if (data.questions) {
                // Eski format - geriye uyumluluk için dönüştürme yap
                const firstQuestionId = Object.keys(data.questions)[0];
                const firstQuestion = data.questions[firstQuestionId];
                
                return {
                  id,
                  title: firstQuestion.title,
                  answers: firstQuestion.answers,
                  createdAt: data.createdAt,
                  createdBy: firstQuestion.createdBy,
                  tasks: data.tasks || []
                };
              } else {
                // Hiçbir format uymuyor, boş bir Survey döndür
                return {
                  id,
                  title: data.title || '',
                  answers: [],
                  createdAt: data.createdAt || Date.now(),
                  createdBy: data.createdBy || '',
                  tasks: data.tasks || []
                };
              }
            });
            
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
      setEditingQuestions([{
        id: 'main',
        title: selectedSurvey.title,
        answers: [...selectedSurvey.answers]
      }]);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveChanges = async () => {
    if (!selectedSurvey || !currentUser) return;

    try {
      const userSnapshot = await get(ref(database, `users/${currentUser.uid}`));
      if (!userSnapshot.exists()) return;

      const userData = userSnapshot.val();
      const companyId = userData.companyId;
      if (!companyId) return;

      const updatedQuestion = editingQuestions[0]; // Artık tek bir soru var
      
      const updates = {
        [`companies/${companyId}/surveys/${selectedSurvey.id}/title`]: updatedQuestion.title,
        [`companies/${companyId}/surveys/${selectedSurvey.id}/answers`]: updatedQuestion.answers
      };

      await update(ref(database), updates);
      
      // Seçili anketin yerel durumunu güncelle
      setSelectedSurvey({
        ...selectedSurvey,
        title: updatedQuestion.title,
        answers: updatedQuestion.answers
      });
      
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
          newAnswers[answerIndex] = { 
            ...newAnswers[answerIndex], 
            text: newAnswer 
          };
          return { ...q, answers: newAnswers };
        }
        return q;
      })
    );
  };

  const handleAnswerTypeChange = (questionId: string, answerIndex: number, newType: 'positive' | 'negative' | 'neutral') => {
    setEditingQuestions(prev => 
      prev.map(q => {
        if (q.id === questionId) {
          const newAnswers = [...q.answers];
          newAnswers[answerIndex] = { 
            ...newAnswers[answerIndex], 
            type: newType 
          };
          return { ...q, answers: newAnswers };
        }
        return q;
      })
    );
  };

  const handleAddAnswer = (questionId: string) => {
    setEditingQuestions(prev => 
      prev.map(q => q.id === questionId ? { 
        ...q, 
        answers: [...q.answers, { text: '', type: 'neutral' }] 
      } : q)
    );
  };

  const handleRemoveAnswer = (questionId: string, answerIndex: number) => {
    setEditingQuestions(prev => 
      prev.map(q => {
        if (q.id === questionId) {
          const newAnswers = [...q.answers];
          newAnswers.splice(answerIndex, 1);
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

  // Görev silme fonksiyonu
  const handleDeleteTask = async (taskId: string) => {
    if (!selectedSurvey || !currentUser) return;

    try {
      const userSnapshot = await get(ref(database, `users/${currentUser.uid}`));
      if (!userSnapshot.exists()) return;

      const userData = userSnapshot.val();
      const companyId = userData.companyId;
      if (!companyId) return;

      // Görevi anketten kaldır
      const updatedTasks = selectedSurvey.tasks?.filter(id => id !== taskId) || [];
      const surveyRef = ref(database, `companies/${companyId}/surveys/${selectedSurvey.id}`);
      await update(surveyRef, {
        tasks: updatedTasks
      });

      // Seçili anketi güncelle
      setSelectedSurvey(prev => prev ? {
        ...prev,
        tasks: updatedTasks
      } : null);
    } catch (error) {
      console.error('Görev silinirken hata oluştu:', error);
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Tab Başlıkları */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="anket yönetimi tabları"
          >
            <Tab label="Anketler" {...a11yProps(0)} />
            <Tab label="Anket Raporları" {...a11yProps(1)} />
          </Tabs>
        </Box>

        {/* Tab İçerikleri */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Sol Taraf - Anket Listesi */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" component="h1">
                    Anketler
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<AddIcon />}
                    onClick={handleOpenQuestionModal}
                  >
                    Yeni Anket
                  </Button>
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : surveys.length === 0 ? (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Henüz hiç anket eklenmemiş.
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="medium">
                      <TableHead>
                        <TableRow>
                          <TableCell>Soru</TableCell>
                          <TableCell>Cevaplar</TableCell>
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
                              <Typography variant="body2">
                                {survey.title}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {survey.answers.map((answer, index) => (
                                  <Chip
                                    key={index}
                                    label={answer.text}
                                    size="small"
                                    color={answer.type === 'positive' ? 'success' : answer.type === 'negative' ? 'error' : 'default'}
                                  />
                                ))}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>

            {/* Sağ Taraf - Görev Listesi */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h5" component="h2" gutterBottom>
                  Anket Görevleri
                </Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Görev Adı</TableCell>
                          <TableCell>Anket Adı</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {surveys.map((survey) => (
                          survey.tasks && survey.tasks.map((taskId) => {
                            const task = tasks.find(t => t.id === taskId);
                            return task ? (
                              <TableRow key={`${survey.id}-${taskId}`}>
                                <TableCell>
                                  <Typography variant="body2">
                                    {task.name}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {survey.title}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ) : null;
                          })
                        ))}
                        {surveys.every(survey => !survey.tasks || survey.tasks.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={2}>
                              <Typography variant="body2" color="text.secondary" align="center">
                                Henüz hiçbir ankete görev eklenmemiş.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <SurveyReports />
        </TabPanel>
      </Box>

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
          pb: 1
        }}>
          <Typography variant="h6" component="div">
            {selectedSurvey?.title}
          </Typography>
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
                    onClick={handleEditMode}
                    color="primary"
                    sx={{ mr: 1 }}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Anketi Sil">
                  <IconButton 
                    onClick={handleDeleteSurvey}
                    color="error"
                    disabled={isDeleting}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </>
            ) : null}
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
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Stack spacing={2}>
                        <TextField
                          label="Soru"
                          value={editingQuestions[0].title}
                          onChange={(e) => handleQuestionChange(editingQuestions[0].id, e.target.value)}
                          fullWidth
                          size="small"
                        />
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Cevaplar:
                          </Typography>
                          <Stack spacing={1}>
                            {editingQuestions[0].answers.map((answer, answerIndex) => (
                              <Box key={answerIndex} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <TextField
                                  value={answer.text}
                                  onChange={(e) => handleAnswerChange(editingQuestions[0].id, answerIndex, e.target.value)}
                                  size="small"
                                  fullWidth
                                />
                                <FormControl sx={{ minWidth: 130 }}>
                                  <InputLabel size="small">Durum</InputLabel>
                                  <Select
                                    value={answer.type}
                                    label="Durum"
                                    onChange={(e) => handleAnswerTypeChange(editingQuestions[0].id, answerIndex, e.target.value as 'positive' | 'negative' | 'neutral')}
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
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleRemoveAnswer(editingQuestions[0].id, answerIndex)}
                                  disabled={editingQuestions[0].answers.length <= 1}
                                >
                                  <CloseIcon />
                                </IconButton>
                              </Box>
                            ))}
                            <Button
                              startIcon={<AddIcon />}
                              onClick={() => handleAddAnswer(editingQuestions[0].id)}
                              size="small"
                            >
                              Cevap Ekle
                            </Button>
                          </Stack>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ) : (
                  // Görüntüleme Modu
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Typography variant="subtitle1">
                          {selectedSurvey?.title}
                        </Typography>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Cevaplar:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selectedSurvey?.answers?.map((answer, index) => (
                              <Chip
                                key={index}
                                label={answer.text}
                                size="small"
                                color={answer.type === 'positive' ? 'success' : answer.type === 'negative' ? 'error' : 'default'}
                              />
                            ))}
                          </Box>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
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
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Stack spacing={1} sx={{ flex: 1 }}>
                                <Typography variant="subtitle1">
                                  {task.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {task.description}
                                </Typography>
                              </Stack>
                              <Tooltip title="Görevi Sil">
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleDeleteTask(taskId)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
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
        <DialogActions>
          {isEditing ? (
            <>
              <Button onClick={handleCancelEdit} variant="outlined">
                İptal
              </Button>
              <Button 
                onClick={handleSaveChanges} 
                variant="contained"
                startIcon={<SaveIcon />}
              >
                Kaydet
              </Button>
            </>
          ) : (
            <Button onClick={handleCloseDetailModal} variant="outlined">
              Kapat
            </Button>
          )}
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