import React, { useState, useEffect, useRef } from 'react';
import { Grid, Box, CircularProgress, Typography } from '@mui/material';
import Dashboard from './Dashboard';
import { ref, get } from 'firebase/database';
import { database, auth } from '../../firebase';

// Dashboard alt izinleri için arayüz
interface DashboardPermissions {
  dashboard: boolean;
  dashboard_stat_cards: boolean;
  dashboard_task_distribution: boolean;
  dashboard_personnel_performance: boolean;
  dashboard_survey_charts: boolean;
  dashboard_missed_tasks: boolean;
  dashboard_completed_tasks: boolean;
  dashboard_worst_performers: boolean;
  dashboard_best_performers: boolean;
  dashboard_task_locations: boolean;
}

const ManagerDashboard: React.FC = () => {
  const [permissions, setPermissions] = useState<DashboardPermissions>({
    dashboard: true,
    dashboard_stat_cards: false,
    dashboard_task_distribution: false,
    dashboard_personnel_performance: false,
    dashboard_survey_charts: false,
    dashboard_missed_tasks: false,
    dashboard_completed_tasks: false,
    dashboard_worst_performers: false,
    dashboard_best_performers: false,
    dashboard_task_locations: false
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // CSS class'larını saklayacak state
  const [cssFilters, setCssFilters] = useState<Record<string, boolean>>({});

  // Yönetici izinlerini getir
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        
        if (!user) {
          setError("Oturum açmış kullanıcı bulunamadı.");
          setLoading(false);
          return;
        }
        
        // Kullanıcı detaylarını al
        const userSnapshot = await get(ref(database, `users/${user.uid}`));
        if (!userSnapshot.exists()) {
          setError("Kullanıcı bilgileri bulunamadı.");
          setLoading(false);
          return;
        }
        
        const userData = userSnapshot.val();
        const companyId = userData.companyId;
        
        if (!companyId) {
          setError("Şirket bilgisi bulunamadı.");
          setLoading(false);
          return;
        }
        
        // Yönetici izinlerini getir
        const permissionsRef = ref(database, `companies/${companyId}/permissions/managers/${user.uid}`);
        const permissionsSnapshot = await get(permissionsRef);
        
        if (permissionsSnapshot.exists()) {
          const permissionsData = permissionsSnapshot.val();
          
          // Ana dashboard iznini kontrol et
          const dashboardEnabled = permissionsData.dashboard === true;
          
          // Alt izinleri al
          const subPermissions = permissionsData.dashboard_subPermissions || {};
          
          const newPermissions = {
            dashboard: dashboardEnabled,
            dashboard_stat_cards: subPermissions.dashboard_stat_cards === true,
            dashboard_task_distribution: subPermissions.dashboard_task_distribution === true,
            dashboard_personnel_performance: subPermissions.dashboard_personnel_performance === true,
            dashboard_survey_charts: subPermissions.dashboard_survey_charts === true,
            dashboard_missed_tasks: subPermissions.dashboard_missed_tasks === true,
            dashboard_completed_tasks: subPermissions.dashboard_completed_tasks === true,
            dashboard_worst_performers: subPermissions.dashboard_worst_performers === true,
            dashboard_best_performers: subPermissions.dashboard_best_performers === true,
            dashboard_task_locations: subPermissions.dashboard_task_locations === true
          };
          
          setPermissions(newPermissions);
          
          // CSS filtrelerini ayarla
          setCssFilters({
            'hide-stat-cards': !newPermissions.dashboard_stat_cards,
            'hide-task-distribution': !newPermissions.dashboard_task_distribution,
            'hide-personnel-performance': !newPermissions.dashboard_personnel_performance,
            'hide-survey-charts': !newPermissions.dashboard_survey_charts,
            'hide-missed-tasks': !newPermissions.dashboard_missed_tasks,
            'hide-completed-tasks': !newPermissions.dashboard_completed_tasks,
            'hide-worst-performers': !newPermissions.dashboard_worst_performers,
            'hide-best-performers': !newPermissions.dashboard_best_performers,
            'hide-task-locations': !newPermissions.dashboard_task_locations
          });
          
          console.log("Yönetici dashboard izinleri:", subPermissions);
        } else {
          console.log("Yönetici izinleri bulunamadı, varsayılan izinleri kullanılıyor.");
          // Varsayılan olarak sadece ana dashboard izni ver
          setPermissions({
            dashboard: true,
            dashboard_stat_cards: false,
            dashboard_task_distribution: false,
            dashboard_personnel_performance: false,
            dashboard_survey_charts: false,
            dashboard_missed_tasks: false,
            dashboard_completed_tasks: false,
            dashboard_worst_performers: false,
            dashboard_best_performers: false,
            dashboard_task_locations: false
          });
          
          // Tüm bölümleri gizle
          setCssFilters({
            'hide-stat-cards': true,
            'hide-task-distribution': true,
            'hide-personnel-performance': true,
            'hide-survey-charts': true,
            'hide-missed-tasks': true,
            'hide-completed-tasks': true,
            'hide-worst-performers': true,
            'hide-best-performers': true,
            'hide-task-locations': true
          });
        }
      } catch (error) {
        console.error("Yönetici izinleri alınırken hata:", error);
        setError("İzinler alınırken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPermissions();
  }, []);

  // CSS'i dinamik olarak oluştur
  const generateCss = () => {
    const cssRules = [];
    
    if (cssFilters['hide-stat-cards']) {
      cssRules.push(`
        .dashboard-container .stat-cards-section {
          display: none !important;
        }
      `);
    }
    
    if (cssFilters['hide-task-distribution']) {
      cssRules.push(`
        .dashboard-container .task-distribution-section {
          display: none !important;
        }
      `);
    }
    
    if (cssFilters['hide-personnel-performance']) {
      cssRules.push(`
        .dashboard-container .personnel-performance-section {
          display: none !important;
        }
      `);
    }
    
    if (cssFilters['hide-survey-charts']) {
      cssRules.push(`
        .dashboard-container .survey-charts-section {
          display: none !important;
        }
      `);
    }
    
    if (cssFilters['hide-missed-tasks']) {
      cssRules.push(`
        .dashboard-container .missed-tasks-section {
          display: none !important;
        }
      `);
    }
    
    if (cssFilters['hide-completed-tasks']) {
      cssRules.push(`
        .dashboard-container .completed-tasks-section {
          display: none !important;
        }
      `);
    }
    
    if (cssFilters['hide-worst-performers']) {
      cssRules.push(`
        .dashboard-container .worst-performers-section {
          display: none !important;
        }
      `);
    }
    
    if (cssFilters['hide-best-performers']) {
      cssRules.push(`
        .dashboard-container .best-performers-section {
          display: none !important;
        }
      `);
    }
    
    if (cssFilters['hide-task-locations']) {
      cssRules.push(`
        .dashboard-container .task-locations-section {
          display: none !important;
        }
      `);
    }
    
    return cssRules.join('\n');
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  // Ana dashboard izni yoksa erişim mesajı göster
  if (!permissions.dashboard) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">
          Bu modüle erişim izniniz bulunmamaktadır.
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Erişim için yöneticinize başvurun.
        </Typography>
      </Box>
    );
  }

  // Hiçbir alt izin yoksa bilgilendirme mesajı göster
  const hasAnySubPermission = 
    permissions.dashboard_stat_cards || 
    permissions.dashboard_task_distribution || 
    permissions.dashboard_personnel_performance || 
    permissions.dashboard_survey_charts || 
    permissions.dashboard_missed_tasks || 
    permissions.dashboard_completed_tasks || 
    permissions.dashboard_worst_performers || 
    permissions.dashboard_best_performers || 
    permissions.dashboard_task_locations;
  
  if (!hasAnySubPermission) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">
          Dashboard modülüne erişiminiz var, ancak hiçbir alt bölüm için izniniz bulunmamaktadır.
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Gerekli izinler için yöneticinize başvurun.
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box className="manager-dashboard-wrapper" ref={dashboardRef}>
      {/* Dinamik CSS ile izinlere göre bölümleri filtrele */}
      <style>{generateCss()}</style>
      
      {/* Dashboard bileşenini sarmalayıcı div ile wrap et */}
      <Box className="dashboard-container">
        <Dashboard />
      </Box>
    </Box>
  );
};

export default ManagerDashboard; 