import React from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Paper,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  Info as InfoIcon,
  AccessTime as AccessTimeIcon,
  Repeat as RepeatIcon,
  Category as CategoryIcon,
  CheckCircle as CompletedIcon,
  PendingActions as PendingIcon,
  PlayCircleFilled as StartedIcon,
  Error as ErrorIcon,
  HourglassEmpty as NotYetDueIcon,
  Alarm as ApproachingIcon,
  CheckCircleOutline as ActiveIcon,
  Add as AddIcon
} from '@mui/icons-material';

interface TaskInfoModalProps {
  open: boolean;
  onClose: () => void;
}

const TaskInfoModal: React.FC<TaskInfoModalProps> = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        bgcolor: 'primary.main',
        color: 'white',
        py: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <InfoIcon sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight="bold">Görevler Sistemi Hakkında Bilgi</Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 4 }}>
        <Typography variant="h6" color="primary" gutterBottom fontWeight="bold">
          Görevler Sistemi Nasıl Çalışır?
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            mb: 4
          }}
        >
          <Typography variant="body1" paragraph>
            GTS, işletmenizin günlük operasyonlarını ve personel görevlerini yönetmenizi sağlayan bir görev takip sistemidir. 
            Bu sistem, tekrarlanan görevleri ve bir kerelik görevleri planlamanıza ve takip etmenize yardımcı olur.
          </Typography>

          <List sx={{ mb: 2 }}>
            <ListItem>
              <ListItemIcon>
                <AddIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Yeni Görev Ekleme" 
                secondary="Yeni görev ekleyerek bir personele atayabilir, tekrarlı olarak yapılması gereken görevler tanımlayabilirsiniz." 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <RepeatIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Tekrarlı Görevler" 
                secondary="Belirli saatlerde tekrarlanan görevler tanımlayabilir, tolerans süresi belirleyebilirsiniz." 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CategoryIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Görev Grupları" 
                secondary="Görevleri kategorize etmek için gruplar oluşturabilir, benzer görevleri bir arada yönetebilirsiniz." 
              />
            </ListItem>
          </List>
        </Paper>

        <Typography variant="h6" color="primary" gutterBottom fontWeight="bold">
          Görev Zamanları ve Renk Kodları
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            mb: 4
          }}
        >
          <Typography variant="body1" paragraph>
            Görev zamanları, aşağıdaki renk kodları ile farklı durumlarda gösterilir:
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Box sx={{ bgcolor: '#9E9E9E20', p: 1, borderRadius: 1 }}>
                      <NotYetDueIcon sx={{ color: '#9E9E9E' }} />
                    </Box>
                  </ListItemIcon>
                  <ListItemText 
                    primary={<Chip label="Zamanı Gelmemiş" size="small" sx={{ bgcolor: '#9E9E9E20', color: '#9E9E9E' }} />} 
                    secondary="Henüz zamanı gelmemiş görevler (Gri)" 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Box sx={{ bgcolor: '#2196F320', p: 1, borderRadius: 1 }}>
                      <ApproachingIcon sx={{ color: '#2196F3' }} />
                    </Box>
                  </ListItemIcon>
                  <ListItemText 
                    primary={<Chip label="Yaklaşıyor" size="small" sx={{ bgcolor: '#2196F320', color: '#2196F3' }} />} 
                    secondary="Zamanı yaklaşan görevler (Mavi)" 
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Box sx={{ bgcolor: '#2196F320', p: 1, borderRadius: 1 }}>
                      <ActiveIcon sx={{ color: '#2196F3' }} />
                    </Box>
                  </ListItemIcon>
                  <ListItemText 
                    primary={<Chip label="Aktif" size="small" sx={{ bgcolor: '#2196F320', color: '#2196F3' }} />} 
                    secondary="Şu an aktif görevler (Mavi)" 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Box sx={{ bgcolor: '#F4433620', p: 1, borderRadius: 1 }}>
                      <ErrorIcon sx={{ color: '#F44336' }} />
                    </Box>
                  </ListItemIcon>
                  <ListItemText 
                    primary={<Chip label="Kaçırılmış" size="small" sx={{ bgcolor: '#F4433620', color: '#F44336' }} />} 
                    secondary="Kaçırılmış görevler (Kırmızı)" 
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Box sx={{ bgcolor: '#4CAF5020', p: 1, borderRadius: 1 }}>
                      <CompletedIcon sx={{ color: '#4CAF50' }} />
                    </Box>
                  </ListItemIcon>
                  <ListItemText 
                    primary={<Chip label="Tamamlanmış" size="small" sx={{ bgcolor: '#4CAF5020', color: '#4CAF50' }} />} 
                    secondary="Tamamlanmış görevler (Yeşil)" 
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Box sx={{ bgcolor: '#79554820', p: 1, borderRadius: 1 }}>
                      <StartedIcon sx={{ color: '#795548' }} />
                    </Box>
                  </ListItemIcon>
                  <ListItemText 
                    primary={<Chip label="Başlatılmış" size="small" sx={{ bgcolor: '#79554820', color: '#795548' }} />} 
                    secondary="Başlatılmış görevler (Kahverengi)" 
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </Paper>

        <Typography variant="h6" color="primary" gutterBottom fontWeight="bold">
          Görev Zamanı Algoritması
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            mb: 4
          }}
        >
          <Typography variant="body1" paragraph>
            Görev zamanı algoritması, görevlerin durumlarını belirlemek için şu adımları takip eder:
          </Typography>

          <List>
            <ListItem>
              <ListItemIcon>
                <Box sx={{ bgcolor: '#2196F320', p: 1, borderRadius: 1 }}>
                  <AccessTimeIcon sx={{ color: '#2196F3' }} />
                </Box>
              </ListItemIcon>
              <ListItemText 
                primary="Yaklaşan Görevler" 
                secondary="Bir görevin başlama saatinden önce tolerans süresi içerisindeyse (örn. 15 dk) görev 'Yaklaşıyor' olarak işaretlenir." 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Box sx={{ bgcolor: '#2196F320', p: 1, borderRadius: 1 }}>
                  <AccessTimeIcon sx={{ color: '#2196F3' }} />
                </Box>
              </ListItemIcon>
              <ListItemText 
                primary="Aktif Görevler" 
                secondary="Görev saati geldiğinde ve bir sonraki görevin tolerans başlangıcına kadar görev 'Aktif' olarak kabul edilir." 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Box sx={{ bgcolor: '#F4433620', p: 1, borderRadius: 1 }}>
                  <AccessTimeIcon sx={{ color: '#F44336' }} />
                </Box>
              </ListItemIcon>
              <ListItemText 
                primary="Kaçırılmış Görevler" 
                secondary="Bir görevin aktif olma süresi geçtiğinde ve tamamlanmadığında 'Kaçırılmış' olarak işaretlenir." 
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" paragraph>
            <strong>Önemli:</strong> Son görev için 60 dakikalık bir tolerans süresi uygulanır. Diğer görevler için, 
            bir sonraki görevin tolerans başlangıcı mevcut görevin bitiş zamanı olarak kabul edilir.
          </Typography>
        </Paper>

        <Typography variant="h6" color="primary" gutterBottom fontWeight="bold">
          Görev Kartları ve Liste Görünümü
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Typography variant="body1" paragraph>
            Görevleri iki farklı görünümde inceleyebilirsiniz:
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Kart Görünümü
              </Typography>
              <Box sx={{ p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'primary.main' }}>
                <Typography variant="body2" paragraph>
                  Her görev için detaylı bilgileri görüntüleyebileceğiniz kart görünümü. Görev adı, açıklaması, 
                  atanan personel ve tekrarlama zamanları gibi bilgileri içerir.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Tablo Görünümü
              </Typography>
              <Box sx={{ p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'primary.main' }}>
                <Typography variant="body2" paragraph>
                  Görevleri daha kompakt bir şekilde görüntüleyebileceğiniz tablo görünümü. Durum ikonu, 
                  görev adı, zamanlar, tolerans süresi, personel bilgisi ve işlem düğmelerini içerir.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </DialogContent>
    </Dialog>
  );
};

export default TaskInfoModal; 