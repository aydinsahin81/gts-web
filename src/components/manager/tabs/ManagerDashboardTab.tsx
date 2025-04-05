import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress } from '@mui/material';
import { ref, get } from 'firebase/database';
import { database } from '../../../firebase';
import { useAuth } from '../../../contexts/AuthContext';

const ManagerDashboardTab: React.FC = () => {
  const { currentUser, userDetails } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardPermissions, setDashboardPermissions] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        if (!currentUser || !userDetails || !userDetails.companyId) {
          setLoading(false);
          return;
        }
        
        // Dashboard widget izinlerini getir
        const permissionsRef = ref(database, `companies/${userDetails.companyId}/permissions/managers/${currentUser.uid}`);
        const snapshot = await get(permissionsRef);
        
        if (snapshot.exists()) {
          const permissions = snapshot.val();
          
          // Dashboard alt izinlerini al
          const dashboardSubPermissions = permissions['dashboard_subPermissions'] || {};
          setDashboardPermissions(dashboardSubPermissions);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Dashboard izinleri alınırken hata:', error);
        setLoading(false);
      }
    };
    
    fetchPermissions();
  }, [currentUser, userDetails]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Yönetici Dashboard
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Bu dashboard sayfası henüz geliştirme aşamasındadır.
      </Typography>
      
      <Grid container spacing={3}>
        {/* Widget örnekleri burada olacak */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3, height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="subtitle1">Dashboard Widget 1</Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3, height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="subtitle1">Dashboard Widget 2</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ManagerDashboardTab; 