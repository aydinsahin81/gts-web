import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Typography, 
  Paper, 
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Divider,
  Grid,
  Chip
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SendIcon from '@mui/icons-material/Send';

interface MessageComposerProps {
  onSend: (title: string, body: string) => void;
  isLoading?: boolean;
  recipientCount?: number;
}

const MessageComposer: React.FC<MessageComposerProps> = ({ 
  onSend, 
  isLoading = false,
  recipientCount = 0
}) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [titleError, setTitleError] = useState('');
  const [bodyError, setBodyError] = useState('');

  // Karakter sayısını kontrol et
  const MAX_TITLE_LENGTH = 50;
  const MAX_BODY_LENGTH = 200;

  // Form validasyonu
  const validateForm = (): boolean => {
    let isValid = true;

    if (!title.trim()) {
      setTitleError('Bildirim başlığı gereklidir');
      isValid = false;
    } else if (title.length > MAX_TITLE_LENGTH) {
      setTitleError(`Başlık en fazla ${MAX_TITLE_LENGTH} karakter olabilir`);
      isValid = false;
    } else {
      setTitleError('');
    }

    if (!body.trim()) {
      setBodyError('Bildirim içeriği gereklidir');
      isValid = false;
    } else if (body.length > MAX_BODY_LENGTH) {
      setBodyError(`İçerik en fazla ${MAX_BODY_LENGTH} karakter olabilir`);
      isValid = false;
    } else {
      setBodyError('');
    }

    return isValid;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSend(title, body);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mt: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Bildirim İçeriği
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Personellerinize gönderilecek bildirimin başlığını ve içeriğini düzenleyin.
        </Typography>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        {/* Alıcı sayısı bilgisi */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <NotificationsActiveIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="body2">
              {recipientCount > 0 ? (
                <>
                  <Chip 
                    label={`${recipientCount} Alıcı`} 
                    size="small" 
                    color="primary" 
                    sx={{ mr: 1 }} 
                  />
                  {recipientCount === 1 
                    ? 'personele bildirim gönderilecek.' 
                    : 'personele bildirim gönderilecek.'
                  }
                </>
              ) : (
                'Henüz alıcı seçilmedi.'
              )}
            </Typography>
          </Box>
        </Grid>

        {/* Bildirim Başlığı */}
        <Grid item xs={12}>
          <FormControl fullWidth error={!!titleError}>
            <FormLabel sx={{ mb: 1, fontWeight: 500 }}>Bildirim Başlığı</FormLabel>
            <TextField
              placeholder="Bildirim başlığını girin"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={!!titleError}
              helperText={titleError || `${title.length}/${MAX_TITLE_LENGTH}`}
              fullWidth
              variant="outlined"
              size="small"
              inputProps={{ maxLength: MAX_TITLE_LENGTH + 10 }}
            />
          </FormControl>
        </Grid>

        {/* Bildirim İçeriği */}
        <Grid item xs={12}>
          <FormControl fullWidth error={!!bodyError}>
            <FormLabel sx={{ mb: 1, fontWeight: 500 }}>Bildirim İçeriği</FormLabel>
            <TextField
              placeholder="Bildirim içeriğini girin"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              error={!!bodyError}
              helperText={bodyError || `${body.length}/${MAX_BODY_LENGTH}`}
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              size="small"
              inputProps={{ maxLength: MAX_BODY_LENGTH + 10 }}
            />
          </FormControl>
        </Grid>

        {/* Gönder Butonu */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              endIcon={<SendIcon />}
              onClick={handleSubmit}
              disabled={isLoading || recipientCount === 0}
            >
              {isLoading ? 'Gönderiliyor...' : 'Bildirimi Gönder'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default MessageComposer; 