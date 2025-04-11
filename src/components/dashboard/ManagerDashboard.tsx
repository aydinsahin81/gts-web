import React, { useState, useEffect, useRef } from 'react';
import { Grid, Box, CircularProgress, Typography } from '@mui/material';
import Dashboard from './Dashboard';
import { ref, get } from 'firebase/database';
import { database, auth } from '../../firebase';

// Dashboard alt izinleri için arayüz
interface DashboardPermissions {
  dashboard: boolean;
  dashboard_stat_cards: boolean;
  dashboard_task_status: boolean;
  dashboard_weekly_task_status: boolean;
  dashboard_monthly_task_status: boolean;
  dashboard_personnel_performance: boolean;
  dashboard_weekly_personnel_performance: boolean;
  dashboard_monthly_personnel_performance: boolean;
  dashboard_survey_charts: boolean;
  dashboard_missed_tasks: boolean;
  dashboard_completed_tasks: boolean;
  dashboard_worst_performers: boolean;
  dashboard_best_performers: boolean;
  dashboard_task_locations: boolean;
}

// ManagerDashboard bileşeni
const ManagerDashboard: React.FC = () => {
  const [permissions, setPermissions] = useState<DashboardPermissions>({
    dashboard: true,
    dashboard_stat_cards: false,
    dashboard_task_status: false,
    dashboard_weekly_task_status: false,
    dashboard_monthly_task_status: false,
    dashboard_personnel_performance: false,
    dashboard_weekly_personnel_performance: false,
    dashboard_monthly_personnel_performance: false,
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
  const [branchId, setBranchId] = useState<string | null>(null);

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
        
        // Kullanıcının şube ID'sini al
        const userBranchId = userData.branchesId || null;
        setBranchId(userBranchId);
        
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
          
          // Not: ManagerPermissionsModal.tsx'de ID'leri güncelledik ancak
          // mevcut veritabanındaki eski ID'ler ile geriye dönük uyumluluk sağlamalıyız
          const newPermissions = {
            dashboard: dashboardEnabled,
            // İstatistik kartları aynı ID'yi kullanıyor
            dashboard_stat_cards: subPermissions.dashboard_stat_cards === true,
            
            // Eski dashboard_task_distribution ID'sini veya yeni dashboard_task_status ID'sini kontrol et
            dashboard_task_status: subPermissions.dashboard_task_status === true || subPermissions.dashboard_task_distribution === true,
            
            // Yeni eklenen grafikler için izinleri al
            dashboard_weekly_task_status: subPermissions.dashboard_weekly_task_status === true,
            dashboard_monthly_task_status: subPermissions.dashboard_monthly_task_status === true,
            
            // Personel performans grafiği - eski veya yeni izin kontrol
            dashboard_personnel_performance: subPermissions.dashboard_personnel_performance === true,
            
            // Yeni eklenen personel performans grafikleri
            dashboard_weekly_personnel_performance: subPermissions.dashboard_weekly_personnel_performance === true,
            dashboard_monthly_personnel_performance: subPermissions.dashboard_monthly_personnel_performance === true,
            
            // Diğer izinler
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
            'hide-task-status': !newPermissions.dashboard_task_status,
            'hide-weekly-task-status': !newPermissions.dashboard_weekly_task_status,
            'hide-monthly-task-status': !newPermissions.dashboard_monthly_task_status,
            'hide-personnel-performance': !newPermissions.dashboard_personnel_performance,
            'hide-weekly-personnel-performance': !newPermissions.dashboard_weekly_personnel_performance,
            'hide-monthly-personnel-performance': !newPermissions.dashboard_monthly_personnel_performance,
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
          // Varsayılan olarak tüm dashboard izinleri devre dışı
          // Ana dashboard izni açık, alt izinler kapalı
          setPermissions({
            dashboard: true, // Ana dashboard izni aktif olmalı
            dashboard_stat_cards: false,
            dashboard_task_status: false,
            dashboard_weekly_task_status: false,
            dashboard_monthly_task_status: false,
            dashboard_personnel_performance: false,
            dashboard_weekly_personnel_performance: false,
            dashboard_monthly_personnel_performance: false,
            dashboard_survey_charts: false,
            dashboard_missed_tasks: false,
            dashboard_completed_tasks: false,
            dashboard_worst_performers: false,
            dashboard_best_performers: false,
            dashboard_task_locations: false
          });
          
          // Tüm bölümleri gizlemek için CSS filtrelerini ayarla
          setCssFilters({
            'hide-stat-cards': true,
            'hide-task-status': true,
            'hide-weekly-task-status': true,
            'hide-monthly-task-status': true,
            'hide-personnel-performance': true,
            'hide-weekly-personnel-performance': true,
            'hide-monthly-personnel-performance': true,
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
    
    if (cssFilters['hide-task-status']) {
      cssRules.push(`
        .dashboard-container .task-status-section {
          display: none !important;
        }
      `);
    }
    
    if (cssFilters['hide-weekly-task-status']) {
      cssRules.push(`
        .dashboard-container .weekly-task-status-section {
          display: none !important;
        }
      `);
    }
    
    if (cssFilters['hide-monthly-task-status']) {
      cssRules.push(`
        .dashboard-container .monthly-task-status-section {
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
    
    if (cssFilters['hide-weekly-personnel-performance']) {
      cssRules.push(`
        .dashboard-container .weekly-personnel-performance-section {
          display: none !important;
        }
      `);
    }
    
    if (cssFilters['hide-monthly-personnel-performance']) {
      cssRules.push(`
        .dashboard-container .monthly-personnel-performance-section {
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
      <Box sx={{ p: 3 }}>
        <Typography>Bu sayfaya erişim izniniz bulunmuyor.</Typography>
      </Box>
    );
  }
  
  // Dashboard bileşenine JSX
  return (
    <div className="dashboard-container" ref={dashboardRef}>
      {/* Dashboard'a branchId prop'unu ilet */}
      <Dashboard branchId={branchId} isManager={true} />
      
      {/* Dinamik CSS stillerini oluştur */}
      <style dangerouslySetInnerHTML={{ __html: generateCss() }} />
    </div>
  );
};

export default ManagerDashboard; 