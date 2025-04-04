import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Grid,
  CircularProgress
} from '@mui/material';

const CustomerScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Burada API'den müşteri ekranı verilerini çekebilirsiniz
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom component="h1">
          Müşteri Ekranı
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Müşteri ekranı içeriği buraya gelecek */}
            <Grid item xs={12}>
              <Typography variant="body1">
                Müşteri ekranı içeriği burada görüntülenecek.
              </Typography>
            </Grid>
          </Grid>
        )}
      </Paper>
    </Container>
  );
};

export default CustomerScreen; 