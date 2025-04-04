import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Grid,
  CircularProgress
} from '@mui/material';

const Branches: React.FC = () => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Burada API'den şube verilerini çekebilirsiniz
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom component="h1">
          Şubeler
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Şube içeriği buraya gelecek */}
            <Grid item xs={12}>
              <Typography variant="body1">
                Şubeler sayfası içeriği burada görüntülenecek.
              </Typography>
            </Grid>
          </Grid>
        )}
      </Paper>
    </Container>
  );
};

export default Branches; 