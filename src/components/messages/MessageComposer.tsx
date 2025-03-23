import React, { useState } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  styled
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import NotificationsIcon from '@mui/icons-material/Notifications';

// Özelleştirilmiş bileşenler
const StyledPaper = styled(Paper)(({ theme }) => ({
  height: '100%',
  borderRadius: theme.spacing(1),
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}));

const HeaderArea = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const ContentArea = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
}));

const MessagePreview = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  flexGrow: 1,
  position: 'relative',
  minHeight: '180px',
}));

// Props türü
interface MessageComposerProps {
  onSend: (title: string, body: string) => void;
  isLoading: boolean;
  recipientCount: number;
}

const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  isLoading,
  recipientCount
}) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };
  
  const handleBodyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBody(e.target.value);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (title.trim() && body.trim()) {
      onSend(title.trim(), body.trim());
    }
  };
  
  return (
    <StyledPaper elevation={0}>
      <HeaderArea>
        <Typography variant="h6" gutterBottom>
          Mesaj İçeriği
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gönderilecek mesajın başlığını ve içeriğini yazın.
        </Typography>
      </HeaderArea>
      
      <ContentArea>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <TextField
            fullWidth
            label="Mesaj Başlığı"
            value={title}
            onChange={handleTitleChange}
            variant="outlined"
            margin="normal"
            required
            disabled={isLoading}
            inputProps={{ maxLength: 50 }}
            helperText={`${title.length}/50 karakter`}
          />
          
          <TextField
            fullWidth
            label="Mesaj İçeriği"
            value={body}
            onChange={handleBodyChange}
            variant="outlined"
            margin="normal"
            required
            multiline
            rows={4}
            disabled={isLoading}
            inputProps={{ maxLength: 300 }}
            helperText={`${body.length}/300 karakter`}
          />
          
          <MessagePreview>
            <Typography variant="overline" color="text.secondary" gutterBottom>
              Önizleme
            </Typography>
            
            {title || body ? (
              <>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  {title || 'Mesaj Başlığı'}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {body || 'Mesaj içeriği burada görünecek...'}
                </Typography>
              </>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '80%',
                opacity: 0.5
              }}>
                <NotificationsIcon sx={{ fontSize: '3rem', mb: 1 }} />
                <Typography>Mesaj içeriğini görmek için yazmaya başlayın</Typography>
              </Box>
            )}
          </MessagePreview>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {recipientCount === 0 
                ? 'Hiç alıcı seçilmedi' 
                : `Seçilen ${recipientCount} alıcıya gönderilecek`}
            </Typography>
            
            <Button
              type="submit"
              variant="contained"
              color="primary"
              endIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              disabled={isLoading || !title.trim() || !body.trim() || recipientCount === 0}
            >
              {isLoading ? 'Gönderiliyor...' : 'Gönder'}
            </Button>
          </Box>
        </form>
      </ContentArea>
    </StyledPaper>
  );
};

export default MessageComposer; 